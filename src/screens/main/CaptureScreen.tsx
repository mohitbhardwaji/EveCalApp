export { CaptureScreen } from '../CaptureScreen';
export { CaptureScreen } from '../CaptureScreen';
export { CaptureScreen } from '../CaptureScreen';
export { CaptureScreen } from '../CaptureScreen';
// @refresh reset
/**
 * Capture: session-scoped parallel capture + pipeline
 * - Listening: VAD scratch file (never transcribed); recording starts on speech onset.
 * - Sustained silence (~1.5–2s) closes the current segment file, enqueues one transcript, then listen restarts for the next utterance.
 * - Pipeline (transcribe → extract tasks → per-task classify) is async; updates stop after unmount (mountedRef).
 */
import React from 'react';
import {
  Animated,
  Easing,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import type { RecordBackType } from 'react-native-audio-recorder-player';
import { WarmAlertDialog } from '../../components/WarmAlertDialog';
import {
  formatDurationMmSs,
  NATIVE_AUDIO_SETUP_HINT,
  tryLoadAudioRecorder,
} from '../../native/audioRecorderPlayer';
import { VOICE_CAPTURE_AUDIO_SET } from '../../native/recordingAudioSet';
import { EveCalTheme } from '../../theme/theme';
import { TopHeader } from '../../components/TopHeader';
import { runSegmentPipeline } from '../../voice/pipeline/runSegmentPipeline';
import {
  listenRecorderPath,
  segmentRecordingPath,
  snapshotToSegmentFile,
  unlinkListenScratch,
  unlinkSegmentRecording,
} from '../../voice/recording/fsPaths';
import { recordingFailureMessage } from '../../voice/recording/recordingFailureMessage';
import type {
  CaptureSegment,
  SegmentStatus,
  TaskRow,
} from '../../voice/session/captureSegmentTypes';
import {
  consumeCaptureCategoryIntent,
  type CaptureCategoryIntent,
} from '../../state/capture/captureIntent';

const ICON_FALLBACK: Record<string, string> = {
  'social-harmony': 'users',
  'daily-rituals': 'coffee',
  'core-peace': 'leaf',
  'home-base': 'home',
  growth: 'heart',
};

const REC_BLUE = {
  ringBorder: 'rgba(91, 140, 200, 0.55)',
  micFill: 'rgba(230, 242, 252, 0.94)',
  micIcon: 'rgba(55, 105, 165, 0.96)',
  label: 'rgba(55, 95, 145, 0.96)',
  dot: 'rgba(75, 130, 195, 0.95)',
  stopBg: 'rgba(65, 115, 175, 0.96)',
  stopShadow: 'rgba(55, 100, 160, 0.42)',
};

/** Listening: energy above this counts toward speech-onset streak. */
const LISTEN_SPEECH_DB = -48;
/** Target end-of-utterance pause (1.5–2s band). */
const PAUSE_TO_FINALIZE_MS = 1750;
/** Abort a speech-onset false start (no real audio) after this much sustained quiet. */
const DEAD_AIR_WITHOUT_SPEECH_MS = 3200;
const MIN_SEGMENT_MS = 400;
const MAX_SEGMENT_MS = 120_000;
const SPEECH_ONSET_STREAK_TICKS = 2;
const MAX_LISTENING_FILE_MS = 45_000;
/**
 * Ignore end-of-segment silence until the segment recorder has run briefly (warm-up / metering).
 */
const GRACE_AFTER_SEGMENT_START_MS = 550;
/**
 * Recording: frames above this reset pause detection (stricter than listen — reduces false “still speaking” during pauses).
 */
const RECORDING_SPEECH_RESET_DB = -36;
/** Recording: frames below this count as sustained quiet (see wall-clock `sustainedQuietSinceRef`). */
const RECORDING_QUIET_DB = -52;

function newCaptureSegmentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function statusLabel(s: SegmentStatus): string {
  switch (s) {
    case 'transcribing':
      return 'Transcribing';
    case 'extracting_tasks':
      return 'Extracting tasks';
    case 'tasks_saving':
      return 'Saving tasks';
    case 'done':
      return 'Task saved';
    case 'done_note':
      return 'Transcript';
    case 'failed':
      return 'Issue';
  }
}

function statusColor(s: SegmentStatus): string {
  switch (s) {
    case 'transcribing':
      return 'rgba(75, 122, 166, 0.95)';
    case 'extracting_tasks':
      return 'rgba(120, 100, 180, 0.92)';
    case 'tasks_saving':
      return 'rgba(100, 130, 175, 0.92)';
    case 'done':
      return 'rgba(47, 141, 119, 0.95)';
    case 'done_note':
      return 'rgba(100, 120, 140, 0.92)';
    case 'failed':
      return 'rgba(183, 92, 72, 0.95)';
  }
}

function taskRowStatusLabel(r: TaskRow): string {
  switch (r.status) {
    case 'pending':
      return 'Queued';
    case 'saving':
      return 'Saving…';
    case 'done':
      return 'Saved';
    case 'skipped':
      return 'Note';
    case 'failed':
      return 'Issue';
  }
}

function TranscriptSkeleton() {
  const pulse = React.useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ gap: 8 }}>
      {[0.92, 0.72, 0.52].map((w, i) => (
        <Animated.View
          key={i}
          style={{
            height: 12,
            borderRadius: 6,
            width: `${w * 100}%`,
            backgroundColor: 'rgba(58,45,42,0.12)',
            opacity: pulse,
          }}
        />
      ))}
    </View>
  );
}

