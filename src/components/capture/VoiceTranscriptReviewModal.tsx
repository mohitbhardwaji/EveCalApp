import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { EveCalTheme } from '../../theme/theme';

type Props = {
  visible: boolean;
  loading: boolean;
  errorHint: string | null;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onDiscard: () => void;
};

export function VoiceTranscriptReviewModal({
  visible,
  loading,
  errorHint,
  value,
  onChangeText,
  onSubmit,
  onDiscard,
}: Props) {
  const inputRef = React.useRef<TextInput>(null);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDiscard}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDiscard} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Your capture</Text>
            <Pressable
              onPress={onDiscard}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Feather name="x" size={22} color={EveCalTheme.colors.text} />
            </Pressable>
          </View>
          <Text style={styles.sheetSub}>
            Review what we heard. Edit the text if needed, then submit — or close
            to discard.
          </Text>
          {errorHint ? (
            <View style={styles.hintBox}>
              <Feather name="info" size={16} color="rgba(142,119,110,0.95)" />
              <Text style={styles.hintText}>{errorHint}</Text>
            </View>
          ) : null}
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              multiline
              textAlignVertical="top"
              placeholder="Transcription appears here — or type your note…"
              placeholderTextColor="rgba(58,45,42,0.32)"
              value={value}
              onChangeText={onChangeText}
              editable={!loading}
              maxLength={8000}
            />
            {loading ? (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="rgba(58,45,42,0.45)" />
                <Text style={styles.loadingLabel}>Transcribing with Gemini…</Text>
              </View>
            ) : null}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsRow}
            keyboardShouldPersistTaps="handled">
            <Pressable
              onPress={() => inputRef.current?.focus()}
              disabled={loading}
              style={({ pressed }) => [
                styles.btnSecondary,
                pressed && styles.btnPressed,
                loading && styles.btnDisabled,
              ]}>
              <Feather name="edit-2" size={18} color={EveCalTheme.colors.text} />
              <Text style={styles.btnSecondaryText}>Edit manually</Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.btnPressed,
                loading && styles.btnDisabled,
              ]}>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Submit</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(58, 45, 42, 0.35)',
  },
  sheet: {
    backgroundColor: '#FDFBF9',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
    fontWeight: '500',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58,45,42,0.06)',
  },
  sheetSub: {
    fontSize: 14,
    lineHeight: 21,
    color: EveCalTheme.colors.textMuted,
    marginBottom: 14,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 235, 230, 0.85)',
    marginBottom: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(58,45,42,0.72)',
  },
  inputWrap: {
    minHeight: 200,
    maxHeight: 360,
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    flex: 1,
    minHeight: 200,
    maxHeight: 360,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.1)',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 24,
    color: EveCalTheme.colors.text,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(253, 251, 249, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(58,45,42,0.5)',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.15)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: EveCalTheme.colors.text,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(91, 140, 200, 0.95)',
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
