import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { JournalMoodCheckInContent } from '../../components/JournalMoodCheckIn';
import {
  FALLBACK_MOOD_OPTIONS_QUICK,
  fetchMoodOptionsByType,
  type AppMoodOption,
} from '../../lib/supabase/moodOptions';
import { saveMoodToSupabase } from '../../lib/supabase/moods';
import type { JournalStackParamList } from '../../navigation/types';
import {
  getCurrentJournalSlot,
  saveJournalMoodForSlot,
} from '../../state/journal/journalMoodCheckin';

type Nav = NativeStackNavigationProp<JournalStackParamList, 'JournalAnchor'>;

export function JournalMoodCheckInScreen() {
  const navigation = useNavigation<Nav>();
  const [moodOptions, setMoodOptions] = React.useState<AppMoodOption[] | null>(
    null,
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { options, error } = await fetchMoodOptionsByType('quick');
      if (cancelled) {
        return;
      }
      if (__DEV__ && error) {
        // eslint-disable-next-line no-console
        console.log('[journal] mood_options quick fetch failed, using fallback', error);
      }
      const next = options.length > 0 ? options : FALLBACK_MOOD_OPTIONS_QUICK;
      setMoodOptions(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAnchored = React.useCallback(
    async (moodKey: string) => {
      const slot = getCurrentJournalSlot();
      const opt = moodOptions?.find(o => o.key === moodKey);
      const displayLabel = opt?.label ?? moodKey;
      await saveJournalMoodForSlot(slot.storageKey, displayLabel);
      const sync = await saveMoodToSupabase(moodKey);
      if (sync.kind === 'saved') {
        Alert.alert('Mood saved 🎉');
      } else if (sync.kind === 'error') {
        Alert.alert('Could not sync mood', sync.message);
      }
      navigation.replace('JournalMain');
    },
    [moodOptions, navigation],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {moodOptions == null ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="rgba(58,45,42,0.45)" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <JournalMoodCheckInContent
              options={moodOptions}
              onAnchored={onAnchored}
            />
          </ScrollView>
        )}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});
