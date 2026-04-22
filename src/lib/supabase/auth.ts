import type { User } from '@supabase/supabase-js';
import { Linking } from 'react-native';
import type { UserData } from '../../state/auth/types';
import { getSupabase } from './client';
import { SUPABASE_OAUTH_REDIRECT_URL } from './supabaseConfig';

export async function sendPhoneOtp(phone: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const, message: 'OTP sent' };
}

export async function verifyPhoneOtp(phone: string, otp: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: 'sms',
  });
  if (error) {
    return { ok: false as const, message: error.message, session: null, user: null };
  }
  return {
    ok: true as const,
    message: null,
    session: data.session,
    user: data.user,
  };
}

export async function getAuthUser(): Promise<User | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

/**
 * Canonical post-login sequence: `auth.getUser()` then `users` row by id.
 */
export async function fetchAuthUserWithProfile(): Promise<{
  user: User | null;
  userData: UserData | null;
}> {
  const supabase = getSupabase();
  const getUserRes = await supabase.auth.getUser();
  const user = getUserRes.data.user;
  if (!user) {
    return { user: null, userData: null };
  }
  const usersRes = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  return {
    user,
    userData: (usersRes.data as UserData | null) ?? null,
  };
}

export async function signOutSupabase() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}

type OAuthProvider = 'google' | 'apple';

export async function startOAuthSignIn(provider: OAuthProvider) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: SUPABASE_OAUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    return { ok: false as const, message: error.message };
  }
  if (!data.url) {
    return { ok: false as const, message: 'No OAuth URL returned' };
  }
  // Android package-visibility rules can make `canOpenURL()` return false even
  // though opening works. Always try `openURL`, and only fail if that throws.
  try {
    await Linking.openURL(data.url);
    return { ok: true as const, message: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, message: `Cannot open browser for sign-in: ${msg}` };
  }
}

/**
 * Call when the app opens with the OAuth callback URL (e.g. `evecal://auth-callback?code=...`).
 */
export async function completeOAuthFromUrl(url: string) {
  const supabase = getSupabase();
  const logCurrentUser = async () => {
    const {
      data: { user },
      error: _error,
    } = await supabase.auth.getUser();
    void user;
    void _error;
  };

  try {
    const parsed = new URL(url);
    // Supabase PKCE typically returns `?code=...`, but depending on provider/flow it can also show up in the hash.
    const codeFromQuery = parsed.searchParams.get('code');
    const hash = parsed.hash.replace(/^#/, '');
    const paramsFromHash = hash ? new URLSearchParams(hash) : null;
    const codeFromHash = paramsFromHash?.get('code');
    const code = codeFromQuery ?? codeFromHash;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return { ok: false as const, message: error.message };
      }
      void data;
      await logCurrentUser();
      return { ok: true as const, message: null };
    }

    if (hash) {
      const access_token = paramsFromHash?.get('access_token');
      const refresh_token = paramsFromHash?.get('refresh_token');
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          return { ok: false as const, message: error.message };
        }
        void data;
        await logCurrentUser();
        return { ok: true as const, message: null };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, message: msg };
  }
  return { ok: false as const, message: 'No auth code or tokens in URL' };
}
