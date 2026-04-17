import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EveCalTheme } from '../../theme/theme';
import type { SettingsStackParamList } from '../../navigation/types';
import { useAuth } from '../../state/auth/AuthContext';
import { StorageKeys } from '../../state/auth/storageKeys';
import { WarmAlertDialog } from '../../components/WarmAlertDialog';
import { openCustomerCenter, presentPaywall } from '../../services/revenuecat/revenueCatUi';
import { useSubscription } from '../../state/subscription/SubscriptionContext';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>;

const APP_VERSION = '1.0.0';

export function SettingsHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();
  const { isPro, refresh } = useSubscription();
  const [notificationsOn, setNotificationsOn] = React.useState(true);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = React.useState(false);
  const [manageLoading, setManageLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(StorageKeys.settingsNotifications);
        if (mounted && v != null) setNotificationsOn(v === '1');
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistNotifications = async (value: boolean) => {
    setNotificationsOn(value);
    try {
      await AsyncStorage.setItem(
        StorageKeys.settingsNotifications,
        value ? '1' : '0',
      );
    } catch {
      /* ignore */
    }
  };

  const handleManageSubscription = React.useCallback(async () => {
    setManageLoading(true);
    try {
      if (isPro) {
        await openCustomerCenter();
      } else {
        const { unlocked } = await presentPaywall();
        if (unlocked) {
          await refresh();
        }
      }
      await refresh();
    } catch (e) {
      // Fallback: for users without active entitlement, Customer Center may not show purchasable plans.
      try {
        const { unlocked } = await presentPaywall();
        if (unlocked) {
          await refresh();
        }
      } catch (fallbackError) {
        const msg =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        Alert.alert('Could not open subscriptions', msg);
      }
    } finally {
      setManageLoading(false);
    }
  }, [isPro, refresh]);

  const handleOpenCustomerCenterOnly = React.useCallback(async () => {
    setManageLoading(true);
    try {
      await openCustomerCenter();
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not open subscriptions', msg);
    } finally {
      setManageLoading(false);
    }
  }, [refresh]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.getParent()?.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color="rgba(58,45,42,0.75)" />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>
            ACCOUNT
          </Text>
          <SettingsRow
            icon="bell"
            label="Notifications"
            right={
              <Switch
                value={notificationsOn}
                onValueChange={persistNotifications}
                trackColor={{
                  false: 'rgba(58,45,42,0.15)',
                  true: 'rgba(58,45,42,0.55)',
                }}
                thumbColor="#fff"
                ios_backgroundColor="rgba(58,45,42,0.15)"
              />
            }
          />
          <Divider />
          <Pressable
            onPress={() => void handleManageSubscription()}
            style={styles.rowPress}>
            <SettingsRow
              icon="credit-card"
              label={isPro ? 'Manage Subscription' : 'See Plans'}
              right={
                manageLoading ? (
                  <Text style={styles.rowMeta}>Opening…</Text>
                ) : (
                  <Feather
                    name="chevron-right"
                    size={20}
                    color="rgba(58,45,42,0.35)"
                  />
                )
              }
            />
          </Pressable>
          <Divider />
          <Pressable onPress={() => void handleOpenCustomerCenterOnly()} style={styles.rowPress}>
            <SettingsRow
              icon="refresh-cw"
              label="Open Customer Center"
              right={
                <Feather
                  name="external-link"
                  size={18}
                  color="rgba(58,45,42,0.35)"
                />
              }
            />
          </Pressable>
          <Divider />
          <Pressable
            onPress={() => navigation.navigate('PrivacySecurity')}
            style={styles.rowPress}>
            <SettingsRow
              icon="lock"
              label="Privacy & Security"
              right={
                <Feather
                  name="chevron-right"
                  size={20}
                  color="rgba(58,45,42,0.35)"
                />
              }
            />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>
            SUPPORT
          </Text>
          <Pressable
            onPress={() => navigation.navigate('HelpFeedback')}
            style={styles.rowPress}>
            <SettingsRow
              icon="help-circle"
              label="Help & Feedback"
              right={
                <Feather
                  name="chevron-right"
                  size={20}
                  color="rgba(58,45,42,0.35)"
                />
              }
            />
          </Pressable>
          <Divider />
          <Pressable
            onPress={() => navigation.navigate('TermsPrivacy')}
            style={styles.rowPress}>
            <SettingsRow
              icon="file-text"
              label="Terms & Privacy"
              right={
                <Feather
                  name="chevron-right"
                  size={20}
                  color="rgba(58,45,42,0.35)"
                />
              }
            />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>
            SESSION
          </Text>
          <Pressable
            onPress={() => setLogoutConfirmVisible(true)}
            style={styles.rowPress}>
            <SettingsRow
              icon="log-out"
              label="Logout"
              right={
                <Feather
                  name="chevron-right"
                  size={20}
                  color="rgba(58,45,42,0.35)"
                />
              }
            />
          </Pressable>
        </View>

        <Text style={styles.footerVersion}>Eve&Cal v{APP_VERSION}</Text>
        <Text style={styles.footerTag}>Made with care for your peace of mind</Text>
      </ScrollView>

      <WarmAlertDialog
        visible={logoutConfirmVisible}
        title="Log out?"
        message="You’ll need to sign in again to use your journal and captures."
        cancelLabel="Cancel"
        confirmLabel="Log out"
        onDismiss={() => setLogoutConfirmVisible(false)}
        onConfirm={() => void signOut()}
      />
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingsRow({
  icon,
  label,
  right,
}: {
  icon: string;
  label: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={20} color="rgba(58,45,42,0.65)" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: EveCalTheme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: EveCalTheme.typography.serif,
    color: EveCalTheme.colors.text,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 18,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(142,119,110,0.85)',
    marginTop: 4,
    marginBottom: 10,
    marginLeft: 16,
    marginRight: 16,
  },
  sectionLabelFirst: {
    marginTop: 4,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.06)',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  rowPress: {
    marginHorizontal: 0,
  },
  iconWrap: {
    width: 36,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: 'rgba(58,45,42,0.88)',
    fontWeight: '500',
  },
  rowRight: {
    maxWidth: '52%',
    alignItems: 'flex-end',
  },
  rowMeta: {
    color: 'rgba(58,45,42,0.5)',
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(58,45,42,0.08)',
    marginLeft: 60,
    marginRight: 0,
  },
  footerVersion: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 13,
    color: 'rgba(142,119,110,0.75)',
  },
  footerTag: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(142,119,110,0.6)',
  },
});
