import { GEMINI_API_KEY } from '@env';
import { GEMINI_API_KEY_BUNDLED } from '../../config/geminiKey';

const MODEL = 'gemini-2.5-flash';

function resolveGeminiApiKey(): string {
  const envKey = (GEMINI_API_KEY ?? '').trim();
  const bundledKey = (GEMINI_API_KEY_BUNDLED ?? '').trim();
  if (envKey.startsWith('AIza')) {
    return envKey;
  }
  if (bundledKey.startsWith('AIza')) {
    return bundledKey;
  }
  return '';
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const t = raw.trim();
  const unfenced = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(unfenced.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type ExtractTasksResult =
  | { ok: true; phrases: string[] }
  | { ok: false; message: string };

/**
 * Splits a verbatim transcript into 0..n distinct actionable task phrases.
 * Each phrase is passed to task creation separately (no merging on the client).
 */
export async function extractTasksFromTranscript(
  transcript: string,
): Promise<ExtractTasksResult> {
  const text = transcript.trim();
  if (!text) {
    return { ok: true, phrases: [] };
  }

  const key = resolveGeminiApiKey();
  if (!key) {
    return { ok: false, message: 'Voice task extraction is not configured.' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const instruction = `You extract distinct actionable tasks from a voice transcript.

Rules:
- Output ONLY valid JSON, no markdown, no extra text.
- Shape: {"tasks":["...","..."]}
- Each string in "tasks" must be ONE self-contained actionable item (reminder, to-do, call, email, buy, schedule, follow-up, etc.).
- If the transcript contains multiple separate actions (e.g. "call X tomorrow" AND "send Y to Z"), use multiple strings. Do NOT merge them into one.
- Phrases should be faithful to what the speaker said (short, natural; you may trim filler like "um" but do not summarize away meaning).
- If there is no clear actionable task (pure journaling, greeting, vague chat), return {"tasks":[]}.
- Do not add timestamps. Do not interpret beyond splitting distinct actions.

Transcript:
---
${text}
---`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: instruction }] }],
      }),
    });
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (json.error?.message) {
      return { ok: false, message: json.error.message };
    }
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.map(p => p.text ?? '').join('').trim();
    const obj = parseJsonObject(raw);
    if (!obj) {
      return { ok: false, message: 'Could not parse task list.' };
    }
    const tasksRaw = obj.tasks;
    if (!Array.isArray(tasksRaw)) {
      return { ok: false, message: 'Invalid task list shape.' };
    }
    const phrases: string[] = [];
    for (const item of tasksRaw) {
      if (typeof item === 'string') {
        const p = item.trim();
        if (p.length > 0) {
          phrases.push(p);
        }
      }
    }
    return { ok: true, phrases };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}