function SegmentCard({
  segment,
  onDismiss,
}: {
  segment: CaptureSegment;
  onDismiss: (id: string) => void;
}) {
  const showDismiss =
    segment.status === 'done' ||
    segment.status === 'done_note' ||
    segment.status === 'failed';
  const showTranscriptBody =
    !!segment.fullText &&
    segment.status !== 'transcribing';

  return (
    <View style={styles.transcriptCard}>
      <View style={styles.transcriptCardTop}>
        <View
          style={[
            styles.transcriptStatusPill,
            { backgroundColor: statusColor(segment.status) },
          ]}>
          <Text style={styles.transcriptStatusText}>
            {statusLabel(segment.status)}
          </Text>
        </View>
        <View style={styles.transcriptCardMeta}>
          <Text style={styles.transcriptTime}>
            {new Date(segment.createdAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
          {showDismiss ? (
            <Pressable
              onPress={() => onDismiss(segment.id)}
              hitSlop={10}
              style={styles.transcriptDismissBtn}
              accessibilityRole="button"
              accessibilityLabel="Dismiss">
              <Feather name="x" size={14} color="rgba(58,45,42,0.72)" />
            </Pressable>
          ) : null}
        </View>
      </View>
      {segment.categoryTitle ? (
        <Text style={styles.transcriptCategory}>{segment.categoryTitle}</Text>
      ) : null}
      {segment.status === 'transcribing' ? <TranscriptSkeleton /> : null}
      {showTranscriptBody ? (
        <Text style={styles.transcriptBody}>{segment.fullText}</Text>
      ) : null}
      {segment.status === 'extracting_tasks' ? (
        <Text style={styles.transcriptHint}>Splitting transcript into tasks…</Text>
      ) : null}
      {segment.status === 'tasks_saving' && !segment.taskRows?.length ? (
        <Text style={styles.transcriptHint}>Saving tasks…</Text>
      ) : null}
      {segment.taskRows && segment.taskRows.length > 0 ? (
        <View style={styles.taskRows}>
          {segment.taskRows.map(row => (
            <View key={row.id} style={styles.taskRow}>
              <View style={styles.taskRowTop}>
                <Text style={styles.taskRowStatus}>{taskRowStatusLabel(row)}</Text>
              </View>
              <Text style={styles.taskRowPhrase}>{row.phrase}</Text>
              {row.summary ? (
                <Text style={styles.taskRowSummary}>{row.summary}</Text>
              ) : null}
              {row.errorMessage ? (
                <Text style={styles.taskRowError}>{row.errorMessage}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {segment.status === 'done_note' &&
      (!segment.taskRows || segment.taskRows.length === 0) ? (
        <Text style={styles.transcriptHint}>
          No actionable tasks in this segment.
        </Text>
      ) : null}
      {segment.status === 'done' && segment.taskSummary ? (
        <Text style={styles.transcriptSummary}>{segment.taskSummary}</Text>
      ) : null}
      {segment.status === 'failed' ? (
        <Text style={styles.transcriptError}>
          {segment.errorMessage ?? 'Something went wrong.'}
        </Text>
      ) : null}
    </View>
  );
}

async function ensureAndroidMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone access',
      message:
        'Eve Cal needs the microphone to record your voice capture. You can change this anytime in Settings.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const [pathCategory, setPathCategory] =
    React.useState<CaptureCategoryIntent | null>(null);
  const [sessionActive, setSessionActive] = React.useState(false);
  const [isRecordingSegment, setIsRecordingSegment] = React.useState(false);
  const [segmentSecs, setSegmentSecs] = React.useState(0);
  const [warmAlert, setWarmAlert] = React.useState<{
    title: string;
    message: string;
  } | null>(null);
  const [segments, setSegments] = React.useState<CaptureSegment[]>([]);

  const sessionActiveRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const flushingRef = React.useRef(false);
  const phaseRef = React.useRef<'listening' | 'recording'>('listening');
  /** Recording: wall-clock pause uses this only after a loud frame (> LISTEN_SPEECH_DB). 0 = not set yet. */
  const lastLoudAtRef = React.useRef(0);
  const hadSpeechInSegmentRef = React.useRef(false);
  const speechStreakRef = React.useRef(0);
  const pathCategoryRef = React.useRef<CaptureCategoryIntent | null>(null);
  const recordBackRef = React.useRef<(e: RecordBackType) => void>(() => {});
  /** Set when segment recording starts; cleared when finalize completes or discards junk. */
  const activeRecordingSegmentIdRef = React.useRef<string | null>(null);
  /** When db first went below RECORDING_QUIET_DB (after grace); null if not in a quiet run. */
  const sustainedQuietSinceRef = React.useRef<number | null>(null);
  const lastRecordingPositionMsRef = React.useRef(0);

  React.useEffect(() => {
    pathCategoryRef.current = pathCategory;
  }, [pathCategory]);

  React.useEffect(() => {
    sessionActiveRef.current = sessionActive;
  }, [sessionActive]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      const ar = tryLoadAudioRecorder();
      if (!ar) {
        return;
      }
      sessionActiveRef.current = false;
      ar.removeRecordBackListener();
      void ar.stopRecorder().catch(() => {});
    };
  }, []);

  const dismissCategory = () => setPathCategory(null);

  const removeSegment = React.useCallback((id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  }, []);

  const enqueueSegmentPipeline = React.useCallback(
    (segmentId: string, filePath: string) => {
      void runSegmentPipeline({
        segmentId,
        filePath,
        mounted: () => mountedRef.current,
        setSegments,
      });
    },
    [],
  );

  const attachRecorderListener = React.useCallback((ar: ReturnType<typeof tryLoadAudioRecorder>) => {
    if (!ar) {
      return;
    }
    ar.removeRecordBackListener();
    ar.setSubscriptionDuration(0.25);
    ar.addRecordBackListener(e => recordBackRef.current(e));
  }, []);

  const startListenRecorder = React.useCallback(
    async (ar: NonNullable<ReturnType<typeof tryLoadAudioRecorder>>) => {
      attachRecorderListener(ar);
      if (Platform.OS === 'ios') {
        await new Promise<void>(r => setTimeout(r, 80));
      }
      await ar.startRecorder(
        listenRecorderPath(),
        VOICE_CAPTURE_AUDIO_SET,
        true,
      );
    },
    [attachRecorderListener],
  );

  const startSegmentRecorder = React.useCallback(
    async (
      ar: NonNullable<ReturnType<typeof tryLoadAudioRecorder>>,
      outputPath: string,
    ) => {
      attachRecorderListener(ar);
      if (Platform.OS === 'ios') {
        await new Promise<void>(r => setTimeout(r, 80));
      }
      await ar.startRecorder(outputPath, VOICE_CAPTURE_AUDIO_SET, true);
    },
    [attachRecorderListener],
  );

  const transitionListenToRecording = React.useCallback(async () => {
    if (flushingRef.current || phaseRef.current !== 'listening') {
      return;
    }
    const ar = tryLoadAudioRecorder();
    if (!ar || !sessionActiveRef.current || !mountedRef.current) {
      return;
    }
    flushingRef.current = true;
    try {
      try {
        await ar.pauseRecorder();
      } catch {
        /* */
      }
      try {
        await ar.stopRecorder();
      } catch {
        /* */
      }
      ar.removeRecordBackListener();
      await unlinkListenScratch();

      const segmentId = newCaptureSegmentId();
      activeRecordingSegmentIdRef.current = segmentId;
      sustainedQuietSinceRef.current = null;
      lastRecordingPositionMsRef.current = 0;
      hadSpeechInSegmentRef.current = false;
      lastLoudAtRef.current = 0;
      speechStreakRef.current = 0;
      phaseRef.current = 'recording';
      setIsRecordingSegment(true);
      setSegmentSecs(0);
      await startSegmentRecorder(ar, segmentRecordingPath(segmentId));
    } catch (e) {
      void e;
      activeRecordingSegmentIdRef.current = null;
      sustainedQuietSinceRef.current = null;
      sessionActiveRef.current = false;
      setSessionActive(false);
      setIsRecordingSegment(false);
    } finally {
      flushingRef.current = false;
    }
  }, [startSegmentRecorder]);

  const finalizeSegmentAndResumeListen = React.useCallback(async () => {
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      setSessionActive(false);
      setIsRecordingSegment(false);
      activeRecordingSegmentIdRef.current = null;
      return;
    }
    if (flushingRef.current) {
      return;
    }
    if (phaseRef.current !== 'recording') {
      return;
    }
    flushingRef.current = true;
    try {
      const segmentId = activeRecordingSegmentIdRef.current;
      const hadAudio = hadSpeechInSegmentRef.current;
      const durationMs = lastRecordingPositionMsRef.current;

      try {
        await ar.pauseRecorder();
      } catch {
        /* */
      }
      let rawPath = '';
      try {
        rawPath = await ar.stopRecorder();
      } catch (e) {
        void e;
      }
      ar.removeRecordBackListener();
      activeRecordingSegmentIdRef.current = null;
      sustainedQuietSinceRef.current = null;

      const resume = sessionActiveRef.current && mountedRef.current;
      const resumeListening = async (): Promise<boolean> => {
        if (!resume) {
          setSessionActive(false);
          setIsRecordingSegment(false);
          phaseRef.current = 'listening';
          return false;
        }
        phaseRef.current = 'listening';
        setIsRecordingSegment(false);
        setSegmentSecs(0);
        hadSpeechInSegmentRef.current = false;
        speechStreakRef.current = 0;
        lastLoudAtRef.current = Date.now();
        lastRecordingPositionMsRef.current = 0;
        try {
          await startListenRecorder(ar);
          return true;
        } catch (e) {
          void e;
          sessionActiveRef.current = false;
          setSessionActive(false);
          setIsRecordingSegment(false);
          setWarmAlert({
            title: 'Microphone error',
            message: recordingFailureMessage(
              e instanceof Error ? e.message : String(e),
            ),
          });
          return false;
        }
      };

      const junkSegment =
        !segmentId || !hadAudio || durationMs < MIN_SEGMENT_MS;

      if (junkSegment) {
        if (segmentId) {
          await unlinkSegmentRecording(segmentId);
        }
        await resumeListening();
        return;
      }

      const categoryTitle = pathCategoryRef.current?.categoryTitle;
      setSegments(prev => [
        {
          id: segmentId,
          createdAt: Date.now(),
          categoryTitle,
          status: 'transcribing',
          fullText: '',
        },
        ...prev,
      ]);

      const hadPath =
        !!rawPath &&
        rawPath !== 'Already stopped' &&
        !rawPath.toLowerCase().includes('already');
      const snapshotPath = hadPath
        ? await snapshotToSegmentFile(segmentId, rawPath)
        : null;

      let listenOk = false;
      if (resume) {
        listenOk = await resumeListening();
      } else {
        setSessionActive(false);
        setIsRecordingSegment(false);
        phaseRef.current = 'listening';
      }

      if (snapshotPath) {
        void enqueueSegmentPipeline(segmentId, snapshotPath);
      } else {
        const errMsg = hadPath
          ? 'Could not save audio.'
          : 'No audio captured.';
        setSegments(prev =>
          prev.map(s =>
            s.id === segmentId
              ? { ...s, status: 'failed', errorMessage: errMsg, fullText: '' }
              : s,
          ),
        );
      }

      if (resume && !listenOk) {
        /* already surfaced */
      }
    } finally {
      flushingRef.current = false;
    }
  }, [enqueueSegmentPipeline, startListenRecorder]);

  const rotateListenScratch = React.useCallback(async () => {
    if (flushingRef.current || phaseRef.current !== 'listening') {
      return;
    }
    const ar = tryLoadAudioRecorder();
    if (!ar || !sessionActiveRef.current || !mountedRef.current) {
      return;
    }
    flushingRef.current = true;
    try {
      try {
        await ar.pauseRecorder();
      } catch {
        /* */
      }
      try {
        await ar.stopRecorder();
      } catch {
        /* */
      }
      ar.removeRecordBackListener();
      speechStreakRef.current = 0;
      await startListenRecorder(ar);
    } catch (e) {
      void e;
    } finally {
      flushingRef.current = false;
    }
  }, [startListenRecorder]);

  const onRecordBack = React.useCallback(
    (e: RecordBackType) => {
      const pos = e.currentPosition ?? 0;

      if (!sessionActiveRef.current || flushingRef.current) {
        return;
      }

      if (phaseRef.current === 'listening') {
        const dbListen =
          typeof e.currentMetering === 'number' &&
          Number.isFinite(e.currentMetering)
            ? e.currentMetering
            : -160;
        setSegmentSecs(0);
        if (pos >= MAX_LISTENING_FILE_MS) {
          void rotateListenScratch();
          return;
        }
        if (dbListen > LISTEN_SPEECH_DB) {
          speechStreakRef.current += 1;
        } else {
          speechStreakRef.current = 0;
        }
        if (speechStreakRef.current >= SPEECH_ONSET_STREAK_TICKS) {
          void transitionListenToRecording();
        }
        return;
      }

      const segMs = pos;
      lastRecordingPositionMsRef.current = segMs;
      setSegmentSecs(segMs / 1000);

      if (segMs >= MAX_SEGMENT_MS && phaseRef.current === 'recording') {
        void finalizeSegmentAndResumeListen();
        return;
      }

      const rawMeter = e.currentMetering;
      const meteringOk =
        typeof rawMeter === 'number' && Number.isFinite(rawMeter);
      if (!meteringOk) {
        return;
      }
      const meterDb = rawMeter;

      if (meterDb > LISTEN_SPEECH_DB) {
        sustainedQuietSinceRef.current = null;
        lastLoudAtRef.current = Date.now();
      }
      if (meterDb > RECORDING_SPEECH_RESET_DB) {
        hadSpeechInSegmentRef.current = true;
      }

      if (segMs < GRACE_AFTER_SEGMENT_START_MS) {
        sustainedQuietSinceRef.current = null;
        return;
      }

      if (meterDb < RECORDING_QUIET_DB) {
        if (sustainedQuietSinceRef.current === null) {
          sustainedQuietSinceRef.current = Date.now();
        }
      } else {
        sustainedQuietSinceRef.current = null;
      }

      const quietMs =
        sustainedQuietSinceRef.current !== null
          ? Date.now() - sustainedQuietSinceRef.current
          : 0;
      const wallSinceLoudMs =
        lastLoudAtRef.current > 0
          ? Date.now() - lastLoudAtRef.current
          : 0;

      if (!hadSpeechInSegmentRef.current) {
        if (quietMs >= DEAD_AIR_WITHOUT_SPEECH_MS) {
          void finalizeSegmentAndResumeListen();
        }
        return;
      }

      if (segMs < MIN_SEGMENT_MS) {
        return;
      }

      const pauseDone =
        quietMs >= PAUSE_TO_FINALIZE_MS ||
        (lastLoudAtRef.current > 0 &&
          wallSinceLoudMs >= PAUSE_TO_FINALIZE_MS);

      if (pauseDone) {
        void finalizeSegmentAndResumeListen();
      }
    },
    [
      transitionListenToRecording,
      finalizeSegmentAndResumeListen,
      rotateListenScratch,
    ],
  );

  React.useEffect(() => {
    recordBackRef.current = onRecordBack;
  }, [onRecordBack]);

  const endSession = React.useCallback(async () => {
    sessionActiveRef.current = false;
    setSessionActive(false);
    setIsRecordingSegment(false);
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      phaseRef.current = 'listening';
      return;
    }
    const wasRecording = phaseRef.current === 'recording';
    if (wasRecording) {
      await finalizeSegmentAndResumeListen();
    } else {
      try {
        ar.removeRecordBackListener();
        try {
          await ar.pauseRecorder();
        } catch {
          /* */
        }
        await ar.stopRecorder();
      } catch {
        /* */
      }
      await unlinkListenScratch();
    }
    phaseRef.current = 'listening';
  }, [finalizeSegmentAndResumeListen]);

  const startSession = React.useCallback(async () => {
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      setWarmAlert({
        title: 'Voice capture unavailable',
        message: NATIVE_AUDIO_SETUP_HINT,
      });
      return;
    }
    if (!(await ensureAndroidMicPermission())) {
      setWarmAlert({
        title: 'Microphone off',
        message:
          'Allow microphone access in Settings to record a voice capture.',
      });
      return;
    }
    try {
      sessionActiveRef.current = true;
      flushingRef.current = false;
      phaseRef.current = 'listening';
      speechStreakRef.current = 0;
      hadSpeechInSegmentRef.current = false;
      lastLoudAtRef.current = Date.now();
      if (Platform.OS === 'ios') {
        await new Promise<void>(r => setTimeout(r, 180));
      }
      await startListenRecorder(ar);
      setSessionActive(true);
      setIsRecordingSegment(false);
      setSegmentSecs(0);
    } catch (e) {
      ar.removeRecordBackListener();
      sessionActiveRef.current = false;
      setSessionActive(false);
      setWarmAlert({
        title: 'Could not start',
        message: recordingFailureMessage(
          e instanceof Error ? e.message : String(e),
        ),
      });
    }
  }, [startListenRecorder]);

  useFocusEffect(
    React.useCallback(() => {
      const next = consumeCaptureCategoryIntent();
      if (next) {
        setPathCategory(next);
      } else {
        setPathCategory(null);
      }
      return () => {
        if (!sessionActiveRef.current) {
          return;
        }
        void endSession();
      };
    }, [endSession]),
  );

  const pulse1 = React.useRef(new Animated.Value(0)).current;
  const pulse2 = React.useRef(new Animated.Value(0)).current;
  const breathe = React.useRef(new Animated.Value(1)).current;
  const dotOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!isRecordingSegment) {
      pulse1.setValue(0);
      pulse2.setValue(0);
      breathe.setValue(1);
      dotOpacity.setValue(1);
      return;
    }
    const ringDuration = 1600;
    const makeRingLoop = (v: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: ringDuration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    const ringA = makeRingLoop(pulse1);
    const ringB = makeRingLoop(pulse2);
    const ringBStartTimer = setTimeout(() => ringB.start(), ringDuration / 2);
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const dotBlink = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          toValue: 0.35,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    ringA.start();
    breathLoop.start();
    dotBlink.start();
    return () => {
      clearTimeout(ringBStartTimer);
      ringA.stop();
      ringB.stop();
      breathLoop.stop();
      dotBlink.stop();
    };
  }, [isRecordingSegment, pulse1, pulse2, breathe, dotOpacity]);

  const iconName =
    pathCategory?.icon ||
    (pathCategory
      ? ICON_FALLBACK[pathCategory.categoryId] ?? 'map'
      : 'map');
  const timeLabel = formatDurationMmSs(segmentSecs);
  const accent = pathCategory?.tint ?? EveCalTheme.colors.textMuted;
  const ring1Scale = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.15],
  });
  const ring1Opacity = pulse1.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0, 0.4, 0],
  });
  const ring2Scale = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.15],
  });
  const ring2Opacity = pulse2.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0, 0.35, 0],
  });

  return (
    <View style={styles.root}>
      <WarmAlertDialog
        visible={warmAlert != null}
        title={warmAlert?.title ?? ''}
        message={warmAlert?.message ?? ''}
        onDismiss={() => setWarmAlert(null)}
      />
      <TopHeader />

      {pathCategory ? (
        <View
          style={[
            styles.glassOuter,
            Platform.OS === 'android' ? styles.glassOuterAndroid : null,
          ]}>
          <View
            style={[
              styles.glassInner,
              Platform.OS === 'android' ? styles.glassInnerAndroid : null,
            ]}>
            <View style={styles.bannerRow}>
              <View
                style={[
                  styles.iconChip,
                  { backgroundColor: pathCategory.tint },
                ]}>
                <Feather name={iconName} size={20} color="#fff" />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.categoryKicker}>{pathCategory.kicker}</Text>
                <Text style={styles.categoryTitle}>
                  {pathCategory.categoryTitle}
                </Text>
                <Text style={styles.categoryHint}>
                  Your capture will be linked to this path category.
                </Text>
              </View>
              <Pressable
                onPress={dismissCategory}
                hitSlop={12}
                style={styles.closeBtn}
                android_ripple={null}
                accessibilityRole="button"
                accessibilityLabel="Dismiss category">
                <Feather name="x" size={22} color="rgba(58,45,42,0.45)" />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.center,
          { paddingBottom: Math.max(20, insets.bottom + 12) },
        ]}>
        <View style={styles.mainColumn}>
          <Text style={styles.greeting}>Good Morning, Eve</Text>
          <Text style={styles.prompt}>Release what's on your mind</Text>

          <View style={styles.micStage}>
            {sessionActive && isRecordingSegment ? (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: ring1Scale }],
                      opacity: ring1Opacity,
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: ring2Scale }],
                      opacity: ring2Opacity,
                    },
                  ]}
                />
              </>
            ) : null}

            {sessionActive ? (
              <Animated.View
                style={[
                  styles.micWrap,
                  isRecordingSegment
                    ? { transform: [{ scale: breathe }] }
                    : undefined,
                ]}>
                <View
                  style={[
                    styles.micCircle,
                    isRecordingSegment
                      ? {
                          borderColor: REC_BLUE.ringBorder,
                          backgroundColor: REC_BLUE.micFill,
                        }
                      : {
                          borderColor: 'rgba(91, 140, 200, 0.38)',
                          backgroundColor: 'rgba(255,255,255,0.88)',
                        },
                  ]}>
                  <Feather
                    name="mic"
                    size={30}
                    color={
                      isRecordingSegment
                        ? REC_BLUE.micIcon
                        : 'rgba(75, 122, 166, 0.75)'
                    }
                  />
                </View>
              </Animated.View>
            ) : (
              <Pressable
                style={styles.micWrap}
                onPress={startSession}
                accessibilityRole="button"
                accessibilityLabel="Start capture session">
                <View style={styles.micCircle}>
                  <Feather name="mic" size={30} color={accent} />
                </View>
              </Pressable>
            )}
          </View>

          {sessionActive && isRecordingSegment ? (
            <View style={styles.recordingRow}>
              <Animated.View
                style={[styles.recDot, { opacity: dotOpacity }]}
              />
              <Text style={styles.recordingLabel}>Recording · {timeLabel}</Text>
            </View>
          ) : sessionActive ? (
            <Text style={styles.listeningLabel}>
              Listening — VAD only, speak to record a segment
            </Text>
          ) : (
            <Text style={styles.tap}>Tap the mic to start</Text>
          )}

          {sessionActive ? (
            <Text style={styles.sessionHint}>
              {isRecordingSegment
                ? 'Pause 1.5–2s to end this segment. Transcription and tasks run in parallel — you can speak again right away.'
                : 'The segment recorder stays off until we detect speech. Then we capture until you pause.'}
            </Text>
          ) : null}

          {sessionActive ? (
            <Pressable
              onPress={() => void endSession()}
              style={({ pressed }) => [
                styles.stopBtn,
                pressed && styles.stopBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="End session">
              <Feather name="square" size={18} color="#fff" />
              <Text style={styles.stopBtnText}>End session</Text>
            </Pressable>
          ) : null}
        </View>

        {segments.length > 0 ? (
          <View style={styles.transcriptSection}>
            <View style={styles.transcriptHeader}>
              <Text style={styles.transcriptTitle}>Segments</Text>
              <Text style={styles.transcriptCount}>{segments.length}</Text>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.transcriptList}>
              {segments.map(seg => (
                <SegmentCard
                  key={seg.id}
                  segment={seg}
                  onDismiss={removeSegment}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: EveCalTheme.colors.bg,
  },
  glassOuter: {
    marginHorizontal: 18,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#3A2D2A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  glassInner: {
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  glassOuterAndroid: {
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  glassInnerAndroid: {
    borderWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 10,
    gap: 14,
  },
  iconChip: {
    width: 56,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  closeBtn: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58,45,42,0.05)',
    marginTop: -2,
  },
  categoryKicker: {
    fontSize: 9,
    letterSpacing: 2.2,
    color: 'rgba(58,45,42,0.38)',
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
    marginBottom: 6,
  },
  categoryHint: {
    fontSize: 12,
    color: EveCalTheme.colors.textMuted,
    lineHeight: 17,
  },
  center: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainColumn: {
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: 8,
  },
  greeting: {
    fontSize: 34,
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  prompt: {
    color: EveCalTheme.colors.textMuted,
    marginBottom: 26,
  },
  micStage: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: REC_BLUE.ringBorder,
    backgroundColor: 'transparent',
  },
  micWrap: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  micCircle: {
    height: 120,
    width: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: EveCalTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tap: {
    marginTop: 18,
    color: EveCalTheme.colors.textMuted,
  },
  listeningLabel: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(75, 122, 166, 0.82)',
    letterSpacing: 0.15,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  sessionHint: {
    marginTop: 12,
    fontSize: 12,
    color: EveCalTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 320,
    paddingHorizontal: 8,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: REC_BLUE.dot,
  },
  recordingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: REC_BLUE.label,
    letterSpacing: 0.2,
  },
  stopBtn: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 220,
    borderRadius: 999,
    backgroundColor: REC_BLUE.stopBg,
    shadowColor: REC_BLUE.stopShadow,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  stopBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  transcriptSection: {
    width: '100%',
    flex: 1,
    flexGrow: 1,
    marginTop: 20,
    minHeight: 0,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  transcriptTitle: {
    fontSize: 18,
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
  },
  transcriptCount: {
    minWidth: 28,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(75,122,166,0.12)',
    color: EveCalTheme.colors.accent2,
    fontWeight: '700',
  },
  transcriptList: {
    paddingBottom: 16,
    gap: 14,
  },
  transcriptCard: {
    width: '100%',
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
  },
  transcriptCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  transcriptCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transcriptStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  transcriptStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  transcriptTime: {
    color: EveCalTheme.colors.textMuted,
    fontSize: 12,
  },
  transcriptDismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58,45,42,0.06)',
  },
  transcriptCategory: {
    color: EveCalTheme.colors.accent2,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  transcriptBody: {
    color: EveCalTheme.colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  transcriptHint: {
    marginTop: 8,
    fontSize: 12,
    color: EveCalTheme.colors.textMuted,
    fontStyle: 'italic',
  },
  transcriptSummary: {
    marginTop: 10,
    fontSize: 13,
    color: EveCalTheme.colors.accent2,
    lineHeight: 18,
  },
  transcriptError: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(183, 92, 72, 0.96)',
    lineHeight: 18,
  },
  taskRows: {
    marginTop: 12,
    gap: 10,
  },
  taskRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(75,122,166,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.06)',
  },
  taskRowTop: {
    marginBottom: 6,
  },
  taskRowStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(75, 122, 166, 0.9)',
    letterSpacing: 0.3,
  },
  taskRowPhrase: {
    fontSize: 14,
    color: EveCalTheme.colors.text,
    lineHeight: 19,
  },
  taskRowSummary: {
    marginTop: 6,
    fontSize: 12,
    color: EveCalTheme.colors.accent2,
    lineHeight: 17,
  },
  taskRowError: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(183, 92, 72, 0.96)',
    lineHeight: 16,
  },
});
