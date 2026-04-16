import { Platform } from 'react-native';
import { getSupabase } from './client';

/**
 * Unique key for upsert: same Supabase user → one row, `push_token` updated when FCM rotates.
 * Add in SQL if missing:
 * `ALTER TABLE public.user_devices ADD CONSTRAINT user_devices_user_id_key UNIQUE (user_id);`
 * (Or use a partial unique index if you need multiple rows per user later.)
 */
const USER_DEVICES_CONFLICT_COLUMN = 'user_id' as const;

/**
 * Registers or refreshes the FCM token: upsert by `user_id` so a new token replaces the old one.
 * Falls back to update-then-insert if the unique constraint is not on `user_id` yet.
 */
export async function registerUserDevicePushToken(
  pushToken: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  const row = {
    user_id: user.id,
    push_token: pushToken,
    platform: Platform.OS,
  };

  const { error: upsertError } = await supabase.from('user_devices').upsert(row, {
    onConflict: USER_DEVICES_CONFLICT_COLUMN,
  });

  if (!upsertError) {
    return { ok: true };
  }

  const { data: existing, error: selectError } = await supabase
    .from('user_devices')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (selectError) {
    return { ok: false, message: selectError.message };
  }

  if (existing?.length) {
    const { error: updateError } = await supabase
      .from('user_devices')
      .update({
        push_token: pushToken,
        platform: Platform.OS,
      })
      .eq('user_id', user.id);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }
    return { ok: true };
  }

  const { error: insertError } = await supabase.from('user_devices').insert(row);
  if (insertError) {
    return { ok: false, message: insertError.message };
  }
  return { ok: true };
}
