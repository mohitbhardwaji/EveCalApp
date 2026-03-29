import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { AppMoodOption } from '../lib/supabase/moodOptions';
import { EveCalTheme } from '../theme/theme';
import { formatJournalCheckinTimestamp } from '../state/journal/journalMoodCheckin';

type Props = {
  options: AppMoodOption[];
  /** Receives `key` for the chosen mood (stored locally + synced). */
  onAnchored: (moodKey: string) => void;
};

/** Core mood UI — use inside a card or full-screen shell. */
export function JournalMoodCheckInContent({ options, onAnchored }: Props) {
  const [now] = React.useState(() => new Date());
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const mid = Math.ceil(options.length / 2);
  const left = options.slice(0, mid);
  const right = options.slice(mid);

  return (
    <View>
      <Text style={styles.timestamp}>{formatJournalCheckinTimestamp(now)}</Text>
      <Text style={styles.question}>How are you feeling in this moment?</Text>

      <View style={styles.grid}>
        <View style={styles.col}>
          {left.map(m => (
            <MoodPill
              key={m.id}
              option={m}
              selected={selectedKey === m.key}
              onPress={() => setSelectedKey(m.key)}
            />
          ))}
        </View>
        <View style={styles.col}>
          {right.map(m => (
            <MoodPill
              key={m.id}
              option={m}
              selected={selectedKey === m.key}
              onPress={() => setSelectedKey(m.key)}
            />
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => selectedKey && onAnchored(selectedKey)}
        disabled={!selectedKey}
        style={({ pressed }) => [
          styles.ctaWrap,
          !selectedKey && styles.ctaDisabled,
          pressed && selectedKey && styles.ctaPressed,
        ]}>
        <LinearGradient
          colors={['#8FAF90', '#7E9DB5']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.ctaText}>Anchor this moment</Text>
      </Pressable>
    </View>
  );
}

/** Card variant (legacy / reuse). */
export function JournalMoodCheckIn(props: Props) {
  return (
    <View style={styles.cardWrap}>
      <JournalMoodCheckInContent {...props} />
    </View>
  );
}

function MoodPill({
  option,
  selected,
  onPress,
}: {
  option: AppMoodOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected && styles.pillSelected,
        pressed && styles.pillPressed,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}>
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
        {option.emoji ? `${option.emoji} ` : ''}
        {option.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    backgroundColor: '#F7F6F2',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.06)',
  },
  timestamp: {
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 1.4,
    color: 'rgba(58,45,42,0.38)',
    marginBottom: 18,
  },
  question: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 34,
    color: 'rgba(58,45,42,0.88)',
    fontFamily: EveCalTheme.typography.serif,
    fontStyle: 'italic',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  col: {
    flex: 1,
    gap: 12,
  },
  pill: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.14)',
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
  },
  pillSelected: {
    borderColor: 'rgba(58,45,42,0.35)',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  pillPressed: {
    opacity: 0.9,
  },
  pillText: {
    fontSize: 15,
    color: 'rgba(58,45,42,0.72)',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: EveCalTheme.colors.text,
    fontWeight: '600',
  },
  ctaWrap: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
