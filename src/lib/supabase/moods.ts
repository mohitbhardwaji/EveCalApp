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

  const { error } = await supabase.from('moods').insert({
    user_id: user.id,
    mood,
  });

  if (error) {
    return { kind: 'error', message: error.message };
  }
  return { kind: 'saved' };
}
