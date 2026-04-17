import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { SettingsDetailLayout } from './SettingsDetailLayout';
import { EveCalTheme } from '../../theme/theme';
import { useSubscription } from '../../state/subscription/SubscriptionContext';
import { revenueCatService } from '../../services/revenuecat/RevenueCatService';
import { presentPaywall } from '../../services/revenuecat/revenueCatUi';

export function PaymentsSettingsScreen() {
  const { isPro, refresh } = useSubscription();
  const [busy, setBusy] = React.useState<'paywall' | 'restore' | null>(null);

  const handleViewPlans = React.useCallback(async () => {
    setBusy('paywall');
    try {
      const { unlocked } = await presentPaywall();
      if (unlocked) {
        await refresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not open paywall', msg);
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const handleRestorePurchase = React.useCallback(async () => {
    setBusy('restore');
    try {
      const result = await revenueCatService.restorePurchases();
      if (!result.ok) {
        Alert.alert('Restore failed', result.message);
        return;
      }
      await refresh();
      Alert.alert(
        'Restore complete',
        revenueCatService.isProActive(result.customerInfo)
          ? 'Your premium access is now active.'
          : 'No active purchases were found for this account.',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Restore failed', msg);
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  return (
    <SettingsDetailLayout title="Payments">
      <Text style={styles.lead}>
        Manage your Eve&Cal Premium subscription and billing.
      </Text>

      <View style={styles.card}>
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Current plan</Text>
          <Text style={styles.planValue}>{isPro ? 'Premium' : 'Free'}</Text>
        </View>
        <Text style={styles.hint}>
          Upgrade anytime to unlock unlimited voice tasks, smart assignment, and
          more.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          disabled={busy != null}
          onPress={handleViewPlans}>
          <Text style={styles.primaryBtnText}>
            {busy === 'paywall' ? 'Opening...' : 'View plans'}
          </Text>
          <Feather name="chevron-right" size={16} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Purchases</Text>
        <Text style={styles.body}>
          If you subscribed on this device, you can restore access after
          reinstalling the app.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          disabled={busy != null}
          onPress={handleRestorePurchase}>
          <Text style={styles.secondaryBtnText}>
            {busy === 'restore' ? 'Restoring...' : 'Restore purchase'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.foot}>
        Payments are processed by Apple or Google. For billing issues, contact
        them directly from your store receipt.
      </Text>
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
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.08)',
    gap: 14,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 14,
    color: 'rgba(58,45,42,0.55)',
    fontWeight: '500',
  },
  planValue: {
    fontSize: 16,
    fontWeight: '600',
    color: EveCalTheme.colors.text,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: EveCalTheme.colors.textMuted,
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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(58,45,42,0.88)',
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 4,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.15)',
    marginTop: 4,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: EveCalTheme.colors.text,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  pressed: {
    opacity: 0.9,
  },
  foot: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(58,45,42,0.42)',
    marginTop: 8,
  },
});
