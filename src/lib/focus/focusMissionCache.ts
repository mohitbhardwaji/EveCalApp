import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusMissionTaskRow } from '../supabase/missionsApi';

const storageKey = (userId: string, date: string) =>
  `@evecal/focus_mission_tasks:${userId}:${date}`;

export function focusMissionTasksFingerprint(
  rows: FocusMissionTaskRow[],
): string {
  return JSON.stringify(
    [...rows]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(r => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        tag: r.tag,
        time: r.time,
        iconName: r.iconName,
        iconColor: r.iconColor,
      })),
  );
}

export async function loadFocusMissionTasksCache(
  userId: string,
  date: string,
): Promise<FocusMissionTaskRow[] | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: FocusMissionTaskRow[] };
    const list = parsed?.rows;
    if (!Array.isArray(list)) return null;
    return list;
  } catch {
    return null;
  }
}

export async function saveFocusMissionTasksCache(
  userId: string,
  date: string,
  rows: FocusMissionTaskRow[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      storageKey(userId, date),
      JSON.stringify({ rows, updatedAt: Date.now() }),
    );
  } catch {
    // ignore
  }
}

/** Remove cached mission tasks for a user+date (e.g. after sign-out or forced reset). */
export async function clearFocusMissionTasksCache(
  userId: string,
  date: string,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId, date));
  } catch {
    // ignore
  }
}
