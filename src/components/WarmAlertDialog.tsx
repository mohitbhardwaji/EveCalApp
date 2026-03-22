import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  /** Default OK */
  confirmLabel?: string;
  onDismiss: () => void;
  /** When set, shows a second button; Cancel calls `onDismiss` only. */
  cancelLabel?: string;
  /** Primary action when two-button mode; runs before `onDismiss`. */
  onConfirm?: () => void;
};

/**
 * In-app alert styled like the Eve&Cal warm modal (off-white card, grey pill OK).
 */
export function WarmAlertDialog({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  onDismiss,
  cancelLabel,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardMaxW = Math.min(340, width - 48);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top + 12 }]}
        onPress={onDismiss}>
        <Pressable
          style={[styles.card, { maxWidth: cardMaxW }]}
          onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView
            style={styles.messageScroll}
            showsVerticalScrollIndicator={message.length > 120}>
            <Text style={styles.message}>{message}</Text>
          </ScrollView>
          {cancelLabel != null && cancelLabel !== '' ? (
            <View style={styles.btnRow}>
              <Pressable
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.okBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onConfirm?.();
                  onDismiss();
                }}
                style={({ pressed }) => [
                  styles.okBtn,
                  styles.okBtnFlex,
                  pressed && styles.okBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}>
                <Text style={styles.okText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.okBtn,
                pressed && styles.okBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}>
              <Text style={styles.okText}>{confirmLabel}</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const C = {
  card: '#F2F1ED',
  title: '#2C2C2C',
  message: '#6B6560',
  okBg: '#D1D1D1',
  okText: '#2C2C2C',
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 44, 44, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 34,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: C.title,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  messageScroll: {
    maxHeight: 220,
    marginBottom: 24,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: C.message,
    fontWeight: '400',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(44, 44, 44, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(44, 44, 44, 0.08)',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.message,
    letterSpacing: 0.2,
  },
  okBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: C.okBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okBtnFlex: {
    flex: 1,
  },
  okBtnPressed: {
    opacity: 0.88,
  },
  okText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.okText,
    letterSpacing: 1.2,
  },
});
