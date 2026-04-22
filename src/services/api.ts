import { transcribeCaptureSegmentWithGemini } from '../lib/speech/transcribeWithGemini';
import { classifyTaskText } from '../lib/tasks/classifyTask';
import { evaluateCaptureTaskIntent } from '../lib/tasks/evaluateCaptureTaskIntent';

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
  const decision = await evaluateCaptureTaskIntent(text);
  if (!decision.isTask) {
    return { isTask: false };
  }
  const created = await classifyTaskText(text, { captureTask: decision.payload });
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
