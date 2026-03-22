import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SettingsDetailLayout } from './SettingsDetailLayout';
import { EveCalTheme } from '../../theme/theme';

export function TermsPrivacyScreen() {
  return (
    <SettingsDetailLayout title="Terms & Privacy">
      <Text style={styles.updated}>Last updated: March 2026</Text>

      <View style={styles.block}>
        <Text style={styles.h2}>Terms of Service</Text>
        <Text style={styles.p}>
          Welcome to Eve&Cal. By downloading or using the app, you agree to
          these Terms. If you do not agree, please do not use the service.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Use of the app. </Text>
          Eve&Cal is provided for your personal, non-commercial use. You agree
          not to misuse the app, attempt to access others’ data, or interfere
          with our systems.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Subscriptions. </Text>
          Paid features, if offered, are billed through Apple or Google subject
          to their terms. Renewal and cancellation follow the store you used to
          subscribe.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Disclaimer. </Text>
          Eve&Cal supports reflection and organization; it is not a substitute
          for professional medical or mental health care.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Changes. </Text>
          We may update these Terms. Continued use after changes means you
          accept the updated Terms.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.h2}>Privacy Policy</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>What we collect. </Text>
          We collect only what is needed to run the app: for example, account
          identifiers from your sign-in provider if you choose to sign in, and
          preferences you set in the app.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Local data. </Text>
          Journal text, captures, and similar content you create are primarily
          stored on your device unless you use future sync features we may
          offer.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Analytics. </Text>
          We may use limited, privacy-respecting analytics to improve stability
          and features. We do not sell your journal content or voice recordings.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Your rights. </Text>
          Depending on where you live, you may have rights to access, correct, or
          delete personal data. Contact us at the email in Help & Feedback for
          requests.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Children. </Text>
          Eve&Cal is not directed at children under 13 (or the minimum age in your
          region). Do not use the app if you are not old enough under applicable
          law.
        </Text>
      </View>

      <Text style={styles.foot}>
        This is a summary for in-app display. A full legal version may be
        published on our website. Questions? Email support from Help &
        Feedback.
      </Text>
    </SettingsDetailLayout>
  );
}

const styles = StyleSheet.create({
  updated: {
    fontSize: 12,
    color: 'rgba(58,45,42,0.45)',
    marginBottom: 8,
  },
  block: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
    gap: 4,
  },
  h2: {
    fontSize: 18,
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
    marginBottom: 12,
  },
  p: {
    fontSize: 14,
    lineHeight: 22,
    color: EveCalTheme.colors.textMuted,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: 'rgba(58,45,42,0.82)',
  },
  foot: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(58,45,42,0.42)',
    fontStyle: 'italic',
  },
});
