import React from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import OneSignalService from '../services/OneSignalService';
import { useAuth } from '../state/auth/AuthContext';

/**
 * Bootstraps OneSignal (permission + listeners + token sync) the first time a signed-in user
 * lands on the Journal tab — including cold start when Journal is the default tab.
 */
export function JournalFcmOnFocus() {
  const { isHydrated, user } = useAuth();
  const ranForUserIdRef = React.useRef<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!isHydrated || user == null) {
        return;
      }
      if (ranForUserIdRef.current === user.id) {
        return;
      }
      ranForUserIdRef.current = user.id;
      void OneSignalService.bootstrap();
    }, [isHydrated, user]),
  );

  return <View style={{ width: 0, height: 0 }} pointerEvents="none" />;
}
