import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import type { JournalStackParamList } from '../../navigation/types';
import { EveCalTheme } from '../../theme/theme';
import { createJournalEntry } from '../../lib/supabase/journalEntriesApi';
import {
  FALLBACK_MOOD_OPTIONS_DETAILED,
  fetchMoodOptionsByType,
  type AppMoodOption,
} from '../../lib/supabase/moodOptions';
import {
  FALLBACK_TAG_OPTIONS,
  fetchActiveTagOptions,
  type AppTagOption,
} from '../../lib/supabase/tagOptions';
import { isUuid } from '../../lib/uuid';
import { useAuth } from '../../state/auth/AuthContext';
import {
  appendJournalEntry,
  type JournalTimeOfDay,
} from '../../state/journal/journalEntries';

type Nav = NativeStackNavigationProp<JournalStackParamList, 'JournalNewEntry'>;

const TIME_OPTIONS: {
  id: JournalTimeOfDay;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[] = [
  { id: 'morning', label: 'Morning', icon: 'sun' },
  { id: 'afternoon', label: 'Afternoon', icon: 'star' },
  { id: 'evening', label: 'Evening', icon: 'moon' },
  { id: 'night', label: 'Night', icon: 'heart' },
];

const PLACEHOLDER =
  "What's on your mind and heart today? Take a moment to reflect…";

function TimeOfDayCard({
  opt,
  selected,
  onSelect,
}: {
  opt: (typeof TIME_OPTIONS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.timeCard,
        selected && styles.timeCardSelected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      <Feather
        name={opt.icon}
        size={22}
        color={
          selected ? 'rgba(58,45,42,0.65)' : 'rgba(58,45,42,0.40)'
        }
      />
      <Text
        style={[
          styles.timeCardLabel,
          selected && styles.timeCardLabelSelected,
        ]}>
        {opt.label}
      </Text>
    </Pressable>
  );
}

const kickerStyle = {
  color: 'rgba(139, 118, 108, 0.85)',
  fontSize: 10,
  letterSpacing: 2.4,
  fontWeight: '600' as const,
  marginBottom: 12,
};

export function JournalNewEntryScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [timeOfDay, setTimeOfDay] = React.useState<JournalTimeOfDay>('morning');
  const [moodOptions, setMoodOptions] = React.useState<AppMoodOption[]>(
    FALLBACK_MOOD_OPTIONS_DETAILED,
  );
  const [selectedMoodId, setSelectedMoodId] = React.useState<string>(
    FALLBACK_MOOD_OPTIONS_DETAILED[0]!.id,
  );
  const [tagOptions, setTagOptions] =
    React.useState<AppTagOption[]>(FALLBACK_TAG_OPTIONS);
  const [selectedTagIds, setSelectedTagIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [reflection, setReflection] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { options, error } = await fetchMoodOptionsByType('detailed');
      if (cancelled) {
        return;
      }
      void error;
      if (options.length === 0) {
        return;
      }
      setMoodOptions(options);
      setSelectedMoodId(prev =>
        options.some(o => o.id === prev) ? prev : options[0]!.id,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    if (!user) {
      setTagOptions(FALLBACK_TAG_OPTIONS);
      setSelectedTagIds(new Set());
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const { options, error } = await fetchActiveTagOptions();
      if (cancelled) {
        return;
      }
      void error;
      if (options.length === 0) {
        return;
      }
      setTagOptions(options);
      setSelectedTagIds(prev => {
        const next = new Set<string>();
        for (const id of prev) {
          if (options.some(o => o.id === id)) {
            next.add(id);
          }
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const save = React.useCallback(async () => {
    if (saving) return;
    const trimmed = reflection.trim();
    if (!trimmed) {
      Alert.alert(
        'Add a reflection',
        'Write something in your reflection before saving, or go back to discard.',
      );
      return;
    }
    setSaving(true);
    try {
      const mood =
        moodOptions.find(m => m.id === selectedMoodId) ?? moodOptions[0]!;

      if (user) {
        if (!isUuid(mood.id)) {
          Alert.alert(
            'Cannot save',
            'Moods could not be loaded from the server. Check your connection and try again.',
          );
          return;
        }
        const tagIds = Array.from(selectedTagIds).filter(isUuid);
        const result = await createJournalEntry({
          moodId: mood.id,
          timeOfDay,
          note: trimmed,
          tagIds,
        });
        if (!result.ok) {
          Alert.alert('Could not save', result.message);
          return;
        }
      } else {
        const tagLabels = tagOptions
          .filter(t => selectedTagIds.has(t.id))
          .map(t => t.label);
        await appendJournalEntry({
          timeOfDay,
          mood: mood.label,
          moodEmoji: mood.emoji,
          reflection: trimmed,
          tags: tagLabels,
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    moodOptions,
    navigation,
    reflection,
    saving,
    selectedMoodId,
    selectedTagIds,
    tagOptions,
    timeOfDay,
    user,
  ]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={styles.headerIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Feather name="arrow-left" size={24} color={EveCalTheme.colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>New Entry</Text>
            <Pressable
              onPress={save}
              disabled={saving}
              style={[styles.saveCircle, saving && styles.saveCircleDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save entry">
              <Feather name="save" size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={kickerStyle}>TIME OF DAY</Text>
            <View style={styles.timeRows}>
              <View style={styles.timeRow}>
                {TIME_OPTIONS.slice(0, 2).map(opt => (
                  <TimeOfDayCard
                    key={opt.id}
                    opt={opt}
                    selected={timeOfDay === opt.id}
                    onSelect={() => setTimeOfDay(opt.id)}
                  />
                ))}
              </View>
              <View style={styles.timeRow}>
                {TIME_OPTIONS.slice(2, 4).map(opt => (
                  <TimeOfDayCard
                    key={opt.id}
                    opt={opt}
                    selected={timeOfDay === opt.id}
                    onSelect={() => setTimeOfDay(opt.id)}
                  />
                ))}
              </View>
            </View>

            <Text style={[kickerStyle, styles.sectionKicker]}>
              HOW ARE YOU FEELING?
            </Text>
            <View style={styles.moodWrap}>
              {moodOptions.map(m => {
                const selected = selectedMoodId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setSelectedMoodId(m.id)}
                    style={({ pressed }) => [
                      styles.moodPill,
                      selected && styles.moodPillSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}>
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text
                      style={[
                        styles.moodLabel,
                        selected && styles.moodLabelSelected,
                      ]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[kickerStyle, styles.sectionKicker]}>
              YOUR REFLECTION
            </Text>
            <View style={styles.reflectionBox}>
              <TextInput
                style={styles.reflectionInput}
                multiline
                placeholder={PLACEHOLDER}
                placeholderTextColor="rgba(58,45,42,0.28)"
                value={reflection}
                onChangeText={setReflection}
                textAlignVertical="top"
                maxLength={4000}
              />
              <Text style={styles.charCount}>
                {reflection.length} characters
              </Text>
            </View>

            <Text style={[kickerStyle, styles.sectionKicker]}>
              ADD TAGS (OPTIONAL)
            </Text>
            <View style={styles.tagWrap}>
              {tagOptions.map(t => {
                const selected = selectedTagIds.has(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => toggleTag(t.id)}
                    style={({ pressed }) => [
                      styles.tagPill,
                      selected && styles.tagPillSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}>
                    <Text
                      style={[
                        styles.tagLabel,
                        selected && styles.tagLabelSelected,
                      ]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
            <Pressable
              onPress={save}
              disabled={saving}
              style={({ pressed }) => [
                styles.footerBtn,
                pressed && styles.footerBtnPressed,
                saving && styles.footerBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save entry">
              <Feather name="save" size={22} color="#fff" />
              <Text style={styles.footerBtnText}>Save Entry</Text>
            </Pressable>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3EDE6',
  },
  flex: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(58,45,42,0.08)',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
    fontWeight: '500',
  },
  saveCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168, 201, 190, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    shadowColor: 'rgba(47, 141, 119, 0.35)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  saveCircleDisabled: {
    opacity: 0.55,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
  },
  sectionKicker: {
    marginTop: 26,
  },
  timeRows: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCard: {
    flex: 1,
    paddingVertical: 22,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.06)',
    alignItems: 'center',
    gap: 10,
  },
  timeCardSelected: {
    backgroundColor: 'rgba(245, 228, 232, 0.95)',
    borderColor: 'rgba(201, 168, 183, 0.35)',
    shadowColor: 'rgba(58,45,42,0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  timeCardLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(58,45,42,0.45)',
  },
  timeCardLabelSelected: {
    color: EveCalTheme.colors.text,
  },
  moodWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.06)',
  },
  moodPillSelected: {
    backgroundColor: 'rgba(200, 228, 212, 0.95)',
    borderColor: 'rgba(168, 201, 190, 0.6)',
    shadowColor: 'rgba(47, 141, 119, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  moodEmoji: {
    fontSize: 17,
  },
  moodLabel: {
    fontSize: 15,
    color: 'rgba(58,45,42,0.5)',
    fontWeight: '500',
  },
  moodLabelSelected: {
    color: EveCalTheme.colors.text,
  },
  reflectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
    minHeight: 200,
    padding: 16,
    paddingBottom: 36,
  },
  reflectionInput: {
    fontSize: 16,
    lineHeight: 24,
    color: EveCalTheme.colors.text,
    minHeight: 140,
  },
  charCount: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    fontSize: 12,
    color: 'rgba(58,45,42,0.35)',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 252, 248, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.06)',
  },
  tagPillSelected: {
    backgroundColor: 'rgba(200, 228, 212, 0.95)',
    borderColor: 'rgba(168, 201, 190, 0.55)',
  },
  tagLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(58,45,42,0.48)',
  },
  tagLabelSelected: {
    color: 'rgba(58,45,42,0.78)',
  },
  pressed: {
    opacity: 0.92,
  },
  bottomSpacer: {
    height: 8,
  },
  footerSafe: {
    backgroundColor: '#F3EDE6',
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(201, 168, 183, 0.92)',
    marginBottom: 4,
    shadowColor: 'rgba(142, 119, 110, 0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
  footerBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  footerBtnDisabled: {
    opacity: 0.55,
  },
  footerBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
