import React from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { SettingsDetailLayout } from './SettingsDetailLayout';
import { WarmAlertDialog } from '../../components/WarmAlertDialog';
import { EveCalTheme } from '../../theme/theme';

const SUPPORT_EMAIL = 'support@eveandcal.com';
const DELETE_EMAIL = 'privacy@eveandcal.com';

const FAQ = [
  {
    q: 'How do I change my notification settings?',
    a: 'Use the Notifications toggle on the main Settings screen, or adjust permissions in your phone’s system settings for Eve&Cal.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Most journal and capture data stays on your device unless you use features that sync in the future. See Privacy & Security for more.',
  },
  {
    q: 'How do I restore Premium?',
    a: 'Open Payments → Restore purchase. Use the same Apple ID or Google account you used to subscribe.',
  },
];

export function HelpFeedbackScreen() {
  const [deleteDialog, setDeleteDialog] = React.useState(false);

  return (
    <SettingsDetailLayout title="Help & Feedback">
      <Text style={styles.lead}>
        We’re glad you’re here. Reach out anytime — we read every message.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact us</Text>
        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          onPress={() =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=Eve%26Cal%20support`,
            )
          }>
          <Feather name="mail" size={20} color="rgba(58,45,42,0.65)" />
          <View style={styles.linkTextWrap}>
            <Text style={styles.linkLabel}>Email support</Text>
            <Text style={styles.linkValue}>{SUPPORT_EMAIL}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(58,45,42,0.3)" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          onPress={() =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=Eve%26Cal%20feedback`,
            )
          }>
          <Feather name="message-circle" size={20} color="rgba(58,45,42,0.65)" />
          <View style={styles.linkTextWrap}>
            <Text style={styles.linkLabel}>Send feedback</Text>
            <Text style={styles.linkHint}>Ideas, bugs, or kind words</Text>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(58,45,42,0.3)" />
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>COMMON QUESTIONS</Text>
      {FAQ.map(item => (
        <View key={item.q} style={styles.faqCard}>
          <Text style={styles.faqQ}>{item.q}</Text>
          <Text style={styles.faqA}>{item.a}</Text>
        </View>
      ))}

      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.deleteCard}>
        <View style={styles.deleteHeader}>
          <Feather name="alert-triangle" size={22} color="rgba(180, 80, 70, 0.9)" />
          <Text style={styles.deleteTitle}>Delete account</Text>
        </View>
        <Text style={styles.deleteBody}>
          Account deletion is permanent. We’ll remove associated profile data
          as required by law and our retention policy. Some billing records may
          be kept for a limited time for tax and fraud prevention.
        </Text>
        <Text style={styles.deleteBody}>
          To request deletion, email us from the address you used to sign in. We
          may verify your identity before processing.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => setDeleteDialog(true)}>
          <Text style={styles.deleteBtnText}>Request account deletion</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.altBtn, pressed && styles.pressed]}
          onPress={() =>
            Linking.openURL(
              `mailto:${DELETE_EMAIL}?subject=Account%20deletion%20request`,
            )
          }>
          <Text style={styles.altBtnText}>Email {DELETE_EMAIL}</Text>
        </Pressable>
      </View>

      <WarmAlertDialog
        visible={deleteDialog}
        title="Request account deletion"
        message={`Send an email to ${DELETE_EMAIL} with the subject “Account deletion” and include the email you use to sign in. We’ll confirm within a few business days.`}
        confirmLabel="OK"
        onDismiss={() => setDeleteDialog(false)}
      />
    </SettingsDetailLayout>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: EveCalTheme.colors.textMuted,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 13,
    letterSpacing: 1.8,
    color: 'rgba(142,119,110,0.9)',
    fontWeight: '600',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(58,45,42,0.08)',
  },
  linkTextWrap: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: EveCalTheme.colors.text,
  },
  linkValue: {
    fontSize: 13,
    color: EveCalTheme.colors.textMuted,
    marginTop: 2,
  },
  linkHint: {
    fontSize: 13,
    color: EveCalTheme.colors.textMuted,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(142,119,110,0.85)',
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
    marginBottom: 4,
  },
  faqQ: {
    fontSize: 15,
    fontWeight: '600',
    color: EveCalTheme.colors.text,
    marginBottom: 8,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 21,
    color: EveCalTheme.colors.textMuted,
  },
  deleteCard: {
    backgroundColor: 'rgba(255, 248, 246, 0.95)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(200, 120, 110, 0.25)',
    gap: 12,
  },
  deleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: EveCalTheme.colors.text,
  },
  deleteBody: {
    fontSize: 14,
    lineHeight: 21,
    color: EveCalTheme.colors.textMuted,
  },
  deleteBtn: {
    backgroundColor: 'rgba(58,45,42,0.88)',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 4,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  altBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  altBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(58,45,42,0.65)',
    textDecorationLine: 'underline',
  },
});
