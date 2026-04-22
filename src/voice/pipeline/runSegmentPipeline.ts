import type { Dispatch, SetStateAction } from 'react';
import { transcribeCaptureSegmentWithGemini } from '../../lib/speech/transcribeWithGemini';
import { classifyTaskText } from '../../lib/tasks/classifyTask';
import { evaluateCaptureTaskIntent } from '../../lib/tasks/evaluateCaptureTaskIntent';
import { extractTasksFromTranscript } from '../../lib/tasks/extractTasksFromTranscript';
import type { CaptureSegment, TaskRow } from '../session/captureSegmentTypes';

function taskRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type RunSegmentPipelineArgs = {
  segmentId: string;
  filePath: string;
  /** Drop updates after unmount / teardown. */
  mounted: () => boolean;
  setSegments: Dispatch<SetStateAction<CaptureSegment[]>>;
};

/**
 * Decoupled async pipeline: transcribe → extract 0..n tasks → evaluate + classify per phrase.
 * Does not block capture; callers should fire-and-forget with void.
 */
export async function runSegmentPipeline({
  segmentId,
  filePath,
  mounted,
  setSegments,
}: RunSegmentPipelineArgs): Promise<void> {
  const stale = () => !mounted();

  const tr = await transcribeCaptureSegmentWithGemini(filePath);
  if (stale()) {
    return;
  }

  if (!tr.ok) {
    setSegments(prev =>
      prev.map(s =>
        s.id === segmentId
          ? {
              ...s,
              status: 'failed',
              errorMessage: tr.message,
              fullText: '',
            }
          : s,
      ),
    );
    return;
  }

  const text = tr.text.trim();
  if (!text) {
    setSegments(prev => prev.filter(s => s.id !== segmentId));
    return;
  }

  setSegments(prev =>
    prev.map(s =>
      s.id === segmentId
        ? { ...s, fullText: text, status: 'extracting_tasks' }
        : s,
    ),
  );

  const extracted = await extractTasksFromTranscript(text);
  if (stale()) {
    return;
  }

  if (!extracted.ok) {
    setSegments(prev =>
      prev.map(s =>
        s.id === segmentId
          ? {
              ...s,
              status: 'failed',
              errorMessage: extracted.message,
            }
          : s,
      ),
    );
    return;
  }

  const phrases = extracted.phrases;
  if (phrases.length === 0) {
    setSegments(prev =>
      prev.map(s =>
        s.id === segmentId ? { ...s, status: 'done_note', taskRows: [] } : s,
      ),
    );
    return;
  }

  const taskRows: TaskRow[] = phrases.map(phrase => ({
    id: taskRowId(),
    phrase,
    status: 'pending' as const,
  }));

  setSegments(prev =>
    prev.map(s =>
      s.id === segmentId
        ? { ...s, status: 'tasks_saving', taskRows: [...taskRows] }
        : s,
    ),
  );

  let anyDone = false;
  let anyTaskAttempt = false;

  for (const row of taskRows) {
    if (stale()) {
      return;
    }

    setSegments(prev =>
      prev.map(s => {
        if (s.id !== segmentId || !s.taskRows) {
          return s;
        }
        return {
          ...s,
          taskRows: s.taskRows.map(r =>
            r.id === row.id ? { ...r, status: 'saving' } : r,
          ),
        };
      }),
    );

    const decision = await evaluateCaptureTaskIntent(row.phrase);
    if (stale()) {
      return;
    }

    if (!decision.isTask) {
      setSegments(prev =>
        prev.map(s => {
          if (s.id !== segmentId || !s.taskRows) {
            return s;
          }
          return {
            ...s,
            taskRows: s.taskRows.map(r =>
              r.id === row.id ? { ...r, status: 'skipped' } : r,
            ),
          };
        }),
      );
      continue;
    }

    anyTaskAttempt = true;
    const result = await classifyTaskText(row.phrase, {
      captureTask: decision.payload,
    });
    if (stale()) {
      return;
    }

    if (result.ok) {
      anyDone = true;
      setSegments(prev =>
        prev.map(s => {
          if (s.id !== segmentId || !s.taskRows) {
            return s;
          }
          return {
            ...s,
            taskRows: s.taskRows.map(r =>
              r.id === row.id
                ? { ...r, status: 'done', summary: result.summary }
                : r,
            ),
          };
        }),
      );
    } else {
      setSegments(prev =>
        prev.map(s => {
          if (s.id !== segmentId || !s.taskRows) {
            return s;
          }
          return {
            ...s,
            taskRows: s.taskRows.map(r =>
              r.id === row.id
                ? { ...r, status: 'failed', errorMessage: result.message }
                : r,
            ),
          };
        }),
      );
    }
  }

  if (stale()) {
    return;
  }

  setSegments(prev => {
    const seg = prev.find(s => s.id === segmentId);
    const rows = seg?.taskRows ?? [];
    const doneSummaries = rows
      .filter(r => r.status === 'done' && r.summary)
      .map(r => r.summary as string);
    const summaryLine =
      doneSummaries.length === 0
        ? undefined
        : doneSummaries.length === 1
          ? doneSummaries[0]
          : `${doneSummaries.length} tasks saved`;

    let finalStatus: CaptureSegment['status'];
    if (anyDone) {
      finalStatus = 'done';
    } else if (!anyTaskAttempt) {
      finalStatus = 'done_note';
    } else {
      finalStatus = 'failed';
    }

    const err =
      finalStatus === 'failed'
        ? rows.find(r => r.status === 'failed')?.errorMessage ??
          'Could not save tasks.'
        : undefined;

    return prev.map(s =>
      s.id === segmentId
        ? {
            ...s,
            status: finalStatus,
            taskSummary: summaryLine,
            errorMessage: err,
          }
        : s,
    );
  });
}
