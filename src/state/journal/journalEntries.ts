import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '../auth/storageKeys';

export type JournalTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type JournalEntry = {
  id: string;
  createdAt: string;
  timeOfDay: JournalTimeOfDay;
  mood: string;
  moodEmoji: string;
  reflection: string;
  tags: string[];
};

function newId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function loadEntries(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.journalEntries);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is JournalEntry =>
        e &&
        typeof e === 'object' &&
        typeof (e as JournalEntry).id === 'string' &&
        typeof (e as JournalEntry).reflection === 'string',
    );
  } catch {
    return [];
  }
}

async function saveEntries(entries: JournalEntry[]) {
  await AsyncStorage.setItem(
    StorageKeys.journalEntries,
    JSON.stringify(entries),
  );
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const list = await loadEntries();
  return list.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function formatJournalEntryDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) {
    return 'Today';
  }
  if (sameDay(d, yesterday)) {
    return 'Yesterday';
  }
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function journalTimeIconName(
  t: JournalTimeOfDay,
): 'sun' | 'star' | 'moon' | 'heart' {
  switch (t) {
    case 'morning':
      return 'sun';
    case 'afternoon':
      return 'star';
    case 'evening':
      return 'moon';
    case 'night':
      return 'heart';
    default:
      return 'sun';
  }
}

export function journalTimeDisplayLabel(t: JournalTimeOfDay): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export async function appendJournalEntry(
  entry: Omit<JournalEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): Promise<JournalEntry> {
  const list = await loadEntries();
  const full: JournalEntry = {
    id: entry.id ?? newId(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    timeOfDay: entry.timeOfDay,
    mood: entry.mood,
    moodEmoji: entry.moodEmoji,
    reflection: entry.reflection,
    tags: entry.tags,
  };
  list.unshift(full);
  await saveEntries(list);
  return full;
}
