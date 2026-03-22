import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { AuthContext } from './AuthContext';
import { StorageKeys } from './storageKeys';
import type { AuthState } from './types';

const initialState: AuthState = {
  isAuthed: false,
  premiumSeen: false,
  isHydrated: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(initialState);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [authedRaw, premiumSeenRaw] = await Promise.all([
          AsyncStorage.getItem(StorageKeys.authed),
          AsyncStorage.getItem(StorageKeys.premiumSeen),
        ]);
        if (!isMounted) return;
        setState({
          isAuthed: authedRaw === '1',
          premiumSeen: premiumSeenRaw === '1',
          isHydrated: true,
        });
      } catch {
        if (!isMounted) return;
        setState(s => ({ ...s, isHydrated: true }));
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = React.useCallback(async () => {
    setState(s => ({ ...s, isAuthed: true }));
    await AsyncStorage.setItem(StorageKeys.authed, '1');
    // First sign-in should show Premium popup.
    await AsyncStorage.setItem(StorageKeys.premiumSeen, '0');
    setState(s => ({ ...s, premiumSeen: false }));
  }, []);

  const signOut = React.useCallback(async () => {
    setState(s => ({ ...s, isAuthed: false }));
    await AsyncStorage.setItem(StorageKeys.authed, '0');
  }, []);

  const markPremiumSeen = React.useCallback(async () => {
    await AsyncStorage.setItem(StorageKeys.premiumSeen, '1');
    setState(s => ({ ...s, premiumSeen: true }));
  }, []);

  const value = React.useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      markPremiumSeen,
    }),
    [markPremiumSeen, signIn, signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

