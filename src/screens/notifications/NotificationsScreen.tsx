import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { EveCalTheme } from '../../theme/theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

type SampleNotif = {
  id: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
};

const SAMPLE_NOTIFICATIONS: SampleNotif[] = [
  {
    id: '1',
    icon: 'sun',
    iconBg: 'rgba(255, 220, 180, 0.55)',
    title: 'Morning reflection',
    body: 'A gentle nudge to check in with your journal and set an intention for the day.',
    time: '8:00 AM',
    unread: true,
  },
  {
    id: '2',
    icon: 'heart',
    iconBg: 'rgba(245, 210, 220, 0.55)',
    title: 'Path milestone',
    body: 'You’re close to completing your Growth path this week — keep going.',
    time: 'Yesterday',
    unread: true,
  },
  {
    id: '3',
    icon: 'calendar',
    iconBg: 'rgba(200, 228, 212, 0.65)',
    title: 'Weekly calm reminder',
    body: 'Schedule a short breathing break. Your future self will thank you.',
    time: 'Mon',
  },
  {
    id: '4',
    icon: 'gift',
    iconBg: 'rgba(220, 230, 250, 0.7)',
    title: 'Eve Cal tip',
    body: 'Try tagging entries with Gratitude — it makes revisiting highlights easier.',
    time: 'Mar 15',
  },
  {
    id: '5',
    icon: 'bell',
    iconBg: 'rgba(58,45,42,0.08)',
    title: 'Notifications are on',
    body: 'You’ll get light reminders here. Turn them off anytime in Settings.',
    time: 'Mar 10',
  },
];

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();

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

        {SAMPLE_NOTIFICATIONS.map(n => (
          <View
            key={n.id}
            style={[styles.card, n.unread && styles.cardUnread]}>
            <View style={[styles.iconWrap, { backgroundColor: n.iconBg }]}>
              <Feather name={n.icon} size={20} color="rgba(58,45,42,0.72)" />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                {n.unread ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.cardText}>{n.body}</Text>
              <Text style={styles.cardTime}>{n.time}</Text>
            </View>
          </View>
        ))}
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
