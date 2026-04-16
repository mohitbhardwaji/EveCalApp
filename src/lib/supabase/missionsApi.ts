import { getSupabase } from './client';

const CATEGORY_TINTS = [
  '#7DAFFF',
  '#D4A574',
  '#9AAE7A',
  '#C9A8B7',
  '#A8B7C9',
  '#E6C9A8',
] as const;

const CATEGORY_ICONS = [
  'smile',
  'coffee',
  'dollar-sign',
  'heart',
  'home',
  'calendar',
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function categoryVisuals(categoryId: string | undefined): {
  iconBg: string;
  iconName: string;
} {
  const key = categoryId ?? 'default';
  const idx = hashString(key) % CATEGORY_TINTS.length;
  return {
    iconBg: CATEGORY_TINTS[idx],
    iconName: CATEGORY_ICONS[idx],
  };
}

export type MissionTaskOption = {
  id: string;
  title: string;
  timeLabel: string;
  iconName: string;
  iconBg: string;
};

export type FocusMissionTaskRow = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  time: string;
  iconName: string;
  iconColor: string;
};

/** Plain-text summary for system share sheet (WhatsApp, Messages, etc.). */
export function buildTodaysMissionShareText(
  rows: FocusMissionTaskRow[],
  options?: { appLabel?: string },
): string {
  if (rows.length === 0) return '';
  const appLabel = options?.appLabel ?? 'Eve & Cal';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const blocks = rows.map((r, i) => {
    const detail = r.subtitle.trim();
    const extra =
      detail && detail !== 'No additional details yet.'
        ? `\n   ${detail}`
        : '';
    return `${i + 1}. ${r.title}\n   ${r.time} · ${r.tag}${extra}`;
  });
  return `${appLabel} — Today's focus (${today})\n\n${blocks.join('\n\n')}`;
}

type TaskPickerRow = {
  id: string;
  title: string | null;
  due_date: string | null;
  category: { id: string; name: string | null } | null;
};

type MissionTaskJoinRow = {
  task:
    | {
        id: string;
        title?: string | null;
        name?: string | null;
        due_date?: string | null;
        is_completed?: boolean | null;
        notes?: string | null;
        description?: string | null;
        category?: { id?: string; name?: string | null } | null;
      }
    | null;
};

function taskTitle(t: {
  title?: string | null;
  name?: string | null;
}): string {
  return t.title?.trim() || t.name?.trim() || 'Task';
}

function formatDueLabel(due: string | null): string {
  if (!due) return 'Today';
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return 'Today';
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPickerTimeLabel(due: string | null): string {
  if (!due) return 'No due time';
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return 'No due time';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function categoryTag(name: string | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return '·';
  if (n.length <= 4) return n;
  return n.slice(0, 3);
}

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getOrCreateTodaysMission(): Promise<
  | { ok: true; mission: { id: string } }
  | { ok: false; message: string }
> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  const date = todayIsoDate();

  const { data: existing, error: selErr } = await supabase
    .from('missions')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();

  if (selErr) {
    return { ok: false, message: selErr.message };
  }
  if (existing?.id) {
    return { ok: true, mission: { id: existing.id } };
  }

  const { data: created, error: insErr } = await supabase
    .from('missions')
    .insert({ user_id: user.id, date })
    .select('id')
    .single();

  if (insErr || !created) {
    return { ok: false, message: insErr?.message ?? 'Could not create mission' };
  }

  return { ok: true, mission: { id: (created as { id: string }).id } };
}

export async function fetchTasksForMissionPicker(options?: {
  excludeTaskIds?: string[];
}): Promise<{
  tasks: MissionTaskOption[];
  error: string | null;
}> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { tasks: [], error: null };
  }

  const exclude = new Set(options?.excludeTaskIds ?? []);

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
        id,
        title,
        due_date,
        is_completed,
        created_at,
        category:categories(
          id,
          name
        )
      `,
    )
    .eq('user_id', user.id)
    .order('due_date', { ascending: true });

  if (error) {
    return { tasks: [], error: error.message };
  }

  const rows = (data ?? []) as TaskPickerRow[];
  const tasks: MissionTaskOption[] = rows
    .filter(row => !exclude.has(row.id))
    .map(row => {
    const catId = row.category?.id;
    const v = categoryVisuals(catId);
    return {
      id: row.id,
      title: row.title?.trim() || 'Untitled task',
      timeLabel: formatPickerTimeLabel(row.due_date),
      iconName: v.iconName,
      iconBg: v.iconBg,
    };
    });

  return { tasks, error: null };
}

export async function fetchTodaysMissionTaskRows(): Promise<{
  rows: FocusMissionTaskRow[];
  error: string | null;
}> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { rows: [], error: null };
  }

  const date = todayIsoDate();

  const { data: mission, error: mErr } = await supabase
    .from('missions')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();

  if (mErr) {
    return { rows: [], error: mErr.message };
  }
  if (!mission?.id) {
    return { rows: [], error: null };
  }

  const { data, error } = await supabase
    .from('mission_tasks')
    .select(
      `
        task:tasks(
          id,
          title,
          due_date,
          is_completed,
          category:categories(id, name)
        )
      `,
    )
    .eq('mission_id', mission.id);

  if (error) {
    return { rows: [], error: error.message };
  }

  const joinRows = (data ?? []) as MissionTaskJoinRow[];
  const rows: FocusMissionTaskRow[] = joinRows
    .map(r => r.task)
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map(t => {
      const catName = t.category?.name ?? undefined;
      const catId = t.category?.id;
      const v = categoryVisuals(catId);
      const subtitle =
        (t.notes ?? t.description ?? '').trim() || 'No additional details yet.';
      return {
        id: t.id,
        title: taskTitle(t),
        subtitle,
        tag: categoryTag(catName),
        time: formatDueLabel(t.due_date ?? null),
        iconName: v.iconName,
        iconColor: v.iconBg,
      };
    });

  return { rows, error: null };
}

export async function addTasksToMission(
  missionId: string,
  taskIds: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  const unique = [...new Set(taskIds.filter(Boolean))];
  if (unique.length === 0) {
    return { ok: false, message: 'No tasks selected' };
  }

  const missionTasks = unique.map(task_id => ({
    mission_id: missionId,
    task_id,
  }));

  const { error } = await supabase.from('mission_tasks').insert(missionTasks);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
