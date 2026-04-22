import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Linking } from 'react-native';
import {
  completeOAuthFromUrl,
  fetchAuthUserWithProfile,
  signOutSupabase,
  startOAuthSignIn,
} from '../../lib/supabase/auth';
import OneSignalService from '../../services/OneSignalService';
import { getSupabase } from '../../lib/supabase/client';
import { AuthContext } from './AuthContext';
import { StorageKeys } from './storageKeys';
import type { AuthState } from './types';

const initialState: AuthState = {
  isAuthed: false,
  user: null,
  userData: null,
  premiumSeen: false,
  isHydrated: false,
  authError: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(initialState);

  React.useEffect(() => {
    if (!state.isHydrated) {
      return;
    }
    OneSignalService.syncUser(state.user?.id ?? null);
  }, [state.isHydrated, state.user?.id]);

  React.useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    (async () => {
      try {
        const [authedRaw, premiumSeenRaw, authModeRaw] = await Promise.all([
          AsyncStorage.getItem(StorageKeys.authed),
          AsyncStorage.getItem(StorageKeys.premiumSeen),
          AsyncStorage.getItem(StorageKeys.authMode),
        ]);
        if (!mounted) return;

        await supabase.auth.getSession();
        await supabase.auth.refreshSession();
        const freshSession = (await supabase.auth.getSession()).data.session;
        const session = freshSession;
        const premiumSeen = premiumSeenRaw === '1';

        let isAuthed = false;
        let user: AuthState['user'] = null;
        let userData: AuthState['userData'] = null;

        if (session?.user) {
          const { user: gotUser, userData: profile } =
            await fetchAuthUserWithProfile();
          if (gotUser) {
            isAuthed = true;
            user = gotUser;
            userData = profile;
          } else {
            isAuthed = true;
            user = session.user;
            userData = null;
          }
          await AsyncStorage.setItem(StorageKeys.authed, '1');
          await AsyncStorage.setItem(StorageKeys.authMode, 'supabase');
        } else if (
          authedRaw === '1' &&
          (authModeRaw === 'guest' || authModeRaw === null)
        ) {
          isAuthed = true;
          user = null;
        }

        setState({
          isAuthed,
          user,
          userData,
          premiumSeen,
          isHydrated: true,
          authError: null,
        });
      } catch {
        if (!mounted) return;
        setState(s => ({ ...s, isHydrated: true }));
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') {
          return;
        }
        if (!mounted) return;

        if (session?.user) {
          void AsyncStorage.setItem(StorageKeys.authed, '1');
          void AsyncStorage.setItem(StorageKeys.authMode, 'supabase');
          void (async () => {
            const { user: gotUser, userData: profile } =
              await fetchAuthUserWithProfile();
            if (!mounted) {
              return;
            }
            if (gotUser) {
              setState(s => ({
                ...s,
                isAuthed: true,
                user: gotUser,
                userData: profile,
              }));
              return;
            }
            setState(s => ({
              ...s,
              isAuthed: true,
              user: session!.user!,
              userData: null,
            }));
          })();
          return;
        }

        if (event === 'SIGNED_OUT') {
          void AsyncStorage.setItem(StorageKeys.authed, '0');
          void AsyncStorage.removeItem(StorageKeys.authMode);
          setState(s => ({
            ...s,
            isAuthed: false,
            user: null,
            userData: null,
          }));
        }
      },
    );

    const handleOAuthUrl = (url: string) => {
      const looksLikeOAuthReturn =
        url.includes('auth-callback') ||
        url.includes('code=') ||
        url.includes('access_token');
      if (!looksLikeOAuthReturn) {
        return;
      }
      void (async () => {
        const result = await completeOAuthFromUrl(url);
        if (!result.ok && mounted) {
          setState(s => ({ ...s, authError: result.message }));
        }
      })();
    };

    const urlSub = Linking.addEventListener('url', ({ url }) => {
      handleOAuthUrl(url);
    });

    void Linking.getInitialURL().then(url => {
      if (url) {
        handleOAuthUrl(url);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      urlSub.remove();
    };
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    setState(s => ({ ...s, authError: null }));
    const r = await startOAuthSignIn('google');
    return r.ok ? null : r.message;
  }, []);

  const signInWithApple = React.useCallback(async () => {
    setState(s => ({ ...s, authError: null }));
    const r = await startOAuthSignIn('apple');
    return r.ok ? null : r.message;
  }, []);

  const continueAsGuest = React.useCallback(async () => {
    setState(s => ({
      ...s,
      isAuthed: true,
      user: null,
      userData: null,
      authError: null,
    }));
    await AsyncStorage.setItem(StorageKeys.authed, '1');
    await AsyncStorage.setItem(StorageKeys.authMode, 'guest');
    await AsyncStorage.setItem(StorageKeys.premiumSeen, '0');
    setState(s => ({ ...s, premiumSeen: false }));
  }, []);

  const signOut = React.useCallback(async () => {
    await signOutSupabase();
    setState(s => ({ ...s, isAuthed: false, user: null, userData: null }));
    await AsyncStorage.setItem(StorageKeys.authed, '0');
    await AsyncStorage.removeItem(StorageKeys.authMode);
  }, []);

  const markPremiumSeen = React.useCallback(async () => {
    await AsyncStorage.setItem(StorageKeys.premiumSeen, '1');
    setState(s => ({ ...s, premiumSeen: true }));
  }, []);

  const clearAuthError = React.useCallback(() => {
    setState(s => ({ ...s, authError: null }));
  }, []);

  const value = React.useMemo(
    () => ({
      ...state,
      signInWithGoogle,
      signInWithApple,
      continueAsGuest,
      signOut,
      markPremiumSeen,
      clearAuthError,
    }),
    [
      clearAuthError,
      continueAsGuest,
      markPremiumSeen,
      signInWithApple,
      signInWithGoogle,
      signOut,
      state,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
