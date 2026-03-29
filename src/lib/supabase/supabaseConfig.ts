/**
 * Supabase project URL and anon key (safe for client apps with RLS enabled).
 * Replace with your own values if needed; see `supabaseConfig.example.ts`.
 */
export const SUPABASE_URL = 'https://mdivtqijvisqzcqkjtqh.supabase.co';

export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaXZ0cWlqdmlzcXpjcWtqdHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk0MTAsImV4cCI6MjA4ODczNTQxMH0.r4tkqf0Mn5PVZkZo62smcdqLveAOiZy9hwGcBdgtPmQ';

/**
 * OAuth redirect after Google/Apple (must match Supabase → Auth → URL Configuration → Redirect URLs).
 * This is a custom deep link that your native app will handle to exchange the OAuth `code` for a session.
 */
export const SUPABASE_OAUTH_REDIRECT_URL = 'evecal://auth-callback';
