import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { JournalMoodCheckInContent } from '../../components/JournalMoodCheckIn';
import { WarmAlertDialog } from '../../components/WarmAlertDialog';
import type { AppMoodOption } from '../../lib/supabase/moodOptions';
import {
  FALLBACK_TAG_OPTIONS,
  fetchActiveTagOptions,
  mapTagOptionsToAnchorMoodOptions,
} from '../../lib/supabase/tagOptions';
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
  const [notice, setNotice] = React.useState<{
    title: string;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { options: tags, error } = await fetchActiveTagOptions();
      if (cancelled) {
        return;
      }
      if (__DEV__ && error) {
        // eslint-disable-next-line no-console
        console.log('[journal] tag_options fetch failed, using fallback', error);
      }
      const source = tags.length > 0 ? tags : FALLBACK_TAG_OPTIONS;
      const next = mapTagOptionsToAnchorMoodOptions(source);
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
      if (sync.kind === 'error') {
        setNotice({
          title: 'Could not sync mood',
          message: sync.message,
        });
        return;
      }
      navigation.replace('JournalMain');
    },
    [moodOptions, navigation],
  );

  const dismissNotice = React.useCallback(() => {
    setNotice(null);
    navigation.replace('JournalMain');
  }, [navigation]);

  return (
    <View style={styles.root}>
      <WarmAlertDialog
        visible={notice != null}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        onDismiss={dismissNotice}
      />
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
