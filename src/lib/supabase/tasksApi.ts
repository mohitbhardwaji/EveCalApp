import RNFS from 'react-native-fs';
import { getSupabase } from './client';

/** Android RN `fetch(file://|content://)` fails with "Network request failed" — use RNFS. */
function pathForLocalRead(uri: string): string {
  const u = uri.trim();
  if (u.startsWith('content://')) {
    return u;
  }
  return u.replace(/^file:(\/)+/, '/');
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const g = globalThis as typeof globalThis & { atob(s: string): string };
  const binary = g.atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out.buffer;
}

async function readImageUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const path = pathForLocalRead(uri);
  const b64 = await RNFS.readFile(path, 'base64');
  return base64ToArrayBuffer(b64);
}

const IMAGE_EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/**
 * Normalize picker/storage mime for uploads. Only image/* is allowed (same rule on iOS and Android).
 */
export function resolveTaskPhotoMimeType(params: {
  mimeType?: string;
  fileName?: string;
}): { ok: true; mime: string } | { ok: false; message: string } {
  const raw = params.mimeType?.trim().toLowerCase() ?? '';

  if (raw.startsWith('video/') || raw === 'video') {
    return {
      ok: false,
      message: 'Only photos are allowed. Please choose an image from your library.',
    };
  }

  if (raw.startsWith('image/')) {
    const mime = raw === 'image/jpg' ? 'image/jpeg' : raw;
    return { ok: true, mime };
  }

  // Android sometimes reports generic binary for gallery images.
  if (raw === 'application/octet-stream') {
    const ext = params.fileName?.split('.').pop()?.toLowerCase();
    if (ext && IMAGE_EXT_TO_MIME[ext]) {
      return { ok: true, mime: IMAGE_EXT_TO_MIME[ext] };
    }
    return { ok: true, mime: 'image/jpeg' };
  }

  // Some Android content providers omit type; infer from file name.
  const ext = params.fileName?.split('.').pop()?.toLowerCase();
  if (ext && IMAGE_EXT_TO_MIME[ext]) {
    return { ok: true, mime: IMAGE_EXT_TO_MIME[ext] };
  }

  // Gallery was limited to photos but mime missing (common on Android).
  if (!raw && !ext) {
    return { ok: true, mime: 'image/jpeg' };
  }

  return {
    ok: false,
    message: 'Only image files (JPEG, PNG, WebP) can be uploaded.',
  };
}

export type PathCategorySummary = {
  id: string;
  name: string;
  taskCount: number;
};

export type PathTaskItem = {
  id: string;
  title: string;
  dueDate: string | null;
  categoryId: string;
  isCompleted: boolean;
};

export type PathTaskDetail = {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null;
  completedAt?: string | null;
  repeatLabel: string;
  categoryName: string;
  isCompleted?: boolean;
  photoUrl?: string | null;
};

type CategoryRow = {
  id: string;
  name: string | null;
  tasks: Array<{ count: number | null }> | null;
};

type TaskRow = {
  id: string;
  title?: string | null;
  name?: string | null;
  task?: string | null;
  due_date?: string | null;
  category_id: string;
  notes?: string | null;
  description?: string | null;
  repeat_label?: string | null;
  repeat?: string | null;
  is_completed?: boolean | null;
  completed_at?: string | null;
  photo_url?: string | null;
  photos?: Array<{
    id: string;
    image_url?: string | null;
    created_at?: string | null;
  }> | null;
  categories?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
};

function taskTitle(row: TaskRow): string {
  return row.title ?? row.name ?? row.task ?? 'Untitled task';
}

function formatRepeatLabel(row: TaskRow): string {
  return row.repeat_label ?? row.repeat ?? 'One-time';
}

export async function fetchPathCategories(): Promise<{
  ok: true;
  categories: PathCategorySummary[];
} | {
  ok: false;
  message: string;
}> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  const { data, error } = await supabase
    .from('categories')
    .select(
      `
        id,
        name,
        tasks(count)
      `,
    )
    .eq('user_id', user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  const categories = ((data ?? []) as CategoryRow[]).map(row => ({
    id: row.id,
    name: row.name?.trim() || 'Untitled category',
    taskCount: row.tasks?.[0]?.count ?? 0,
  }));

  return { ok: true, categories };
}

export async function fetchTasksForCategory(categoryId: string): Promise<{
  ok: true;
  tasks: PathTaskItem[];
} | {
  ok: false;
  message: string;
}> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('category_id', categoryId)
    .eq('user_id', user.id)
    .order('due_date', { ascending: true });

  if (error) {
    return { ok: false, message: error.message };
  }

  const tasks = ((data ?? []) as TaskRow[]).map(row => ({
    id: row.id,
    title: taskTitle(row),
    dueDate: row.due_date ?? null,
    categoryId: row.category_id,
    isCompleted: row.is_completed ?? false,
  }));

  return { ok: true, tasks };
}

export async function fetchTaskDetail(taskId: string): Promise<{
  ok: true;
  task: PathTaskDetail;
} | {
  ok: false;
  message: string;
}> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
        *,
        category:categories(name),
        photos:task_photos(
          id,
          image_url,
          created_at
        )
      `,
    )
    .eq('id', taskId)
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Task not found' };
  }

  const row = data as TaskRow;
  const latestPhoto =
    (row.photos ?? [])
      .filter(photo => Boolean(photo.image_url))
      .sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      })[0]?.image_url ?? null;

  return {
    ok: true,
    task: {
      id: row.id,
      title: taskTitle(row),
      notes: row.notes ?? row.description ?? '',
      dueDate: row.due_date ?? null,
      completedAt: row.completed_at ?? null,
      repeatLabel: formatRepeatLabel(row),
      isCompleted: row.is_completed ?? false,
      photoUrl: latestPhoto ?? row.photo_url ?? null,
      categoryName:
        row.category?.name?.trim() ||
        row.categories?.name?.trim() ||
        'Uncategorized',
    },
  };
}

export async function completeTaskWithPhoto(params: {
  taskId: string;
  fileUri: string;
  mimeType?: string;
  fileName?: string;
}): Promise<{ ok: true; imageUrl: string } | { ok: false; message: string }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in' };
  }

  try {
    const resolvedMime = resolveTaskPhotoMimeType({
      mimeType: params.mimeType,
      fileName: params.fileName,
    });
    if (!resolvedMime.ok) {
      return { ok: false, message: resolvedMime.message };
    }

    const bytes = await readImageUriAsArrayBuffer(params.fileUri);
    const mimeType = resolvedMime.mime;
    const extFromMime =
      mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
    const extFromName = params.fileName?.split('.').pop()?.toLowerCase();
    const ext = extFromName || extFromMime;
    const fileName = `${user.id}/${params.taskId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('task-photos')
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, message: uploadError.message };
    }

    const { data } = supabase.storage.from('task-photos').getPublicUrl(fileName);
    const imageUrl = data.publicUrl;

    const { error: photoInsertError } = await supabase.from('task_photos').insert({
      task_id: params.taskId,
      image_url: imageUrl,
    });

    if (photoInsertError) {
      return { ok: false, message: photoInsertError.message };
    }

    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.taskId)
      .eq('user_id', user.id);

    if (taskUpdateError) {
      return { ok: false, message: taskUpdateError.message };
    }

    return { ok: true, imageUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}
