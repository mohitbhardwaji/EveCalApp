import { GEMINI_API_KEY_BUNDLED as GEMINI_API_KEY_BUNDLED_ENV } from '@env';

/**
 * Google AI (Gemini) API key — bundled for iOS and Android so release builds work
 * even when Metro does not inject `.env`. Optional override: `GEMINI_API_KEY` in `.env`.
 */
const GEMINI_API_KEY_FALLBACK = 'AIzaSyCo0i7XA04Kf9EpLYinsvNPbi6oza1ZjyM';

export const GEMINI_API_KEY_BUNDLED = (
  GEMINI_API_KEY_BUNDLED_ENV ?? GEMINI_API_KEY_FALLBACK
).trim();
