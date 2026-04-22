import React from 'react';
import { Platform } from 'react-native';
import type { RecordBackType } from 'react-native-audio-recorder-player';
import {
  listenRecorderPath,
  snapshotToSegmentFile,
  unlinkListenScratch,
  unlinkSegmentRecording,
} from '../voice/recording/fsPaths';
import { VOICE_CAPTURE_AUDIO_SET } from '../native/recordingAudioSet';
import { tryLoadAudioRecorder } from '../native/audioRecorderPlayer';
import { analyzeAndCreateTask, transcribeAudio } from '../services/api';

export type CaptureStatus = 'idle' | 'listening' | 'speaking' | 'processing';

export type TranscriptItem = {
  id: string;
  text: string;
  timestamp: number;
  isTask: boolean;
  task?: Record<string, unknown>;
  error?: string;
};

/** Listening mode: crossing this starts a speech segment. */
const SPEECH_ONSET_DB = -38;
/** Speaking mode: only stronger speech updates lastSpeechAt (prevents noise from blocking pause detection). */
const SPEECH_KEEPALIVE_DB = -34;
/** Speaking mode: sustained level below this counts toward quiet run. */
const QUIET_THRESHOLD_DB = -50;
/** Required pause length before segment finalization. */
const SILENCE_MS = 2500;
const MIN_SEGMENT_MS = 1000;
const SPEAKING_TICKS = 3;
const MAX_LISTEN_FILE_MS = 45_000;

function itemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function captureLog(step: string, payload?: Record<string, unknown>) {
  void step;
  void payload;
}

function captureError(step: string, error: unknown) {
  void step;
  const message = error instanceof Error ? error.message : String(error);
  return message;
}

