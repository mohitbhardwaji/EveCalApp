import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TranscriptItem } from '../hooks/useVoiceCapture';
import { EveCalTheme } from '../theme/theme';

type Props = {
  items: TranscriptItem[];
};

export function TranscriptList({ items }: Props) {
  const scrollRef = React.useRef<ScrollView | null>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [items]);

  if (!items.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>
          Your live transcript will appear here after each pause.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      {items
        .slice()
        .reverse()
        .map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.time}>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={[styles.pill, item.isTask ? styles.taskPill : styles.notePill]}>
                {item.isTask ? 'Task created' : 'Transcript'}
              </Text>
            </View>
            <Text style={styles.body}>{item.text}</Text>
            {item.error ? <Text style={styles.error}>{item.error}</Text> : null}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(75,122,166,0.06)',
  },
  emptyText: {
    color: EveCalTheme.colors.textMuted,
  },
  content: {
    gap: 12,
    paddingRight: 8,
  },
  card: {
    width: 300,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: EveCalTheme.colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: EveCalTheme.colors.textMuted,
  },
  pill: {
    fontSize: 10,
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  taskPill: {
    backgroundColor: EveCalTheme.colors.accent1,
  },
  notePill: {
    backgroundColor: EveCalTheme.colors.accent2,
  },
  body: {
    color: EveCalTheme.colors.text,
    lineHeight: 20,
    fontSize: 14,
  },
  error: {
    marginTop: 8,
    color: '#b74b4b',
    fontSize: 12,
  },
});
