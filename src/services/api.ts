import { transcribeCaptureSegmentWithGemini } from '../lib/speech/transcribeWithGemini';
import { classifyTaskText } from '../lib/tasks/classifyTask';

type AnalyzeTaskResponse = {
  isTask: boolean;
  task?: Record<string, unknown>;
};

export async function transcribeAudio(filePath: string): Promise<string> {
  const result = await transcribeCaptureSegmentWithGemini(filePath);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.text.trim();
}

export async function analyzeAndCreateTask(
  text: string,
): Promise<AnalyzeTaskResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isTask: false };
  }
  const title = trimmed
    .replace(/\s+/g, ' ')
    .slice(0, 80)
    .trim();
  const created = await classifyTaskText(trimmed, {
    captureTask: {
      title: title || 'Voice task',
      description: trimmed,
      createdAt: new Date().toISOString(),
    },
  });
  if (!created.ok) {
    throw new Error(created.message);
  }
  return {
    isTask: true,
    task:
      created.data && typeof created.data === 'object'
        ? (created.data as Record<string, unknown>)
        : { summary: created.summary },
  };
}
