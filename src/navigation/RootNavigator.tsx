import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainWithPremiumGate } from './MainWithPremiumGate';
import { PremiumModalScreen } from '../screens/modals/PremiumModalScreen';
import { SettingsStackNavigator } from './SettingsStackNavigator';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { useAuth } from '../state/auth/AuthContext';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthed, isHydrated } = useAuth();

  // Don't flash stacks while loading persisted state.
  if (!isHydrated) {
    return null;
  }

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthed ? (
        <Root.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Root.Screen name="Main" component={MainWithPremiumGate} />
          <Root.Screen
            name="Settings"
            component={SettingsStackNavigator}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Root.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Root.Screen
            name="Premium"
            component={PremiumModalScreen}
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
            }}
            initialParams={undefined}
          />
        </>
      )}
    </Root.Navigator>
  );
}

export function useShouldShowPremiumModal() {
  const { isAuthed, premiumSeen } = useAuth();
  return isAuthed && !premiumSeen;
}

