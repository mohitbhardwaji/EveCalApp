import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import type { JournalStackParamList } from './types';
import { JournalScreen } from '../screens/main/JournalScreen';
import { JournalMoodCheckInScreen } from '../screens/main/JournalMoodCheckInScreen';
import { JournalNewEntryScreen } from '../screens/main/JournalNewEntryScreen';
import { EveCalTheme } from '../theme/theme';
import {
  getCurrentJournalSlot,
  isJournalSlotComplete,
} from '../state/journal/journalMoodCheckin';

const Stack = createNativeStackNavigator<JournalStackParamList>();

function JournalBootstrap() {
  const navigation =
    useNavigation<NativeStackNavigationProp<JournalStackParamList>>();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const slot = getCurrentJournalSlot();
      const done = await isJournalSlotComplete(slot.storageKey);
      if (cancelled) return;
      navigation.replace(done ? 'JournalMain' : 'JournalAnchor');
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={styles.bootstrap}>
      <ActivityIndicator color={EveCalTheme.colors.textMuted} />
    </View>
  );
}

export function JournalStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="JournalBootstrap"
      screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="JournalBootstrap" component={JournalBootstrap} />
      <Stack.Screen name="JournalMain" component={JournalScreen} />
      <Stack.Screen
        name="JournalNewEntry"
        component={JournalNewEntryScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="JournalAnchor"
        component={JournalMoodCheckInScreen}
        options={{
          animation: 'slide_from_bottom',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  bootstrap: {
    flex: 1,
    backgroundColor: EveCalTheme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
