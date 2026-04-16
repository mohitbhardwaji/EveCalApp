import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PathCategorySummary } from '../supabase/tasksApi';

const key = (userId: string) => `@evecal/path_categories:${userId}`;

/** Stable string for comparing API responses (order-independent). */
export function pathCategoriesFingerprint(
  categories: PathCategorySummary[],
): string {
  return JSON.stringify(
    [...categories]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(c => ({ id: c.id, name: c.name, taskCount: c.taskCount })),
  );
}

export async function loadPathCategoriesCache(
  userId: string,
): Promise<PathCategorySummary[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { categories?: PathCategorySummary[] };
    const list = parsed?.categories;
    if (!Array.isArray(list)) return null;
    return list;
  } catch {
    return null;
  }
}

export async function savePathCategoriesCache(
  userId: string,
  categories: PathCategorySummary[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      key(userId),
      JSON.stringify({ categories, updatedAt: Date.now() }),
    );
  } catch {
    // ignore persist errors; UI still shows latest fetch
  }
}
