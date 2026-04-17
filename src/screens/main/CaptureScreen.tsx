// @refresh reset
/**
 * Capture: parallel capture + process
 * - Listening: VAD-only scratch file (evecal_listen.m4a), never transcribed.
 * - Recording: DEFAULT segment file after speech onset; pause → snapshot → async transcribe + optional task.
 * - Processing never awaits before resuming listening.
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
import RNFS from 'react-native-fs';
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
import { transcribeCaptureSegmentWithGemini } from '../../lib/speech/transcribeWithGemini';
import { classifyTaskText } from '../../lib/tasks/classifyTask';
import { evaluateCaptureTaskIntent } from '../../lib/tasks/evaluateCaptureTaskIntent';
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

const SILENCE_DB_THRESHOLD = -48;
const PAUSE_TO_FINALIZE_MS = 1750;
const MIN_SEGMENT_MS = 400;
const MAX_SEGMENT_MS = 120_000;
const SPEECH_ONSET_STREAK_TICKS = 2;
const MAX_LISTENING_FILE_MS = 45_000;

const LISTEN_SCRATCH_BASENAME = 'evecal_listen.m4a';

function listenRecorderPath(): string {
  return Platform.OS === 'android'
    ? `${RNFS.CachesDirectoryPath}/${LISTEN_SCRATCH_BASENAME}`
    : LISTEN_SCRATCH_BASENAME;
}

function listenScratchFsPath(): string {
  return `${RNFS.CachesDirectoryPath}/${LISTEN_SCRATCH_BASENAME}`;
}

type SegmentStatus =
  | 'transcribing'
  | 'evaluating'
  | 'done'
  | 'done_note'
  | 'failed';

type Segment = {
  id: string;
  createdAt: number;
  categoryTitle?: string;
  status: SegmentStatus;
  fullText: string;
  taskSummary?: string;
  errorMessage?: string;
};

function statusLabel(s: SegmentStatus): string {
  switch (s) {
    case 'transcribing':
      return 'Transcribing';
    case 'evaluating':
      return 'Task check';
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
    case 'evaluating':
      return 'rgba(120, 100, 180, 0.92)';
    case 'done':
      return 'rgba(47, 141, 119, 0.95)';
    case 'done_note':
      return 'rgba(100, 120, 140, 0.92)';
    case 'failed':
      return 'rgba(183, 92, 72, 0.95)';
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
  segment: Segment;
  onDismiss: (id: string) => void;
}) {
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
          {segment.status === 'done' || segment.status === 'done_note' ? (
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
      {(segment.status === 'evaluating' ||
        segment.status === 'done' ||
        segment.status === 'done_note') &&
      segment.fullText ? (
        <Text style={styles.transcriptBody}>{segment.fullText}</Text>
      ) : null}
      {segment.status === 'evaluating' ? (
        <Text style={styles.transcriptHint}>Checking for an actionable task…</Text>
      ) : null}
      {segment.status === 'done_note' ? (
        <Text style={styles.transcriptHint}>
          No task created — not actionable as a to-do.
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

function recordingFailureMessage(nativeDetail: string): string {
  const base =
    'Something went wrong starting the microphone. Try again in a moment.';
  const hints: string[] = [];
  if (
    nativeDetail.includes('3 attempts') ||
    nativeDetail.toLowerCase().includes('microphone')
  ) {
    hints.push(
      '• iOS Simulator often cannot record audio — use a physical iPhone to test recording.',
    );
    hints.push(
      '• On a real device: Settings → Eve Cal → Microphone → allow, then reopen the app.',
    );
  }
  if (nativeDetail.includes('permission denied')) {
    hints.length = 0;
    hints.push(
      'Microphone access was denied. Enable it in Settings → Eve Cal → Microphone.',
    );
  }
  if (hints.length === 0) {
    return `${base}\n\n${nativeDetail}`;
  }
  return `${base}\n\n${hints.join('\n')}`;
}

function recorderPathToFsPath(uri: string): string {
  const u = uri.trim();
  if (u.startsWith('content://')) {
    return u;
  }
  return u.replace(/^file:(\/)+/, '/');
}

async function snapshotToSegmentFile(
  segmentId: string,
  rawPath: string,
): Promise<string | null> {
  if (
    !rawPath ||
    rawPath === 'Already stopped' ||
    rawPath.toLowerCase().includes('already')
  ) {
    return null;
  }
  const src = recorderPathToFsPath(rawPath);
  const dest = `${RNFS.CachesDirectoryPath}/evecal_cap_${segmentId}.m4a`;
  try {
    await RNFS.copyFile(src, dest);
    return dest;
  } catch (e) {
    console.warn('snapshotToSegmentFile', e);
    return null;
  }
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
  const [segments, setSegments] = React.useState<Segment[]>([]);

  const sessionActiveRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const flushingRef = React.useRef(false);
  const phaseRef = React.useRef<'listening' | 'recording'>('listening');
  const lastLoudAtRef = React.useRef(0);
  const hadSpeechInSegmentRef = React.useRef(false);
  const speechStreakRef = React.useRef(0);
  const pathCategoryRef = React.useRef<CaptureCategoryIntent | null>(null);
  const recordBackRef = React.useRef<(e: RecordBackType) => void>(() => {});

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

  /** Async pipeline: never block capture. */
  const runProcessPipeline = React.useCallback(
    async (segmentId: string, filePath: string) => {
      const tr = await transcribeCaptureSegmentWithGemini(filePath);
      if (!mountedRef.current) {
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
            ? { ...s, fullText: text, status: 'evaluating' }
            : s,
        ),
      );

      const decision = await evaluateCaptureTaskIntent(text);
      if (!mountedRef.current) {
        return;
      }

      if (decision.isTask) {
        const result = await classifyTaskText(text, {
          captureTask: decision.payload,
        });
        if (!mountedRef.current) {
          return;
        }
        setSegments(prev =>
          prev.map(s =>
            s.id === segmentId
              ? {
                  ...s,
                  status: result.ok ? 'done' : 'failed',
                  taskSummary: result.ok ? result.summary : undefined,
                  errorMessage: result.ok ? undefined : result.message,
                }
              : s,
          ),
        );
      } else {
        setSegments(prev =>
          prev.map(s =>
            s.id === segmentId ? { ...s, status: 'done_note' } : s,
          ),
        );
      }
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
    async (ar: NonNullable<ReturnType<typeof tryLoadAudioRecorder>>) => {
      attachRecorderListener(ar);
      if (Platform.OS === 'ios') {
        await new Promise<void>(r => setTimeout(r, 80));
      }
      await ar.startRecorder(undefined, VOICE_CAPTURE_AUDIO_SET, true);
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
      try {
        await RNFS.unlink(listenScratchFsPath());
      } catch {
        /* */
      }
      phaseRef.current = 'recording';
      hadSpeechInSegmentRef.current = true;
      lastLoudAtRef.current = Date.now();
      speechStreakRef.current = 0;
      setIsRecordingSegment(true);
      setSegmentSecs(0);
      await startSegmentRecorder(ar);
    } catch (e) {
      console.warn('transitionListenToRecording', e);
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
      return;
    }
    if (flushingRef.current) {
      return;
    }
    flushingRef.current = true;
    try {
      try {
        await ar.pauseRecorder();
      } catch {
        /* */
      }
      let rawPath = '';
      try {
        rawPath = await ar.stopRecorder();
      } catch (e) {
        console.warn('stopRecorder', e);
      }
      ar.removeRecordBackListener();

      const segmentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

      const resume = sessionActiveRef.current && mountedRef.current;
      let listenOk = false;
      if (resume) {
        phaseRef.current = 'listening';
        setIsRecordingSegment(false);
        setSegmentSecs(0);
        hadSpeechInSegmentRef.current = false;
        speechStreakRef.current = 0;
        lastLoudAtRef.current = Date.now();
        try {
          await startListenRecorder(ar);
          listenOk = true;
        } catch (e) {
          console.warn('resume listen', e);
          sessionActiveRef.current = false;
          setSessionActive(false);
          setIsRecordingSegment(false);
          setWarmAlert({
            title: 'Microphone error',
            message: recordingFailureMessage(
              e instanceof Error ? e.message : String(e),
            ),
          });
        }
      } else {
        setSessionActive(false);
        setIsRecordingSegment(false);
        phaseRef.current = 'listening';
      }

      if (snapshotPath) {
        void runProcessPipeline(segmentId, snapshotPath);
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
  }, [runProcessPipeline, startListenRecorder]);

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
      console.warn('rotateListenScratch', e);
    } finally {
      flushingRef.current = false;
    }
  }, [startListenRecorder]);

  const onRecordBack = React.useCallback(
    (e: RecordBackType) => {
      const pos = e.currentPosition ?? 0;
      const db = typeof e.currentMetering === 'number' ? e.currentMetering : -160;

      if (!sessionActiveRef.current || flushingRef.current) {
        return;
      }

      if (phaseRef.current === 'listening') {
        setSegmentSecs(0);
        if (pos >= MAX_LISTENING_FILE_MS) {
          void rotateListenScratch();
          return;
        }
        if (db > SILENCE_DB_THRESHOLD) {
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
      setSegmentSecs(segMs / 1000);
      if (db > SILENCE_DB_THRESHOLD) {
        lastLoudAtRef.current = Date.now();
        hadSpeechInSegmentRef.current = true;
      }
      if (!hadSpeechInSegmentRef.current || segMs < MIN_SEGMENT_MS) {
        return;
      }
      const silentFor = Date.now() - lastLoudAtRef.current;
      if (
        (silentFor >= PAUSE_TO_FINALIZE_MS || segMs >= MAX_SEGMENT_MS) &&
        phaseRef.current === 'recording'
      ) {
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
      try {
        await RNFS.unlink(listenScratchFsPath());
      } catch {
        /* */
      }
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
});
