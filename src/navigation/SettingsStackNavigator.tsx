import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './types';
import { SettingsHomeScreen } from '../screens/settings/SettingsHomeScreen';
import { PaymentsSettingsScreen } from '../screens/settings/PaymentsSettingsScreen';
import { PrivacySecurityScreen } from '../screens/settings/PrivacySecurityScreen';
import { HelpFeedbackScreen } from '../screens/settings/HelpFeedbackScreen';
import { TermsPrivacyScreen } from '../screens/settings/TermsPrivacyScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="SettingsMain" component={SettingsHomeScreen} />
      <Stack.Screen name="Payments" component={PaymentsSettingsScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="HelpFeedback" component={HelpFeedbackScreen} />
      <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
    </Stack.Navigator>
  );
}
