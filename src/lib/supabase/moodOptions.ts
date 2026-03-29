import { getSupabase } from './client';
import type { Database } from './database.types';

export type MoodOptionsType = 'quick' | 'detailed';

export type AppMoodOption = {
  id: string;
  /** Legacy string used for quick-check `moods` table + local storage. */
  key: string;
  label: string;
  emoji: string;
};

type MoodOptionRow = Database['public']['Tables']['mood_options']['Row'];

const BASE_FALLBACK: Omit<AppMoodOption, 'id'>[] = [
  { key: 'Calm', label: 'Calm', emoji: '🌿' },
  { key: 'Grateful', label: 'Grateful', emoji: '💛' },
  { key: 'Reflective', label: 'Reflective', emoji: '🌙' },
  { key: 'Joyful', label: 'Joyful', emoji: '✨' },
  { key: 'Peaceful', label: 'Peaceful', emoji: '🕊️' },
  { key: 'Energized', label: 'Energized', emoji: '⚡' },
  { key: 'Restless', label: 'Restless', emoji: '〰️' },
  { key: 'Inspired', label: 'Inspired', emoji: '💡' },
  { key: 'Balanced', label: 'Balanced', emoji: '⚖️' },
  { key: 'Focused', label: 'Focused', emoji: '🎯' },
  { key: 'Serene', label: 'Serene', emoji: '🌊' },
  { key: 'Overwhelmed', label: 'Overwhelmed', emoji: '🌧️' },
];

function withFallbackIds(
  prefix: string,
  slice?: { start: number; end?: number },
): AppMoodOption[] {
  const sliceList = slice
    ? BASE_FALLBACK.slice(slice.start, slice.end)
    : BASE_FALLBACK;
  return sliceList.map((m, i) => ({
    ...m,
    id: `${prefix}-${i}`,
  }));
}

/** Journal anchor (home) — when API fails. */
export const FALLBACK_MOOD_OPTIONS_QUICK = withFallbackIds('fb-quick', {
  start: 0,
  end: 8,
});

/** New entry screen — when API fails. */
export const FALLBACK_MOOD_OPTIONS_DETAILED = withFallbackIds('fb-detailed');

function normalizeRow(row: MoodOptionRow): AppMoodOption | null {
  const label = String(
    row.label ?? row.name ?? row.title ?? row.key ?? row.slug ?? '',
  ).trim();
  if (!label) {
    return null;
  }
  const key = String(row.key ?? row.slug ?? label).trim();
  const emoji =
    typeof row.emoji === 'string' && row.emoji.length > 0 ? row.emoji : '✨';
  return { id: String(row.id), key, label, emoji };
}

function sortRows(rows: MoodOptionRow[]): MoodOptionRow[] {
  return [...rows].sort((a, b) => {
    const ao = a.sort_order;
    const bo = b.sort_order;
    if (typeof ao === 'number' && typeof bo === 'number') {
      return ao - bo;
    }
    if (typeof ao === 'number') {
      return -1;
    }
    if (typeof bo === 'number') {
      return 1;
    }
    return 0;
  });
}

export async function fetchMoodOptionsByType(type: MoodOptionsType): Promise<{
  options: AppMoodOption[];
  error: string | null;
}> {
  const supabase = getSupabase();
  const { data: moods, error } = await supabase
    .from('mood_options')
    .select('*')
    .eq('type', type);

  if (error) {
    return { options: [], error: error.message };
  }
  const rows: MoodOptionRow[] = (moods ?? []) as MoodOptionRow[];
  const sorted = sortRows(rows);
  const options = sorted
    .map(normalizeRow)
    .filter((o): o is AppMoodOption => o != null);
  return { options, error: null };
}
