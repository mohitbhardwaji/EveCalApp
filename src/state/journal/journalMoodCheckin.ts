import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '../auth/storageKeys';

export type JournalDayPeriod = 'morning' | 'afternoon' | 'night';

type CheckinMap = Record<string, string>;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Morning: 5:00–11:59 · Afternoon: 12:00–16:59 · Night: 17:00–04:59
 * Night before midnight uses today's date; 00:00–04:59 uses *yesterday's* date
 * so each calendar "evening" has one night slot.
 */
export function getCurrentJournalSlot(): {
  period: JournalDayPeriod;
  storageKey: string;
  periodLabel: string;
} {
  const now = new Date();
  const h = now.getHours();

  if (h >= 5 && h < 12) {
    return {
      period: 'morning',
      storageKey: `${dateKey(now)}_morning`,
      periodLabel: 'Morning',
    };
  }
  if (h >= 12 && h < 17) {
    return {
      period: 'afternoon',
      storageKey: `${dateKey(now)}_afternoon`,
      periodLabel: 'Afternoon',
    };
  }
  if (h >= 17) {
    return {
      period: 'night',
      storageKey: `${dateKey(now)}_night`,
      periodLabel: 'Night',
    };
  }
  // 0–4: night slot tied to previous calendar day
  const prev = new Date(now);
  prev.setDate(prev.getDate() - 1);
  return {
    period: 'night',
    storageKey: `${dateKey(prev)}_night`,
    periodLabel: 'Night',
  };
}

export function formatJournalCheckinTimestamp(d = new Date()): string {
  const days = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const ap = d.getHours() >= 12 ? 'PM' : 'AM';
  const h12 = d.getHours() % 12 || 12;
  const min = pad2(d.getMinutes());
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${h12}:${min} ${ap}`;
}

async function loadMap(): Promise<CheckinMap> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.journalMoodCheckins);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as CheckinMap) : {};
  } catch {
    return {};
  }
}

async function saveMap(map: CheckinMap) {
  await AsyncStorage.setItem(
    StorageKeys.journalMoodCheckins,
    JSON.stringify(map),
  );
}

export async function isJournalSlotComplete(storageKey: string): Promise<boolean> {
  const map = await loadMap();
  return Boolean(map[storageKey]);
}

export async function saveJournalMoodForSlot(
  storageKey: string,
  mood: string,
): Promise<void> {
  const map = await loadMap();
  map[storageKey] = mood;
  await saveMap(map);
}

export async function getJournalMoodForSlot(
  storageKey: string,
): Promise<string | null> {
  const map = await loadMap();
  return map[storageKey] ?? null;
}

export function periodLabelFromStorageKey(storageKey: string): string {
  if (storageKey.endsWith('_morning')) return 'Morning';
  if (storageKey.endsWith('_afternoon')) return 'Afternoon';
  if (storageKey.endsWith('_night')) return 'Night';
  return '';
}
