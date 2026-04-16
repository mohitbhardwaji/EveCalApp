import { getSupabase } from './client';
import type { Database } from './database.types';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

function rowBody(row: NotificationRow): string {
  if (typeof row.body === 'string' && row.body.trim()) {
    return row.body.trim();
  }
  if (typeof row.message === 'string' && row.message.trim()) {
    return row.message.trim();
  }
  return '';
}

function rowTitle(row: NotificationRow): string {
  const t = row.title?.trim();
  return t && t.length > 0 ? t : 'Notification';
}

export function formatNotificationTime(createdAt: string | null | undefined): string {
  if (!createdAt) {
    return '';
  }
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const ySame =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (ySame) {
    return 'Yesterday';
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export async function fetchNotificationsForUser(): Promise<
  | { ok: true; items: NotificationRow[] }
  | { ok: false; message: string }
> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, items: (data ?? []) as NotificationRow[] };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function getUnreadNotificationCount(): Promise<
  { ok: true; count: number } | { ok: false; message: string }
> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true, count: 0 };
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, count: count ?? 0 };
}

export const notificationDisplay = {
  title: rowTitle,
  body: rowBody,
  time: formatNotificationTime,
};
