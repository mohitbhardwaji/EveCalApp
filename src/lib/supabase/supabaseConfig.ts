import {
  SUPABASE_ANON_KEY as SUPABASE_ANON_KEY_ENV,
  SUPABASE_OAUTH_REDIRECT_URL as SUPABASE_OAUTH_REDIRECT_URL_ENV,
  SUPABASE_URL as SUPABASE_URL_ENV,
} from '@env';

/**
 * Supabase project URL and anon key (safe for client apps with RLS enabled).
 * Replace with your own values if needed; see `supabaseConfig.example.ts`.
 */
const SUPABASE_URL_FALLBACK = 'https://mdivtqijvisqzcqkjtqh.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaXZ0cWlqdmlzcXpjcWtqdHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk0MTAsImV4cCI6MjA4ODczNTQxMH0.r4tkqf0Mn5PVZkZo62smcdqLveAOiZy9hwGcBdgtPmQ';
const SUPABASE_OAUTH_REDIRECT_URL_FALLBACK = 'evecal://auth-callback';

export const SUPABASE_URL = (
  SUPABASE_URL_ENV ?? SUPABASE_URL_FALLBACK
).trim();

export const SUPABASE_ANON_KEY = (
  SUPABASE_ANON_KEY_ENV ?? SUPABASE_ANON_KEY_FALLBACK
).trim();

/**
 * OAuth redirect after Google/Apple (must match Supabase → Auth → URL Configuration → Redirect URLs).
 * This is a custom deep link that your native app will handle to exchange the OAuth `code` for a session.
 */
export const SUPABASE_OAUTH_REDIRECT_URL = (
  SUPABASE_OAUTH_REDIRECT_URL_ENV ?? SUPABASE_OAUTH_REDIRECT_URL_FALLBACK
).trim();
