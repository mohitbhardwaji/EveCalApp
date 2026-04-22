import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHeader } from '../components/TopHeader';
import { MicAnimation } from '../components/MicAnimation';
import { TranscriptList } from '../components/TranscriptList';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
import { useAuth } from '../state/auth/AuthContext';
import { EveCalTheme } from '../theme/theme';

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
    primary: '#8A7468',
  };

  const greeting = `${timeGreeting()}, ${firstNameFromAuth(
    (userData as Record<string, unknown> | null) ?? null,
  )}`;
  const dynamicGreetingSize = React.useMemo(() => {
    if (greeting.length > 28) {
      return 27;
    }
    if (greeting.length > 22) {
      return 29;
    }
    return 32;
  }, [greeting]);

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
        {visibleTranscripts.length > 0 ? (
          <View
            style={[
              styles.feedCard,
              {
                backgroundColor: palette.card,
              },
            ]}>
            <TranscriptList items={visibleTranscripts} />
          </View>
        ) : null}

        <View
          style={[
            styles.centerSection,
            { marginBottom: Math.max(10, insets.bottom + 4) },
          ]}>
          <Text
            style={[
              styles.title,
              {
                color: palette.text,
                fontSize: dynamicGreetingSize,
                lineHeight: dynamicGreetingSize + 4,
              },
            ]}>
            {greeting}
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Release what's on your mind
          </Text>
          <Pressable
            onPress={onMicPress}
            accessibilityRole="button"
            accessibilityLabel={isActive ? 'Stop capture' : 'Start capture'}
            style={({ pressed }) => [pressed && styles.micPressed]}>
            <MicAnimation
              isSpeaking={isSpeaking}
              isPulsing={isSpeaking || isProcessing}
              color={palette.primary}
            />
          </Pressable>
          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color={palette.primary}
              style={styles.loader}
            />
          ) : null}
          {!isActive ? (
            <Text style={[styles.tapHint, { color: palette.muted }]}>Tap to speak</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
    paddingTop: 10,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    textAlign: 'center',
    fontFamily: 'Georgia',
    letterSpacing: 0.2,
    color: '#5C4A3D',
    fontWeight: '300',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: EveCalTheme.typography.system,
    opacity: 0.75,
    lineHeight: 24,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 30 : 22,
  },
  micPressed: {
    opacity: 0.86,
  },
  loader: {
    marginTop: 10,
  },
  error: {
    marginTop: 8,
    color: '#b74b4b',
    textAlign: 'center',
  },
  tapHint: {
    marginTop: 18,
    fontSize: 16,
    fontFamily: EveCalTheme.typography.system,
    opacity: 0.62,
  },
  feedCard: {
    minHeight: 170,
    borderRadius: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
});
