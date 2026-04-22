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
  return 'Tap Start Capture';
}

export function CaptureScreen() {
  const insets = useSafeAreaInsets();
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

  const palette = {
    background: EveCalTheme.colors.bg,
    card: EveCalTheme.colors.cardWarm,
    text: EveCalTheme.colors.text,
    muted: EveCalTheme.colors.textMuted,
    primary: EveCalTheme.colors.accent2,
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <TopHeader />
      <View style={styles.container}>
        <Text style={[styles.title, { color: palette.text }]}>Live Capture</Text>
        <View style={styles.centerSection}>
          <MicAnimation isSpeaking={isSpeaking} color={palette.primary} />
          <Text style={[styles.status, { color: palette.text }]}>
            {statusText({ isListening, isSpeaking, isProcessing })}
          </Text>
          {!isActive ? (
            <Pressable
              onPress={() => void start()}
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: palette.primary },
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonText}>Start Capture</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void stop()}
              style={({ pressed }) => [
                styles.endButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonText}>End Capture Session</Text>
            </Pressable>
          )}
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
          <Text style={[styles.feedTitle, { color: palette.text }]}>
            Live Transcript
          </Text>
          <TranscriptList items={transcriptList} />
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
    paddingTop: 8,
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    fontFamily: EveCalTheme.typography.serif,
  },
  centerSection: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 14 : 8,
    marginBottom: 20,
  },
  status: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  startButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  endButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#cf4e4e',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonPressed: {
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
    flex: 1,
    borderRadius: 20,
    padding: 14,
  },
  feedTitle: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: '600',
  },
});
