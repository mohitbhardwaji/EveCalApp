import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JournalStackParamList } from '../../navigation/types';
import { EveCalTheme } from '../../theme/theme';
import { Surface } from '../../components/Surface';
import { GradientButton } from '../../components/GradientButton';
import { TopHeader } from '../../components/TopHeader';
import Feather from 'react-native-vector-icons/Feather';
import {
  getCurrentJournalSlot,
  getJournalMoodForSlot,
  isJournalSlotComplete,
  periodLabelFromStorageKey,
} from '../../state/journal/journalMoodCheckin';
import { fetchUserJournalEntries } from '../../lib/supabase/journalEntriesApi';
import { useAuth } from '../../state/auth/AuthContext';
import {
  formatJournalEntryDayLabel,
  getJournalEntries,
  journalTimeDisplayLabel,
  journalTimeIconName,
  type JournalEntry,
} from '../../state/journal/journalEntries';

function ReflectionRow({
  dayLabel,
  timeOfDay,
  rightPill,
  rightPillTint,
  iconName,
  iconTint,
  text,
  tags,
}: {
  dayLabel: string;
  timeOfDay: string;
  rightPill: string;
  rightPillTint: string;
  iconName: string;
  iconTint: string;
  text: string;
  tags: string[];
}) {
  return (
    <Surface style={styles.reflection}>
      <View style={styles.rowTop}>
        <View style={[styles.moodDot, { backgroundColor: iconTint }]}>
          <Feather name={iconName} size={18} color="rgba(142,119,110,0.80)" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.when}>{dayLabel}</Text>
          <Text style={styles.mood}>{timeOfDay}</Text>
        </View>
        <View style={[styles.moodPill, { backgroundColor: rightPillTint }]}>
          <Text style={styles.moodPillText}>{rightPill}</Text>
        </View>
      </View>
      <Text style={styles.reflectionText}>“{text}”</Text>
      {tags.length > 0 ? (
        <View style={styles.pillsRow}>
          {tags.map(t => (
            <View key={t} style={styles.pill}>
              <Text style={styles.pillText}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Surface>
  );
}

export function JournalScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<JournalStackParamList, 'JournalMain'>>();
  const { user } = useAuth();
  const [slotKey, setSlotKey] = React.useState<string | null>(null);
  const [slotComplete, setSlotComplete] = React.useState(false);
  const [showContent, setShowContent] = React.useState(false);
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const slot = getCurrentJournalSlot();
        const done = await isJournalSlotComplete(slot.storageKey);
        let list: JournalEntry[];
        if (user) {
          if (active) {
            setEntriesLoading(true);
          }
          try {
            const { entries: remote, error } = await fetchUserJournalEntries();
            if (!active) {
              return;
            }
            list = error ? await getJournalEntries() : remote;
          } finally {
            if (active) {
              setEntriesLoading(false);
            }
          }
        } else {
          if (active) {
            setEntriesLoading(false);
          }
          list = await getJournalEntries();
        }
        if (!active) return;
        setEntries(list);
        setSlotKey(slot.storageKey);
        setSlotComplete(done);
        if (!done) {
          navigation.replace('JournalAnchor');
          return;
        }
        setShowContent(true);
      })();
      return () => {
        active = false;
      };
    }, [navigation, user]),
  );

  if (!showContent) {
    return (
      <View style={styles.root}>
        <TopHeader />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {slotComplete && slotKey ? (
          <AnchoredSummary slotKey={slotKey} />
        ) : null}

        <Surface style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>YOUR INNER SPACE</Text>
              <Text style={styles.heroTitle}>Sacred Moments</Text>
            </View>
            <View style={styles.heroSparkle}>
              <Feather
                name="star"
                size={18}
                color="rgba(58,45,42,0.45)"
              />
            </View>
          </View>
          <Text style={styles.heroSub}>
            Reflect, breathe, and honor your journey
          </Text>
          <Text style={styles.heroQuestion}>How are you feeling?</Text>
          <View style={styles.feelsRow}>
            <View style={styles.feelPill}>
              <Text style={styles.feelIcon}>🍃</Text>
              <Text style={styles.feel}>Calm</Text>
            </View>
            <View style={styles.feelPill}>
              <Text style={styles.feelIcon}>💛</Text>
              <Text style={styles.feel}>Grateful</Text>
            </View>
            <View style={styles.feelPill}>
              <Text style={styles.feelIcon}>🌙</Text>
              <Text style={styles.feel}>Reflective</Text>
            </View>
            <View style={styles.feelPill}>
              <Text style={styles.feelIcon}>✨</Text>
              <Text style={styles.feel}>Joyful</Text>
            </View>
          </View>
        </Surface>

        <GradientButton
          title="Create New Entry"
          iconName="book-open"
          onPress={() => navigation.navigate('JournalNewEntry')}
        />

        <Text style={styles.sectionRecent}>RECENT REFLECTIONS</Text>
        {entriesLoading ? (
          <View style={styles.entriesLoaderWrap}>
            <ActivityIndicator color="rgba(58,45,42,0.38)" />
          </View>
        ) : entries.length === 0 ? (
          <Text style={styles.entriesEmpty}>
            {user
              ? 'Your saved reflections from the cloud will appear here. Use the button above to write one.'
              : 'Saved reflections will show up here after you create an entry.'}
          </Text>
        ) : (
          entries.map((e, index) => (
            <ReflectionRow
              key={e.id}
              dayLabel={formatJournalEntryDayLabel(e.createdAt)}
              timeOfDay={journalTimeDisplayLabel(e.timeOfDay)}
              rightPill={e.mood}
              rightPillTint={moodPillTint(e.mood, index)}
              iconName={journalTimeIconName(e.timeOfDay)}
              iconTint={timeIconTint(e.timeOfDay)}
              text={e.reflection}
              tags={e.tags}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function AnchoredSummary({ slotKey }: { slotKey: string }) {
  const [mood, setMood] = React.useState<string | null>(null);
  const periodLabel = periodLabelFromStorageKey(slotKey);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await getJournalMoodForSlot(slotKey);
      if (!cancelled) setMood(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [slotKey]);

  if (!mood) {
    return null;
  }

  return (
    <Surface style={styles.anchoredSummary}>
      <Text style={styles.anchoredSummaryText}>
        <Text style={styles.anchoredSummaryBold}>{periodLabel}</Text>
        {' · '}
        Anchored as <Text style={styles.anchoredSummaryBold}>{mood}</Text>
      </Text>
    </Surface>
  );
}

const MOOD_TINTS = [
  'rgba(245,235,230,0.95)',
  'rgba(229,238,250,0.95)',
  'rgba(220,236,228,0.95)',
  'rgba(238,230,245,0.95)',
];

function moodPillTint(mood: string, index: number): string {
  let h = 0;
  for (let i = 0; i < mood.length; i += 1) {
    h = (h + mood.charCodeAt(i) * (i + 1)) % MOOD_TINTS.length;
  }
  return MOOD_TINTS[(h + index) % MOOD_TINTS.length];
}

function timeIconTint(t: JournalEntry['timeOfDay']): string {
  switch (t) {
    case 'morning':
      return 'rgba(245,235,230,0.75)';
    case 'afternoon':
      return 'rgba(255, 248, 220, 0.85)';
    case 'evening':
      return 'rgba(229,238,250,0.75)';
    case 'night':
      return 'rgba(238, 220, 232, 0.8)';
    default:
      return 'rgba(245,235,230,0.75)';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EveCalTheme.colors.bg },
  content: { padding: 18, paddingTop: 8, paddingBottom: 28, gap: 14 },
  anchoredSummary: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(247,246,242,0.95)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.06)',
  },
  anchoredSummaryText: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(58,45,42,0.55)',
    lineHeight: 18,
  },
  anchoredSummaryBold: {
    color: 'rgba(58,45,42,0.78)',
    fontWeight: '600',
  },
  hero: {
    padding: 18,
    backgroundColor: EveCalTheme.colors.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroSparkle: {
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: EveCalTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: {
    color: 'rgba(58,45,42,0.32)',
    letterSpacing: 2.2,
    fontSize: 11,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 34,
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
    marginBottom: 4,
  },
  heroSub: {
    color: EveCalTheme.colors.textMuted,
    marginBottom: 12,
  },
  heroQuestion: {
    color: 'rgba(58,45,42,0.55)',
    marginBottom: 10,
  },
  feelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  feelPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(58,45,42,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feelIcon: {
    fontSize: 16,
  },
  feel: {
    color: EveCalTheme.colors.textMuted,
    fontSize: 16,
  },
  sectionRecent: {
    color: 'rgba(58,45,42,0.32)',
    letterSpacing: 2.2,
    fontSize: 11,
    marginTop: 6,
  },
  entriesLoaderWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entriesEmpty: {
    color: EveCalTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 8,
  },
  reflection: {
    padding: 16,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  moodDot: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(58,45,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  when: { color: 'rgba(58,45,42,0.40)', fontSize: 12, fontWeight: '300' },
  mood: { color: EveCalTheme.colors.text, fontWeight: '200' },
  moodPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(168,201,190,0.55)',
  },
  moodPillText: {
    color: 'rgba(58,45,42,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  reflectionText: {
    color: EveCalTheme.colors.textMuted,
    fontFamily: EveCalTheme.typography.serif,
    fontSize: 15,
    lineHeight: 34,
    fontStyle: 'italic',
  },
  pillsRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(58,45,42,0.06)',
  },
  pillText: { color: EveCalTheme.colors.textMuted, fontSize: 12 },
});
