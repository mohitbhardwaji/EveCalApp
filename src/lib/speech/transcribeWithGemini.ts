import { Platform } from 'react-native';
import { GEMINI_API_KEY } from '@env';

export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

const MODEL = 'gemini-2.0-flash';

/** AAC/M4A from `react-native-audio-recorder-player` */
function recordingMimeType(): string {
  return Platform.OS === 'ios' ? 'audio/mp4' : 'audio/mp4';
}

async function fileUriToBase64(uri: string): Promise<string> {
  const resolved =
    uri.startsWith('file://') || uri.startsWith('content://')
      ? uri
      : `file://${uri}`;
  const res = await fetch(resolved);
  if (!res.ok) {
    throw new Error(`Could not read audio file (${res.status})`);
  }
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  const g = globalThis as typeof globalThis & { btoa(b: string): string };
  return g.btoa(binary);
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
  promptFeedback?: { blockReason?: string };
};

/**
 * Multilingual transcription via Gemini (inline audio). Key from `.env` → `GEMINI_API_KEY`.
 */
export async function transcribeAudioWithGemini(
  filePath: string,
): Promise<TranscribeResult> {
  const key = (GEMINI_API_KEY ?? '').trim();
  if (!key) {
    return {
      ok: false,
      message:
        'Speech-to-text needs GEMINI_API_KEY in a root `.env` file (see `.env.example`). Restart Metro after changing `.env`. You can still type your note manually.',
    };
  }

  let base64: string;
  try {
    base64 = await fileUriToBase64(filePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      message: `Could not read the recording: ${msg}`,
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: recordingMimeType(),
              data: base64,
            },
          },
          {
            text: 'Transcribe all spoken words accurately. Preserve the original language (any language). Reply with only the transcript text — no labels, quotes, or commentary.',
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as GeminiGenerateResponse;

    if (json.error?.message) {
      return { ok: false, message: json.error.message };
    }

    if (json.promptFeedback?.blockReason) {
      return {
        ok: false,
        message: `Request blocked (${json.promptFeedback.blockReason}).`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        message: `Transcription failed (${res.status})`,
      };
    }

    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map(p => (typeof p.text === 'string' ? p.text : ''))
      .join('')
      .trim();

    if (!text) {
      return {
        ok: false,
        message: 'No speech detected. Try again or type your note below.',
      };
    }

    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      message: `Could not reach Gemini: ${msg}`,
    };
  }
}
