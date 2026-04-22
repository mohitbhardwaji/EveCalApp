export type TaskRowStatus =
  | 'pending'
  | 'saving'
  | 'done'
  | 'skipped'
  | 'failed';

export type TaskRow = {
  id: string;
  phrase: string;
  status: TaskRowStatus;
  summary?: string;
  errorMessage?: string;
};

export type SegmentStatus =
  | 'transcribing'
  | 'extracting_tasks'
  | 'tasks_saving'
  | 'done'
  | 'done_note'
  | 'failed';

export type CaptureSegment = {
  id: string;
  createdAt: number;
  categoryTitle?: string;
  status: SegmentStatus;
  fullText: string;
  taskSummary?: string;
  taskRows?: TaskRow[];
  errorMessage?: string;
};
