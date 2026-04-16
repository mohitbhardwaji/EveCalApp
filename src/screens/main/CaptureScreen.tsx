// @refresh reset
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
import { VoiceTranscriptReviewModal } from '../../components/capture/VoiceTranscriptReviewModal';
import { WarmAlertDialog } from '../../components/WarmAlertDialog';
import {
  formatDurationMmSs,
  NATIVE_AUDIO_SETUP_HINT,
  tryLoadAudioRecorder,
} from '../../native/audioRecorderPlayer';
import { VOICE_CAPTURE_AUDIO_SET } from '../../native/recordingAudioSet';
import { EveCalTheme } from '../../theme/theme';
import { TopHeader } from '../../components/TopHeader';
import { transcribeAudioWithGemini } from '../../lib/speech/transcribeWithGemini';
import { classifyTaskText } from '../../lib/tasks/classifyTask';
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

/** Pulse rings, mic state, label, and stop CTA while recording (blue vs red “live”) */
const REC_BLUE = {
  ringBorder: 'rgba(91, 140, 200, 0.55)',
  micFill: 'rgba(230, 242, 252, 0.94)',
  micIcon: 'rgba(55, 105, 165, 0.96)',
  label: 'rgba(55, 95, 145, 0.96)',
  dot: 'rgba(75, 130, 195, 0.95)',
  stopBg: 'rgba(65, 115, 175, 0.96)',
  stopShadow: 'rgba(55, 100, 160, 0.42)',
};

type QueuedCaptureTask = {
  id: string;
  text: string;
  createdAt: number;
  categoryTitle?: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
};

function taskStatusCopy(status: QueuedCaptureTask['status']): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'processing':
      return 'Processing';
    case 'done':
      return 'Processed';
    case 'failed':
      return 'Failed';
  }
}

