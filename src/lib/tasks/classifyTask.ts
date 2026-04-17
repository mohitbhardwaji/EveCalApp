import { getSupabase } from '../supabase/client';

export type CaptureTaskPayload = {
  title: string;
  description: string;
  createdAt: string;
};

export type ClassifyTaskResult =
  | { ok: true; data: unknown; summary: string }
  | { ok: false; message: string };

function summarizeClassifiedTask(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return 'Task processed successfully.';
  }

  const record = data as Record<string, unknown>;
  const title =
    typeof record.title === 'string'
      ? record.title
      : typeof record.task === 'string'
        ? record.task
        : typeof record.summary === 'string'
          ? record.summary
          : null;

  const category =
    typeof record.category === 'string'
      ? record.category
      : typeof record.type === 'string'
        ? record.type
        : null;

  if (title && category) {
    return `${title} • ${category}`;
  }
  if (title) {
    return title;
  }
  if (category) {
    return `Task categorized as ${category}.`;
  }

  const raw = JSON.stringify(data);
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}

export async function classifyTaskText(
  text: string,
  options?: { captureTask?: CaptureTaskPayload },
): Promise<ClassifyTaskResult> {
  const input = text.trim();
  if (!input) {
    return { ok: false, message: 'Please enter a task before submitting.' };
  }

  try {
    const supabase = getSupabase();
    const session = (await supabase.auth.getSession()).data.session;
    const accessToken = session?.access_token;

    const body: { text: string; captureTask?: CaptureTaskPayload } = {
      text: input,
    };
    if (options?.captureTask) {
      body.captureTask = options.captureTask;
    }

    const { data, error } = await supabase.functions.invoke('classify-task', {
      body,
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      data,
      summary: summarizeClassifiedTask(data),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}