export function useVoiceCapture() {
  const [status, setStatus] = React.useState<CaptureStatus>('idle');
  const [transcriptList, setTranscriptList] = React.useState<TranscriptItem[]>([]);
  const [currentChunk, setCurrentChunk] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const mountedRef = React.useRef(true);
  const activeRef = React.useRef(false);
  const phaseRef = React.useRef<'listening' | 'speaking'>('listening');
  const flushRef = React.useRef(false);
  const speakingStreakRef = React.useRef(0);
  const quietSinceRef = React.useRef<number | null>(null);
  const speechDetectedRef = React.useRef(false);
  const segmentIdRef = React.useRef<string | null>(null);
  const segmentDurationRef = React.useRef(0);
  const processingRef = React.useRef(false);
  const lastSpeechAtRef = React.useRef(0);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setIfMounted = React.useCallback((fn: () => void) => {
    if (mountedRef.current) {
      fn();
    }
  }, []);

  const mergeTranscriptChunk = React.useCallback((next: TranscriptItem) => {
    setTranscriptList(prev => {
      if (prev.length === 0) {
        return [next];
      }
      const [latest, ...rest] = prev;
      const closeInTime = next.timestamp - latest.timestamp < 10_000;
      const bothSmall = latest.text.length < 28 && next.text.length < 28;
      if (closeInTime && bothSmall && !latest.error && !next.error) {
        return [
          {
            ...latest,
            text: `${latest.text} ${next.text}`.trim(),
            timestamp: next.timestamp,
            isTask: latest.isTask || next.isTask,
            task: latest.task ?? next.task,
          },
          ...rest,
        ];
      }
      return [next, ...prev];
    });
  }, []);

  const startListenRecorder = React.useCallback(async () => {
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      throw new Error('Audio recorder is unavailable.');
    }
    ar.removeRecordBackListener();
    ar.setSubscriptionDuration(0.25);
    ar.addRecordBackListener((event: RecordBackType) => {
      void handleRecordBack(event).catch(e => {
        const message = e instanceof Error ? e.message : String(e);
        setIfMounted(() => setError(message));
      });
    });
    await wait(Platform.OS === 'ios' ? 120 : 40);
    await ar.startRecorder(listenRecorderPath(), VOICE_CAPTURE_AUDIO_SET, true);
  }, [setIfMounted]);

  const processSegment = React.useCallback(
    async (
      segmentId: string,
      rawPath: string,
      durationMs: number,
      snapshotPathFromFinalize?: string,
    ) => {
      if (processingRef.current) {
        captureLog('process.skip.already-processing', { segmentId });
        return;
      }
      processingRef.current = true;
      captureLog('process.begin', { segmentId, durationMs });
      setIfMounted(() => {
        setStatus('processing');
        setCurrentChunk('');
      });

      try {
        if (!speechDetectedRef.current || durationMs < MIN_SEGMENT_MS) {
          captureLog('process.skip.short-or-no-speech', {
            segmentId,
            durationMs,
            speechDetected: speechDetectedRef.current,
          });
          await unlinkSegmentRecording(segmentId);
          return;
        }

        const snapshotPath =
          snapshotPathFromFinalize ??
          (await snapshotToSegmentFile(segmentId, rawPath));
        if (!snapshotPath) {
          throw new Error('Could not prepare captured audio chunk.');
        }
        captureLog('process.snapshot.ready', { segmentId, snapshotPath });

        captureLog('audio->text start', { segmentId });
        const text = await transcribeAudio(snapshotPath);
        if (!text) {
          captureLog('process.transcribe.empty', { segmentId });
          return;
        }
        captureLog('audio->text result', { segmentId, text });
        captureLog('process.transcribe.ok', { segmentId, textLength: text.length });

        let taskResult: { isTask: boolean; task?: Record<string, unknown> } = {
          isTask: false,
        };
        try {
          captureLog('intent classify start', { segmentId });
          taskResult = await analyzeAndCreateTask(text);
        } catch (taskError) {
          captureError('process.task-analysis.failed', taskError);
        }
        captureLog('process.task-analysis.ok', {
          segmentId,
          isTask: taskResult.isTask,
        });
        mergeTranscriptChunk({
          id: itemId(),
          text,
          timestamp: Date.now(),
          isTask: taskResult.isTask,
          task: taskResult.task,
        });
      } catch (e) {
        const message = captureError('process.failed', e);
        setIfMounted(() => {
          setError(message);
        });
        mergeTranscriptChunk({
          id: itemId(),
          text: 'Could not process this chunk.',
          timestamp: Date.now(),
          isTask: false,
          error: message,
        });
      } finally {
        processingRef.current = false;
        captureLog('process.end', {
          segmentId,
          next: activeRef.current ? 'listening' : 'idle',
        });
        if (activeRef.current) {
          setIfMounted(() => setStatus('listening'));
        } else {
          setIfMounted(() => setStatus('idle'));
        }
      }
    },
    [mergeTranscriptChunk, setIfMounted],
  );

  const transitionToSpeaking = React.useCallback(async () => {
    if (flushRef.current || phaseRef.current !== 'listening') {
      return;
    }
    captureLog('transition.listening-to-speaking.begin');
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      return;
    }
    flushRef.current = true;
    try {
      try {
        await ar.pauseRecorder();
      } catch {
        // pause can fail on some devices; safe to continue.
      }
      try {
        await ar.stopRecorder();
      } catch {
        // may already be stopped while transitioning.
      }
      ar.removeRecordBackListener();
      await unlinkListenScratch();
      await startListenRecorder();

      const segmentId = itemId();
      segmentIdRef.current = segmentId;
      phaseRef.current = 'speaking';
      quietSinceRef.current = null;
      speechDetectedRef.current = false;
      segmentDurationRef.current = 0;
      lastSpeechAtRef.current = Date.now();
      setIfMounted(() => {
        setStatus('speaking');
        setCurrentChunk('Capturing speech...');
      });
      captureLog('transition.listening-to-speaking.ready', { segmentId });
    } catch (e) {
      const message = captureError('transition.listening-to-speaking.failed', e);
      setIfMounted(() => {
        setError(message);
        setStatus('listening');
      });
      try {
        await startListenRecorder();
      } catch {
        activeRef.current = false;
        setIfMounted(() => setStatus('idle'));
      }
    } finally {
      flushRef.current = false;
    }
  }, [setIfMounted, startListenRecorder]);

  const finalizeSegment = React.useCallback(async () => {
    if (flushRef.current || phaseRef.current !== 'speaking') {
      return;
    }
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      return;
    }
    flushRef.current = true;
    captureLog('segment.finalize.begin');
    try {
      const segmentId = segmentIdRef.current;
      const duration = segmentDurationRef.current;
      let rawPath = '';
      try {
        rawPath = await ar.stopRecorder();
      } catch {
        rawPath = '';
      }
      ar.removeRecordBackListener();
      phaseRef.current = 'listening';
      segmentIdRef.current = null;
      quietSinceRef.current = null;
      speakingStreakRef.current = 0;
      let snapshotPath: string | null = null;
      if (segmentId && rawPath) {
        snapshotPath = await snapshotToSegmentFile(segmentId, rawPath);
        captureLog('segment.finalize.snapshot', {
          segmentId,
          snapshotReady: Boolean(snapshotPath),
        });
      }
      if (activeRef.current) {
        await startListenRecorder();
        captureLog('segment.finalize.listen-resumed');
      }
      if (segmentId && rawPath) {
        captureLog('segment.finalize.process-queued', { segmentId, duration });
        await processSegment(
          segmentId,
          rawPath,
          duration,
          snapshotPath ?? undefined,
        );
      } else {
        captureLog('segment.finalize.no-audio', { segmentId });
      }
    } catch (e) {
      const message = captureError('segment.finalize.failed', e);
      setIfMounted(() => setError(message));
    } finally {
      flushRef.current = false;
    }
  }, [processSegment, setIfMounted, startListenRecorder]);

  const handleRecordBack = React.useCallback(
    async (event: RecordBackType) => {
      if (!activeRef.current || flushRef.current) {
        return;
      }
      const meter = Number.isFinite(event.currentMetering ?? NaN)
        ? (event.currentMetering as number)
        : -160;
      const pos = event.currentPosition ?? 0;

      if (phaseRef.current === 'listening') {
        if (pos >= MAX_LISTEN_FILE_MS) {
          const ar = tryLoadAudioRecorder();
          if (!ar) {
            return;
          }
          await ar.stopRecorder();
          await startListenRecorder();
          return;
        }
        if (meter > SPEECH_ONSET_DB) {
          speakingStreakRef.current += 1;
        } else {
          speakingStreakRef.current = 0;
        }
        if (speakingStreakRef.current >= SPEAKING_TICKS) {
          captureLog('vad.speech-detected', { meter });
          await transitionToSpeaking();
        }
        return;
      }

      segmentDurationRef.current = pos;
      if (meter > SPEECH_KEEPALIVE_DB) {
        speechDetectedRef.current = true;
        lastSpeechAtRef.current = Date.now();
      }
      if (meter < QUIET_THRESHOLD_DB) {
        if (quietSinceRef.current === null) {
          quietSinceRef.current = Date.now();
        }
      } else {
        quietSinceRef.current = null;
      }
      const silenceDuration =
        quietSinceRef.current === null ? 0 : Date.now() - quietSinceRef.current;
      const sinceLastSpeech =
        lastSpeechAtRef.current > 0 ? Date.now() - lastSpeechAtRef.current : 0;
      const shouldFinalize =
        speechDetectedRef.current &&
        (silenceDuration >= SILENCE_MS || sinceLastSpeech >= SILENCE_MS);
      if (shouldFinalize) {
        captureLog('vad.silence-detected', {
          silenceDuration,
          sinceLastSpeech,
          meter,
        });
        await finalizeSegment();
      }
    },
    [finalizeSegment, startListenRecorder, transitionToSpeaking],
  );

  const stop = React.useCallback(async () => {
    captureLog('session.stop.requested');
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      activeRef.current = false;
      setIfMounted(() => {
        setStatus('idle');
        setCurrentChunk('');
      });
      return;
    }
    const wasSpeaking = phaseRef.current === 'speaking' && !!segmentIdRef.current;
    const stopSegmentId = segmentIdRef.current;
    const stopDuration = segmentDurationRef.current;
    activeRef.current = false;
    try {
      ar.removeRecordBackListener();
      const rawPath = await ar.stopRecorder();
      if (wasSpeaking && stopSegmentId && rawPath) {
        const snapshotPath = await snapshotToSegmentFile(stopSegmentId, rawPath);
        captureLog('session.stop.flush-speaking-segment', {
          segmentId: stopSegmentId,
          duration: stopDuration,
          snapshotReady: Boolean(snapshotPath),
        });
        await processSegment(
          stopSegmentId,
          rawPath,
          stopDuration,
          snapshotPath ?? undefined,
        );
      }
    } catch {
      // ignore
    }
    phaseRef.current = 'listening';
    segmentIdRef.current = null;
    speakingStreakRef.current = 0;
    quietSinceRef.current = null;
    lastSpeechAtRef.current = 0;
    setIfMounted(() => {
      setStatus('idle');
      setCurrentChunk('');
    });
    await unlinkListenScratch();
    captureLog('session.stop.done');
  }, [processSegment, setIfMounted]);

  const start = React.useCallback(async () => {
    if (activeRef.current) {
      return;
    }
    captureLog('session.start.requested');
    setError(null);
    activeRef.current = true;
    phaseRef.current = 'listening';
    quietSinceRef.current = null;
    speakingStreakRef.current = 0;
    lastSpeechAtRef.current = Date.now();
    try {
      await startListenRecorder();
      setIfMounted(() => setStatus('listening'));
      captureLog('session.start.listening');
    } catch (e) {
      activeRef.current = false;
      const message = captureError('session.start.failed', e);
      setIfMounted(() => {
        setStatus('idle');
        setError(message);
      });
    }
  }, [setIfMounted, startListenRecorder]);

  React.useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return {
    isActive: status !== 'idle',
    isListening: status === 'listening',
    isSpeaking: status === 'speaking',
    isProcessing: status === 'processing',
    status,
    transcriptList,
    currentChunk,
    error,
    start,
    stop,
  };
}
