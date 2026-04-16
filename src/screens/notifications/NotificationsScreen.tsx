import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import type { RootStackParamList } from '../../navigation/types';
import {
  fetchNotificationsForUser,
  markNotificationRead,
  notificationDisplay,
  type NotificationRow,
} from '../../lib/supabase/notificationsApi';
import { useNotificationBadge } from '../../state/notifications/NotificationBadgeContext';
import { useAuth } from '../../state/auth/AuthContext';
import { EveCalTheme } from '../../theme/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

const ICON_BG: string[] = [
  'rgba(255, 220, 180, 0.55)',
  'rgba(245, 210, 220, 0.55)',
  'rgba(200, 228, 212, 0.65)',
  'rgba(220, 230, 250, 0.7)',
  'rgba(168, 201, 190, 0.45)',
];

const ICON_NAMES: React.ComponentProps<typeof Feather>['name'][] = [
  'bell',
  'heart',
  'calendar',
  'sun',
  'gift',
];

function iconForIndex(i: number): {
  name: React.ComponentProps<typeof Feather>['name'];
  bg: string;
} {
  return {
    name: ICON_NAMES[i % ICON_NAMES.length],
    bg: ICON_BG[i % ICON_BG.length],
  };
}

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotificationBadge();
  const [items, setItems] = React.useState<NotificationRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await fetchNotificationsForUser();
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      setItems([]);
      return;
    }
    setItems(result.items);
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      void load();
      void refreshUnreadCount();
    }, [load, refreshUnreadCount]),
  );

  const onPressNotification = React.useCallback(
    async (row: NotificationRow) => {
      if (row.is_read !== true) {
        const r = await markNotificationRead(row.id);
        if (r.ok) {
          setItems(prev =>
            prev.map(n =>
              n.id === row.id ? { ...n, is_read: true } : n,
            ),
          );
          void refreshUnreadCount();
        }
      }
    },
    [refreshUnreadCount],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color="rgba(58,45,42,0.75)" />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Stay in rhythm with gentle reminders and updates.
        </Text>

        {!user ? (
          <Text style={styles.hint}>Sign in to see your notifications.</Text>
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={EveCalTheme.colors.textMuted} />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.hint}>You’re all caught up. No notifications yet.</Text>
        ) : (
          items.map((n, index) => {
            const { name: iconName, bg } = iconForIndex(index);
            const title = notificationDisplay.title(n);
            const body = notificationDisplay.body(n);
            const time = notificationDisplay.time(n.created_at);
            const unread = n.is_read !== true;
            return (
              <Pressable
                key={n.id}
                onPress={() => void onPressNotification(n)}
                style={({ pressed }) => [
                  styles.card,
                  unread && styles.cardUnread,
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${title}. ${unread ? 'Unread. ' : ''}Tap to mark read.`}>
                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                  <Feather name={iconName} size={20} color="rgba(58,45,42,0.72)" />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    {unread ? <View style={styles.dot} /> : null}
                  </View>
                  {body ? <Text style={styles.cardText}>{body}</Text> : null}
                  {time ? <Text style={styles.cardTime}>{time}</Text> : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(58,45,42,0.08)',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginRight: 44,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: EveCalTheme.typography.serif,
    fontWeight: '500',
    color: EveCalTheme.colors.text,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  subtitle: {
    fontSize: 14,
    color: EveCalTheme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    color: EveCalTheme.colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 14,
    color: 'rgba(183, 92, 72, 0.95)',
    lineHeight: 20,
    marginTop: 12,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: EveCalTheme.radius.md,
    backgroundColor: EveCalTheme.colors.card,
    borderWidth: 1,
    borderColor: EveCalTheme.colors.border,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardUnread: {
    borderColor: 'rgba(168, 201, 190, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    shadowColor: 'rgba(47, 141, 119, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: EveCalTheme.colors.text,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: EveCalTheme.colors.accent1,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: EveCalTheme.colors.textMuted,
    marginBottom: 8,
  },
  cardTime: {
    fontSize: 12,
    color: 'rgba(58,45,42,0.38)',
    fontWeight: '500',
  },
});
