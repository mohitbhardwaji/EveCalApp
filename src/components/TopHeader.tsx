import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { navigateToRootSettings } from '../navigation/navigateToRootSettings';
import { navigateToNotifications } from '../navigation/navigateToNotifications';
import { useNotificationBadge } from '../state/notifications/NotificationBadgeContext';
import { EveCalTheme } from '../theme/theme';

export function TopHeader({
  onPressBell,
  onPressProfile,
  backgroundColor,
}: {
  onPressBell?: () => void;
  /** If omitted, opens root Settings screen (profile). */
  onPressProfile?: () => void;
  /** Status-bar safe area fill (e.g. match a non-default screen background). */
  backgroundColor?: string;
}) {
  const navigation = useNavigation();
  const { unreadCount, refreshUnreadCount } = useNotificationBadge();

  useFocusEffect(
    React.useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  const openProfileOrSettings = () => {
    if (onPressProfile) {
      onPressProfile();
      return;
    }
    navigateToRootSettings(navigation);
  };

  const openNotifications = () => {
    if (onPressBell) {
      onPressBell();
      return;
    }
    navigateToNotifications(navigation);
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, backgroundColor ? { backgroundColor } : null]}>
      <View style={styles.row}>
        <View style={styles.right}>
          <Pressable
            onPress={openNotifications}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }>
            <View style={styles.bellWrap}>
              <Feather name="bell" size={20} color={stylesVars.iconColor} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : String(unreadCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <Pressable
            onPress={openProfileOrSettings}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings">
            <Feather name="user" size={20} color={stylesVars.iconColor} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const stylesVars = {
  iconColor: 'rgba(142,119,110,0.75)',
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: EveCalTheme.colors.bg,
  },
  row: {
    height: 46,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellWrap: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: 'rgba(183, 220, 198, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(47, 141, 119, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(35, 95, 78, 0.95)',
  },
});

