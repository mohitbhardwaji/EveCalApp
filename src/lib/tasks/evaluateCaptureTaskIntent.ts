import { GEMINI_API_KEY } from '@env';
import { GEMINI_API_KEY_BUNDLED } from '../../config/geminiKey';
import type { CaptureTaskPayload } from './classifyTask';

const MODEL = 'gemini-2.5-flash';

export type EvaluateCaptureTaskResult =
  | { isTask: true; payload: CaptureTaskPayload }
  | { isTask: false };

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

/**
 * Decides if a verbatim transcript should create a task. Runs on-device via Gemini;
 * does not block capture — call from async pipeline only.
 */
export async function evaluateCaptureTaskIntent(
  transcript: string,
): Promise<EvaluateCaptureTaskResult> {
  const text = transcript.trim();
  if (!text) {
    return { isTask: false };
  }

  const key = resolveGeminiApiKey();
  if (!key) {
    return { isTask: false };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const instruction = `You classify voice notes. Read the transcript and decide if the speaker clearly wants an ACTIONABLE task created: reminder, to-do, follow-up, something to do later, buy/call/email/schedule, etc.

If YES: respond with ONLY this JSON object (no markdown, no extra text):
{"isTask":true,"title":"<short task title, max 80 characters>"}

If NO (greeting, small talk, journaling without a clear action, unclear rambling): respond with ONLY:
{"isTask":false}

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
      return { isTask: false };
    }
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.map(p => p.text ?? '').join('').trim();
    const obj = parseJsonObject(raw);
    if (!obj || typeof obj.isTask !== 'boolean') {
      return { isTask: false };
    }
    if (!obj.isTask) {
      return { isTask: false };
    }
    const title =
      typeof obj.title === 'string' ? obj.title.trim().slice(0, 200) : '';
    if (!title) {
      return { isTask: false };
    }
    const createdAt = new Date().toISOString();
    return {
      isTask: true,
      payload: {
        title,
        description: text,
        createdAt,
      },
    };
  } catch {
    return { isTask: false };
  }
}
