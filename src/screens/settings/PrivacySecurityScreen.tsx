import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { SettingsDetailLayout } from './SettingsDetailLayout';
import { EveCalTheme } from '../../theme/theme';

const BULLETS = [
  {
    icon: 'shield' as const,
    title: 'Your data stays yours',
    text: 'Journal entries and captures are stored on your device and any sync you enable. We design Eve&Cal to minimize what leaves your phone.',
  },
  {
    icon: 'eye-off' as const,
    title: 'No selling personal journals',
    text: 'We do not sell your reflections or voice captures to advertisers.',
  },
  {
    icon: 'lock' as const,
    title: 'Security practices',
    text: 'We follow platform security guidelines (iOS & Android) and update the app as standards evolve.',
  },
];

export function PrivacySecurityScreen() {
  return (
    <SettingsDetailLayout title="Privacy & Security">
      <Text style={styles.lead}>
        How we think about your peace of mind and your data.
      </Text>

      {BULLETS.map(b => (
        <View key={b.title} style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name={b.icon} size={20} color="rgba(58,45,42,0.7)" />
          </View>
          <Text style={styles.cardTitle}>{b.title}</Text>
          <Text style={styles.body}>{b.text}</Text>
        </View>
      ))}

      <View style={styles.cardMuted}>
        <Text style={styles.mutedTitle}>Data export</Text>
        <Text style={styles.mutedBody}>
          A full in-app export is on our roadmap. For now, contact support if you
          need a copy of data associated with your account.
        </Text>
      </View>
    </SettingsDetailLayout>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: EveCalTheme.colors.textMuted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
    gap: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(58,45,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: EveCalTheme.colors.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: EveCalTheme.colors.textMuted,
  },
  cardMuted: {
    backgroundColor: 'rgba(58,45,42,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.06)',
  },
  mutedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: EveCalTheme.colors.text,
    marginBottom: 6,
  },
  mutedBody: {
    fontSize: 13,
    lineHeight: 19,
    color: EveCalTheme.colors.textMuted,
  },
});
