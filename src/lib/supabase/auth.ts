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
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[supabase] fetchAuthUserWithProfile auth.getUser() data', getUserRes.data);
    // eslint-disable-next-line no-console
    console.log('[supabase] fetchAuthUserWithProfile auth.getUser() error', getUserRes.error ?? null);
  }
  const user = getUserRes.data.user;
  if (!user) {
    return { user: null, userData: null };
  }
  const usersRes = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[supabase] fetchAuthUserWithProfile users data', usersRes.data);
    // eslint-disable-next-line no-console
    console.log('[supabase] fetchAuthUserWithProfile users error', usersRes.error ?? null);
  }
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
  if (__DEV__) {
    // Avoid logging tokens; this is just flow diagnostics.
    // eslint-disable-next-line no-console
    console.log('[supabase] startOAuthSignIn', {
      provider,
      redirectTo: SUPABASE_OAUTH_REDIRECT_URL,
    });
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: SUPABASE_OAUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[supabase] signInWithOAuth error', error.message);
    }
    return { ok: false as const, message: error.message };
  }
  if (!data.url) {
    return { ok: false as const, message: 'No OAuth URL returned' };
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[supabase] OAuth URL', data.url);
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
      error,
    } = await supabase.auth.getUser();
    if (__DEV__) {
      if (error) {
        // eslint-disable-next-line no-console
        console.log('[supabase] getUser error', error.message);
      } else {
        // eslint-disable-next-line no-console
        console.log('[supabase] getUser', user);
      }
    }
  };

  try {
    const parsed = new URL(url);
    if (__DEV__) {
      // Strip sensitive pieces before logging.
      const safe = `${parsed.origin}${parsed.pathname}${
        parsed.searchParams.get('code') ? '?code=***' : parsed.search
      }${parsed.hash ? '#***' : ''}`;
      // eslint-disable-next-line no-console
      console.log('[supabase] completeOAuthFromUrl', safe);
    }
    // Supabase PKCE typically returns `?code=...`, but depending on provider/flow it can also show up in the hash.
    const codeFromQuery = parsed.searchParams.get('code');
    const hash = parsed.hash.replace(/^#/, '');
    const paramsFromHash = hash ? new URLSearchParams(hash) : null;
    const codeFromHash = paramsFromHash?.get('code');
    const code = codeFromQuery ?? codeFromHash;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[supabase] exchangeCodeForSession error', error.message);
        }
        return { ok: false as const, message: error.message };
      }
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[supabase] exchangeCodeForSession ok', {
          hasSession: Boolean(data.session),
          userId: data.user?.id ?? null,
          email: data.user?.email ?? null,
          provider: data.user?.app_metadata?.provider ?? null,
          expiresAt: data.session?.expires_at ?? null,
        });
      }
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
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[supabase] setSession error', error.message);
          }
          return { ok: false as const, message: error.message };
        }
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[supabase] setSession ok', {
            hasSession: Boolean(data.session),
            userId: data.user?.id ?? null,
            email: data.user?.email ?? null,
            provider: data.user?.app_metadata?.provider ?? null,
            expiresAt: data.session?.expires_at ?? null,
          });
        }
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
