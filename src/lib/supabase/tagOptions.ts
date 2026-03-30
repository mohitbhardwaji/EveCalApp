import { getSupabase } from './client';
import type { Database } from './database.types';
import type { AppMoodOption } from './moodOptions';

export type AppTagOption = {
  id: string;
  label: string;
};

type TagOptionRow = Database['public']['Tables']['tag_options']['Row'];

/** Shapes `tag_options` for the journal anchor pill grid (`moods.mood` stores tag `id`). */
export function mapTagOptionsToAnchorMoodOptions(
  tags: AppTagOption[],
): AppMoodOption[] {
  return tags.map(t => ({
    id: t.id,
    key: t.id,
    label: t.label,
    emoji: '',
  }));
}

export const FALLBACK_TAG_OPTIONS: AppTagOption[] = [
  'Gratitude',
  'Peace',
  'Mindfulness',
  'Growth',
  'Family',
  'Self-care',
  'Joy',
  'Reflection',
].map((label, i) => ({ id: `fb-tag-${i}`, label }));

function normalizeTagRow(row: TagOptionRow): AppTagOption | null {
  const label = String(row.label ?? row.name ?? row.title ?? '').trim();
  if (!label) {
    return null;
  }
  return { id: String(row.id), label };
}

function sortTagRows(rows: TagOptionRow[]): TagOptionRow[] {
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

export async function fetchActiveTagOptions(): Promise<{
  options: AppTagOption[];
  error: string | null;
}> {
  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from('tag_options')
    .select('*')
    .eq('is_active', true);

  if (error) {
    return { options: [], error: error.message };
  }
  const list: TagOptionRow[] = (rows ?? []) as TagOptionRow[];
  const sorted = sortTagRows(list);
  const options = sorted
    .map(normalizeTagRow)
    .filter((o): o is AppTagOption => o != null);
  return { options, error: null };
}
