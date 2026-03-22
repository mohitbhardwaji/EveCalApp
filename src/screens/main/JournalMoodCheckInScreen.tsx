import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JournalStackParamList } from '../../navigation/types';
import { JournalMoodCheckInContent } from '../../components/JournalMoodCheckIn';
import {
  getCurrentJournalSlot,
  saveJournalMoodForSlot,
} from '../../state/journal/journalMoodCheckin';

type Nav = NativeStackNavigationProp<JournalStackParamList, 'JournalAnchor'>;

export function JournalMoodCheckInScreen() {
  const navigation = useNavigation<Nav>();

  const onAnchored = React.useCallback(
    async (mood: string) => {
      const slot = getCurrentJournalSlot();
      await saveJournalMoodForSlot(slot.storageKey, mood);
      navigation.replace('JournalMain');
    },
    [navigation],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <JournalMoodCheckInContent onAnchored={onAnchored} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'center',
  },
});
