import { getSupabase } from './client';

export type SaveMoodToSupabaseResult =
  | { kind: 'skipped' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/**
 * Persists a mood row for the signed-in user. Guests / missing mood → skipped (no error).
 */
export async function saveMoodToSupabase(
  mood: string | null | undefined,
): Promise<SaveMoodToSupabaseResult> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !mood) {
    return { kind: 'skipped' };
  }

  const { error } = await supabase.from('moods').upsert(
    {
      user_id: user.id,
      mood,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    return { kind: 'error', message: error.message };
  }
  return { kind: 'saved' };
}

async function resolveTagOptionLabel(moodStored: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: byId } = await supabase
    .from('tag_options')
    .select('label')
    .eq('id', moodStored)
    .maybeSingle();
  if (byId && typeof byId.label === 'string' && byId.label.trim()) {
    return byId.label.trim();
  }
  const { data: byLabel } = await supabase
    .from('tag_options')
    .select('label')
    .eq('is_active', true)
    .eq('label', moodStored)
    .maybeSingle();
  if (byLabel && typeof byLabel.label === 'string' && byLabel.label.trim()) {
    return byLabel.label.trim();
  }
  return null;
}

/** Legacy rows: `moods.mood` matched `mood_options` (detailed) key/label. */
async function resolveDetailedMoodLabel(moodStored: string): Promise<string> {
  const supabase = getSupabase();
  const { data: byKey } = await supabase
    .from('mood_options')
    .select('label')
    .eq('type', 'detailed')
    .eq('is_active', true)
    .eq('key', moodStored)
    .maybeSingle();
  if (byKey && typeof byKey.label === 'string' && byKey.label.trim()) {
    return byKey.label.trim();
  }
  const { data: byLabel } = await supabase
    .from('mood_options')
    .select('label')
    .eq('type', 'detailed')
    .eq('is_active', true)
    .eq('label', moodStored)
    .maybeSingle();
  if (byLabel && typeof byLabel.label === 'string' && byLabel.label.trim()) {
    return byLabel.label.trim();
  }
  return moodStored;
}

async function resolveAnchorMoodDisplayLabel(moodStored: string): Promise<string> {
  const fromTag = await resolveTagOptionLabel(moodStored);
  if (fromTag) {
    return fromTag;
  }
  return resolveDetailedMoodLabel(moodStored);
}

/**
 * Current mood from `moods` for the signed-in user (one row per user via upsert).
 * Resolves display label via `tag_options` (anchor stores tag id), then legacy `mood_options` detailed.
 * `slotStorageKey` is unused but kept for call-site stability; slot gating uses local journal state.
 */
export async function fetchAnchorMoodForSlotFromApi(
  _slotStorageKey: string,
): Promise<{ label: string | null; fetchFailed: boolean }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { label: null, fetchFailed: false };
  }

  const { data: row, error } = await supabase
    .from('moods')
    .select('mood')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[journal] fetch anchor mood', error.message);
    }
    return { label: null, fetchFailed: true };
  }

  const raw = row?.mood;
  if (typeof raw !== 'string' || !raw.trim()) {
    return { label: null, fetchFailed: false };
  }

  try {
    const label = await resolveAnchorMoodDisplayLabel(raw.trim());
    return { label, fetchFailed: false };
  } catch {
    return { label: raw.trim(), fetchFailed: false };
  }
}
