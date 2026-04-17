import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { GEMINI_API_KEY } from '@env';
import { GEMINI_API_KEY_BUNDLED } from '../../config/geminiKey';

export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

const MODEL = 'gemini-2.5-flash';
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

function resolveGeminiApiKey(): string {
  const envKey = (GEMINI_API_KEY ?? '').trim();
  const bundledKey = (GEMINI_API_KEY_BUNDLED ?? '').trim();

  // Valid Google API keys start with AIza. Prefer .env in dev; Android release often
  // has no bundled .env — same bundled key as iOS via `geminiKey.ts`.
  if (envKey.startsWith('AIza')) {
    return envKey;
  }
  if (bundledKey.startsWith('AIza')) {
    return bundledKey;
  }
  return '';
}

async function generateTextWithGemini(
  key: string,
  parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  >,
): Promise<GeminiGenerateResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as GeminiGenerateResponse;
  if (json.error?.message) {
    throw new Error(json.error.message);
  }
  if (json.promptFeedback?.blockReason) {
    throw new Error(`Request blocked (${json.promptFeedback.blockReason}).`);
  }
  if (!res.ok) {
    throw new Error(`Speech service request failed (${res.status})`);
  }
  return json;
}

function extractTextFromGeminiResponse(json: GeminiGenerateResponse): string {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map(p => (typeof p.text === 'string' ? p.text : ''))
    .join('')
    .trim();
}

async function transliterateToLatin(
  key: string,
  text: string,
): Promise<string> {
  const json = await generateTextWithGemini(key, [
    {
      text: `Convert the following text into natural Romanized English letters only. Do not translate the meaning. Do not use Devanagari or any non-Latin script. Return only the converted text.\n\n${text}`,
    },
  ]);

  const transliterated = extractTextFromGeminiResponse(json);
  return transliterated || text;
}

/** AAC/M4A from `react-native-audio-recorder-player` */
function recordingMimeType(): string {
  return Platform.OS === 'ios' ? 'audio/mp4' : 'audio/mp4';
}

/**
 * Path usable by `react-native-fs` (and avoids `fetch(file://)` — unsupported on Android RN).
 * `react-native-audio-recorder-player` Android resolves to `file:////absolute/path` (extra slashes).
 */
function pathForLocalAudioRead(uri: string): string {
  const u = uri.trim();
  if (u.startsWith('content://')) {
    return u;
  }
  return u.replace(/^file:(\/)+/, '/');
}

async function fileUriToBase64(uri: string): Promise<string> {
  const path = pathForLocalAudioRead(uri);
  return RNFS.readFile(path, 'base64');
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
  promptFeedback?: { blockReason?: string };
};

const CAPTURE_SEGMENT_INSTRUCTION = `You are a real-time speech transcription engine. This audio is ONE segment only (speech up to a natural pause).

Rules:
- Output a verbatim transcript only. Do not summarize, interpret, rephrase, or add commentary.
- Preserve natural sentence structure and punctuation where clear from speech.
- Do not merge with any prior context; treat this clip as a standalone utterance.
- No timestamps, labels, quotes, or meta text—only the transcribed words.
- If the clip contains only silence or unintelligible noise, respond with an empty string (no words).
- Otherwise transcribe continuously: include filler (um, uh) when they sound like part of natural speech; omit them only when they are clearly isolated low-confidence noise and there is no other speech.

Reply with ONLY the transcript text, or nothing if there is no speech.`;

/**
 * Multilingual transcription via Gemini (inline audio). Key: `GEMINI_API_KEY` in `.env`
 * if set, else `GEMINI_API_KEY_BUNDLED` in `src/config/geminiKey.ts` (iOS + Android).
 */
export async function transcribeAudioWithGemini(
  filePath: string,
): Promise<TranscribeResult> {
  const key = resolveGeminiApiKey();
  if (!key) {
    return {
      ok: false,
      message:
        'Speech-to-text is not configured yet. Restart the app after updating your local setup, or type your note manually.',
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

  try {
    const json = await generateTextWithGemini(key, [
      {
        inlineData: {
          mimeType: recordingMimeType(),
          data: base64,
        },
      },
      {
        text: 'Transcribe all spoken words accurately. Understand Hindi, Hinglish, and English audio. Always return the transcript in English text using the Latin alphabet. If the speaker talks in Hindi, transliterate it into natural English letters instead of Devanagari script. Return ASCII letters only when possible. Reply with only the transcript text and no labels, quotes, or commentary.',
      },
    ]);

    let text = extractTextFromGeminiResponse(json);

    if (!text) {
      return {
        ok: false,
        message: 'No speech detected. Try again or type your note below.',
      };
    }

    if (DEVANAGARI_REGEX.test(text)) {
      text = await transliterateToLatin(key, text);
    }

    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      message: `Could not process speech right now: ${msg}`,
    };
  }
}

/**
 * Verbatim segmented capture: one clip per pause-bound segment, no post-processing
 * beyond what the model returns. Empty string means no speech (caller should drop segment).
 */
export async function transcribeCaptureSegmentWithGemini(
  filePath: string,
): Promise<TranscribeResult> {
  const key = resolveGeminiApiKey();
  if (!key) {
    return {
      ok: false,
      message:
        'Speech-to-text is not configured yet. Restart the app after updating your local setup, or type your note manually.',
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

  try {
    const json = await generateTextWithGemini(key, [
      {
        inlineData: {
          mimeType: recordingMimeType(),
          data: base64,
        },
      },
      {
        text: CAPTURE_SEGMENT_INSTRUCTION,
      },
    ]);

    const text = extractTextFromGeminiResponse(json);
    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      message: `Could not process speech right now: ${msg}`,
    };
  }
}