function taskStatusColor(status: QueuedCaptureTask['status']): string {
  switch (status) {
    case 'queued':
      return 'rgba(75, 122, 166, 0.95)';
    case 'processing':
      return 'rgba(47, 141, 119, 0.95)';
    case 'done':
      return 'rgba(47, 141, 119, 0.95)';
    case 'failed':
      return 'rgba(183, 92, 72, 0.95)';
  }
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
    hints.push(
      '• Quit Music, FaceTime, or other apps that might be using the microphone.',
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
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordSecs, setRecordSecs] = React.useState(0);
  const [warmAlert, setWarmAlert] = React.useState<{
    title: string;
    message: string;
  } | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewLoading, setReviewLoading] = React.useState(false);
  const [reviewError, setReviewError] = React.useState<string | null>(null);
  const [reviewText, setReviewText] = React.useState('');
  const [queuedTasks, setQueuedTasks] = React.useState<QueuedCaptureTask[]>([]);

  const isRecordingRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const activeProcessingIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
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
      ar.removeRecordBackListener();
      void ar.stopRecorder().catch(() => {});
    };
  }, []);

  const dismissCategory = () => {
    setPathCategory(null);
  };

  const removeQueuedTask = React.useCallback((taskId: string) => {
    setQueuedTasks(current => current.filter(task => task.id !== taskId));
  }, []);

  const stopRecording = React.useCallback(async () => {
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      setIsRecording(false);
      setRecordSecs(0);
      return;
    }
    try {
      const path = await ar.stopRecorder();
      ar.removeRecordBackListener();
      setIsRecording(false);
      setRecordSecs(0);
      if (path) {
        setReviewText('');
        setReviewError(null);
        setReviewOpen(true);
        setReviewLoading(true);
        const result = await transcribeAudioWithGemini(path);
        if (!mountedRef.current) {
          return;
        }
        if (result.ok) {
          setReviewText(result.text);
          setReviewError(null);
        } else {
          setReviewError(result.message);
        }
        setReviewLoading(false);
      }
    } catch (e) {
      console.warn('stopRecorder', e);
      ar.removeRecordBackListener();
      setIsRecording(false);
      setRecordSecs(0);
    }
  }, []);

  const closeReview = React.useCallback(() => {
    setReviewOpen(false);
    setReviewLoading(false);
    setReviewError(null);
    setReviewText('');
  }, []);

  const processQueuedTask = React.useCallback(async (task: QueuedCaptureTask) => {
    activeProcessingIdRef.current = task.id;
    setQueuedTasks(current =>
      current.map(item =>
        item.id === task.id ? { ...item, status: 'processing' } : item,
      ),
    );

    const result = await classifyTaskText(task.text);
    if (!mountedRef.current) {
      return;
    }

    activeProcessingIdRef.current = null;
    setQueuedTasks(current =>
      current.map(item =>
        item.id === task.id
          ? { ...item, status: result.ok ? 'done' : 'failed' }
          : item,
      ),
    );
    setWarmAlert({
      title: result.ok ? 'Task processed' : 'Task processing failed',
      message: result.ok
        ? 'Your task has been processed successfully.'
        : 'We could not process your task right now. Please try again.',
    });
  }, []);

  React.useEffect(() => {
    if (activeProcessingIdRef.current) {
      return;
    }
    const next = queuedTasks.find(task => task.status === 'queued');
    if (!next) {
      return;
    }
    void processQueuedTask(next);
  }, [processQueuedTask, queuedTasks]);

  const submitReview = React.useCallback(() => {
    const t = reviewText.trim();
    if (!t) {
      setWarmAlert({
        title: 'Add something to submit',
        message:
          'Type a note or wait for transcription. You can also close and record again.',
      });
      return;
    }
    setWarmAlert({
      title: 'Task is being processed',
      message:
        'Your task is being processed and will be added shortly. We will notify you once it is ready.',
    });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setQueuedTasks(current => [
      {
        id,
        text: t,
        createdAt: Date.now(),
        categoryTitle: pathCategory?.categoryTitle,
        status: 'queued',
      },
      ...current,
    ]);
    closeReview();
  }, [closeReview, pathCategory, reviewText]);

  const startRecording = React.useCallback(async () => {
    const ar = tryLoadAudioRecorder();
    if (!ar) {
      setWarmAlert({
        title: 'Voice capture unavailable',
        message: NATIVE_AUDIO_SETUP_HINT,
      });
      return;
    }

    const ok = await ensureAndroidMicPermission();
    if (!ok) {
      setWarmAlert({
        title: 'Microphone off',
        message:
          'Allow microphone access in Settings to record a voice capture.',
      });
      return;
    }

    try {
      ar.removeRecordBackListener();
      ar.setSubscriptionDuration(0.25);
      ar.addRecordBackListener(e => {
        // v3 `RecordBackType` exposes `currentPosition` (ms); show seconds in UI.
        const secs = Math.max(0, (e.currentPosition ?? 0) / 1000);
        setRecordSecs(secs);
      });
      // Brief pause lets AVAudioSession settle (helps some iOS / Bridgeless races).
      if (Platform.OS === 'ios') {
        await new Promise<void>(r => setTimeout(r, 180));
      }
      await ar.startRecorder(undefined, VOICE_CAPTURE_AUDIO_SET, false);
      setIsRecording(true);
      setRecordSecs(0);
    } catch (e) {
      ar.removeRecordBackListener();
      setIsRecording(false);
      setRecordSecs(0);
      const detail = e instanceof Error ? e.message : String(e);
      setWarmAlert({
        title: 'Could not record',
        message: recordingFailureMessage(detail),
      });
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const next = consumeCaptureCategoryIntent();
      if (next) {
        setPathCategory(next);
      } else {
        setPathCategory(null);
      }
      return () => {
        if (!isRecordingRef.current) {
          return;
        }
        void stopRecording();
      };
    }, [stopRecording]),
  );

  /** Expanding rings + soft “breathing” on the mic while recording */
  const pulse1 = React.useRef(new Animated.Value(0)).current;
  const pulse2 = React.useRef(new Animated.Value(0)).current;
  const breathe = React.useRef(new Animated.Value(1)).current;
  const dotOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!isRecording) {
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
  }, [isRecording, pulse1, pulse2, breathe, dotOpacity]);

  const iconName =
    pathCategory?.icon ||
    (pathCategory
      ? ICON_FALLBACK[pathCategory.categoryId] ?? 'map'
      : 'map');

  const timeLabel = formatDurationMmSs(recordSecs);
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
      <VoiceTranscriptReviewModal
        visible={reviewOpen}
        loading={reviewLoading}
        errorHint={reviewError}
        value={reviewText}
        onChangeText={setReviewText}
        onSubmit={submitReview}
        onDiscard={closeReview}
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
        <Text style={styles.greeting}>Good Morning, Eve</Text>
        <Text style={styles.prompt}>Release what's on your mind</Text>

        <View style={styles.micStage}>
          {isRecording ? (
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

          {isRecording ? (
            <Animated.View
              style={[
                styles.micWrap,
                { transform: [{ scale: breathe }] },
              ]}>
              <View
                style={[
                  styles.micCircle,
                  {
                    borderColor: REC_BLUE.ringBorder,
                    backgroundColor: REC_BLUE.micFill,
                  },
                ]}>
                <Feather
                  name="mic"
                  size={30}
                  color={REC_BLUE.micIcon}
                />
              </View>
            </Animated.View>
          ) : (
            <Pressable
              style={styles.micWrap}
              onPress={startRecording}
              accessibilityRole="button"
              accessibilityLabel="Start voice recording">
              <View style={styles.micCircle}>
                <Feather name="mic" size={30} color={accent} />
              </View>
            </Pressable>
          )}
        </View>

        {isRecording ? (
          <View style={styles.recordingRow}>
            <Animated.View
              style={[styles.recDot, { opacity: dotOpacity }]}
            />
            <Text style={styles.recordingLabel}>
              Recording {timeLabel}
            </Text>
          </View>
        ) : (
          <Text style={styles.tap}>Tap the mic to speak</Text>
        )}

        {isRecording ? (
          <Pressable
            onPress={stopRecording}
            style={({ pressed }) => [
              styles.stopBtn,
              pressed && styles.stopBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Stop recording">
            <Feather name="square" size={18} color="#fff" />
            <Text style={styles.stopBtnText}>Stop recording</Text>
          </Pressable>
        ) : null}

        {queuedTasks.length > 0 ? (
          <View style={styles.queueSection}>
            <View style={styles.queueHeader}>
              <Text style={styles.queueTitle}>Tasks</Text>
              <Text style={styles.queueCount}>{queuedTasks.length}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.queueRail}>
              {queuedTasks.map(task => (
                <View key={task.id} style={styles.queueCard}>
                  <View style={styles.queueCardTop}>
                    <View
                      style={[
                        styles.queueStatusPill,
                        { backgroundColor: taskStatusColor(task.status) },
                      ]}>
                      <Text style={styles.queueStatusText}>
                        {taskStatusCopy(task.status)}
                      </Text>
                    </View>
                    <View style={styles.queueCardActions}>
                      <Text style={styles.queueTime}>
                        {new Date(task.createdAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                      {task.status === 'done' ? (
                        <Pressable
                          onPress={() => removeQueuedTask(task.id)}
                          hitSlop={10}
                          style={styles.queueRemoveBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Remove processed task">
                          <Feather name="x" size={14} color="rgba(58,45,42,0.72)" />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  {task.categoryTitle ? (
                    <Text style={styles.queueCategory}>{task.categoryTitle}</Text>
                  ) : null}
                  <Text style={styles.queueTaskText} numberOfLines={4}>
                    {task.text}
                  </Text>
                </View>
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
  /** Frosted / glass stack (no native blur — layered translucency). */
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
  /** Android: avoid double border + elevation “halo” on category banner */
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
  /** Wide chip like Path cards but rectangular, not square. */
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  queueSection: {
    width: '100%',
    marginTop: 26,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  queueTitle: {
    fontSize: 18,
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
  },
  queueCount: {
    minWidth: 28,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(75,122,166,0.12)',
    color: EveCalTheme.colors.accent2,
    fontWeight: '700',
  },
  queueRail: {
    paddingRight: 10,
    gap: 14,
  },
  queueCard: {
    width: 270,
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
  },
  queueCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  queueCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  queueStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  queueTime: {
    color: EveCalTheme.colors.textMuted,
    fontSize: 12,
  },
  queueRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58,45,42,0.06)',
  },
  queueCategory: {
    color: EveCalTheme.colors.accent2,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  queueTaskText: {
    color: EveCalTheme.colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
});
