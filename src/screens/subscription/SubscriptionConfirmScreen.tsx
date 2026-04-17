import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { EveCalTheme } from '../../theme/theme';
import { useAuth } from '../../state/auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionConfirm'>;

export function SubscriptionConfirmScreen({ navigation }: Props) {
  const { isAuthed } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Subscription Confirmed</Text>
        <Text style={styles.body}>
          Your subscription was confirmed successfully. Premium features are now
          available in your account.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => navigation.navigate(isAuthed ? 'Main' : 'Auth')}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EveCalTheme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: EveCalTheme.colors.card,
    borderWidth: 1,
    borderColor: EveCalTheme.colors.border,
    padding: 22,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: EveCalTheme.colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: EveCalTheme.colors.textMuted,
  },
  button: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(58,45,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
