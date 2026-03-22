import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { EveCalTheme } from '../theme/theme';
import { formatJournalCheckinTimestamp } from '../state/journal/journalMoodCheckin';

const MOODS_LEFT = ['Grateful', 'Restless', 'Inspired', 'Balanced'] as const;
const MOODS_RIGHT = ['Focused', 'Serene', 'Overwhelmed', 'Reflective'] as const;

type Props = {
  onAnchored: (mood: string) => void;
};

/** Core mood UI — use inside a card or full-screen shell. */
export function JournalMoodCheckInContent({ onAnchored }: Props) {
  const [now] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <View>
      <Text style={styles.timestamp}>{formatJournalCheckinTimestamp(now)}</Text>
      <Text style={styles.question}>How are you feeling in this moment?</Text>

      <View style={styles.grid}>
        <View style={styles.col}>
          {MOODS_LEFT.map(m => (
            <MoodPill
              key={m}
              label={m}
              selected={selected === m}
              onPress={() => setSelected(m)}
            />
          ))}
        </View>
        <View style={styles.col}>
          {MOODS_RIGHT.map(m => (
            <MoodPill
              key={m}
              label={m}
              selected={selected === m}
              onPress={() => setSelected(m)}
            />
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => selected && onAnchored(selected)}
        disabled={!selected}
        style={({ pressed }) => [
          styles.ctaWrap,
          !selected && styles.ctaDisabled,
          pressed && selected && styles.ctaPressed,
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
  label,
  selected,
  onPress,
}: {
  label: string;
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
        {label}
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
