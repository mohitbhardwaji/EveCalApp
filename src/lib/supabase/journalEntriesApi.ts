import { getSupabase } from './client';
import type {
  JournalEntry,
  JournalTimeOfDay,
} from '../../state/journal/journalEntries';

const API_TIME: Record<JournalTimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const FROM_API_TIME: Record<string, JournalTimeOfDay> = {
  Morning: 'morning',
  Afternoon: 'afternoon',
  Evening: 'evening',
  Night: 'night',
};

function timeOfDayFromApi(s: string): JournalTimeOfDay {
  return FROM_API_TIME[s] ?? 'morning';
}

type EntryRowNested = {
  id: string;
  note: string;
  time_of_day: string;
  created_at: string;
  mood_options: { label: string } | null;
  entry_tags: { tag_options: { label: string } | null }[] | null;
};

export async function createJournalEntry(params: {
  moodId: string;
  timeOfDay: JournalTimeOfDay;
  note: string;
  tagIds: string[];
}): Promise<{ ok: true; entryId: string } | { ok: false; message: string }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  const { data: entry, error } = await supabase
    .from('entries')
    .insert({
      user_id: user.id,
      mood_id: params.moodId,
      time_of_day: API_TIME[params.timeOfDay],
      note: params.note,
    })
    .select()
    .single();

  if (error || !entry) {
    return {
      ok: false,
      message: error?.message ?? 'Could not create entry',
    };
  }

  const entryId = (entry as { id: string }).id;

  if (params.tagIds.length > 0) {
    const { error: tagErr } = await supabase.from('entry_tags').insert(
      params.tagIds.map(tag_id => ({
        entry_id: entryId,
        tag_id,
      })),
    );
    if (tagErr) {
      return { ok: false, message: tagErr.message };
    }
  }

  return { ok: true, entryId };
}

export async function fetchUserJournalEntries(): Promise<{
  entries: JournalEntry[];
  error: string | null;
}> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { entries: [], error: null };
  }

  const { data, error } = await supabase
    .from('entries')
    .select(
      `
      id,
      note,
      time_of_day,
      created_at,
      mood_options ( label ),
      entry_tags ( tag_options ( label ) )
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { entries: [], error: error.message };
  }

  const rows = (data ?? []) as EntryRowNested[];
  const entries: JournalEntry[] = rows.map(row => {
    const moodLabel = row.mood_options?.label ?? '·';
    const moodEmoji = '✨';
    const tagLabels =
      row.entry_tags
        ?.map(et => et.tag_options?.label)
        .filter((l): l is string => Boolean(l)) ?? [];
    return {
      id: row.id,
      createdAt: row.created_at,
      timeOfDay: timeOfDayFromApi(row.time_of_day),
      mood: moodLabel,
      moodEmoji,
      reflection: row.note,
      tags: tagLabels,
    };
  });

  return { entries, error: null };
}
