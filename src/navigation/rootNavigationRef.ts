import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const rootNavigationRef =
  createNavigationContainerRef<RootStackParamList>();

/** Handle notification payload taps (FCM `data` or Notifee `data`). */
export function navigateFromNotificationData(
  data: Record<string, string | object | undefined> | null | undefined,
): void {
  if (!data || typeof data !== 'object') {
    return;
  }
  const screen =
    typeof data.screen === 'string'
      ? data.screen
      : typeof data.link === 'string'
        ? data.link
        : undefined;
  if (!screen || !rootNavigationRef.isReady()) {
    return;
  }
  const lower = screen.toLowerCase();
  if (lower === 'notifications' || lower === 'notification') {
    rootNavigationRef.navigate('Notifications');
  }
}
