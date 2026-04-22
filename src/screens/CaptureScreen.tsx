import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHeader } from '../components/TopHeader';
import { MicAnimation } from '../components/MicAnimation';
import { TranscriptList } from '../components/TranscriptList';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
import { useAuth } from '../state/auth/AuthContext';
import { EveCalTheme } from '../theme/theme';

function statusText(params: {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}): string {
  if (params.isProcessing) {
    return 'Processing...';
  }
  if (params.isSpeaking) {
    return 'Speaking...';
  }
  if (params.isListening) {
    return 'Listening...';
  }
  return 'Tap mic to start';
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good Morning';
  }
  if (hour < 18) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
}

function firstNameFromAuth(userData: Record<string, unknown> | null): string {
  if (!userData) {
    return 'Eve';
  }
  const fullName = userData.full_name;
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim().split(/\s+/)[0] ?? 'Eve';
  }
  const name = userData.name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim().split(/\s+/)[0] ?? 'Eve';
  }
  return 'Eve';
}

export function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const [clockTick, setClockTick] = React.useState(() => Date.now());
  const { userData } = useAuth();
  const {
    isActive,
    isListening,
    isSpeaking,
    isProcessing,
    transcriptList,
    currentChunk,
    error,
    start,
    stop,
  } = useVoiceCapture();

  React.useEffect(() => {
    const timer = setInterval(() => {
      setClockTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const visibleTranscripts = React.useMemo(
    () => transcriptList.filter(item => clockTick - item.timestamp <= 60_000),
    [clockTick, transcriptList],
  );

  const palette = {
    background: EveCalTheme.colors.bg,
    card: EveCalTheme.colors.cardWarm,
    text: EveCalTheme.colors.text,
    muted: EveCalTheme.colors.textMuted,
    primary: EveCalTheme.colors.accent2,
  };

  const greeting = `${timeGreeting()}, ${firstNameFromAuth(
    (userData as Record<string, unknown> | null) ?? null,
  )}`;

  const onMicPress = React.useCallback(() => {
    if (isActive) {
      void stop();
      return;
    }
    void start();
  }, [isActive, start, stop]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <TopHeader />
      <View style={styles.container}>
        <Text style={[styles.title, { color: palette.text }]}>{greeting}</Text>
        <View style={styles.centerSection}>
          <Pressable
            onPress={onMicPress}
            accessibilityRole="button"
            accessibilityLabel={isActive ? 'Stop capture' : 'Start capture'}
            style={({ pressed }) => [pressed && styles.micPressed]}>
            <MicAnimation isSpeaking={isSpeaking} color={palette.primary} />
          </Pressable>
          <Text style={[styles.status, { color: palette.text }]}>
            {statusText({ isListening, isSpeaking, isProcessing })}
          </Text>
          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color={palette.primary}
              style={styles.loader}
            />
          ) : null}
          <Text style={[styles.subStatus, { color: palette.muted }]}>
            {currentChunk || 'Speak naturally. We auto-transcribe after each pause.'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View
          style={[
            styles.feedCard,
            {
              backgroundColor: palette.card,
              marginBottom: Math.max(10, insets.bottom + 4),
            },
          ]}>
          <TranscriptList items={visibleTranscripts} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    fontFamily: EveCalTheme.typography.serif,
  },
  centerSection: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 28 : 20,
    marginBottom: 24,
  },
  status: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  micPressed: {
    opacity: 0.86,
  },
  loader: {
    marginTop: 10,
  },
  subStatus: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  error: {
    marginTop: 8,
    color: '#b74b4b',
    textAlign: 'center',
  },
  feedCard: {
    minHeight: 190,
    borderRadius: 20,
    paddingVertical: 14,
  },
});
