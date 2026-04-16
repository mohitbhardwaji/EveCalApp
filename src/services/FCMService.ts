import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission as requestFirebaseMessagingPermission,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
} from '@notifee/react-native';
import { navigateFromNotificationData } from '../navigation/rootNavigationRef';
import { registerUserDevicePushToken } from '../lib/supabase/userDevicesApi';
import { StorageKeys } from '../state/auth/storageKeys';

/** New id so devices pick up HIGH importance + default sound (channels are sticky once created). */
const NOTIFEE_CHANNEL_ID = 'evecal_alerts';
const NOTIF_ACCENT = '#2F8D77';

function getMessagingInstance(): ReturnType<typeof getMessaging> | null {
  try {
    return getMessaging(getApp());
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[FCM] Firebase not ready', e);
    }
    return null;
  }
}

function stringFromMessageField(v: unknown): string | undefined {
  if (v == null) {
    return undefined;
  }
  return typeof v === 'string' ? v : String(v);
}

function fcmDataToNotifeeData(
  data: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!data || typeof data !== 'object') {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v != null && typeof v === 'string' ? v : String(v);
  }
  return out;
}

/** Dev-only: log FCM `RemoteMessage` (foreground, open-from-background, cold start). */
function logFcmRemoteMessage(
  source: string,
  remoteMessage: RemoteMessage | null | undefined,
): void {
  if (!__DEV__) {
    return;
  }
  if (remoteMessage == null) {
    // eslint-disable-next-line no-console
    console.log(`[FCM notify] ${source}: (no RemoteMessage)`);
    return;
  }
  const { messageId, from, collapseKey, data, notification, sentTime, ttl } =
    remoteMessage;
  const dataPlain =
    data && typeof data === 'object'
      ? Object.fromEntries(
          Object.entries(data as Record<string, unknown>).map(([k, v]) => [
            k,
            typeof v === 'string' ? v : String(v),
          ]),
        )
      : undefined;
  const hasData = dataPlain != null && Object.keys(dataPlain).length > 0;
  const hasNotification =
    notification != null &&
    (notification.title != null || notification.body != null);
  // eslint-disable-next-line no-console
  console.log(`[FCM notify] ${source}`, {
    messageId,
    from,
    collapseKey,
    sentTime,
    ttl,
    hasNotificationBlock: notification != null,
    notificationTitle: notification?.title,
    notificationBody: notification?.body,
    dataKeys: dataPlain ? Object.keys(dataPlain) : [],
    data: dataPlain,
    hasPayload: hasNotification || hasData,
  });
}

class FCMService {
  fcmToken: string | null = null;
  private messageHandlersAttached = false;

  async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'ios' && __DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] Use a real iOS device for FCM token (simulator is limited).');
      }

      let hasPermission: boolean;
      if (Platform.OS === 'ios') {
        hasPermission = await this.requestPermission();
        if (!hasPermission) {
          this.setupMessageHandlers();
          return;
        }
        try {
          const messaging = getMessagingInstance();
          if (messaging) {
            await registerDeviceForRemoteMessages(messaging);
          }
        } catch (e) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[FCM] registerDeviceForRemoteMessages failed', e);
          }
        }
      } else {
        const messaging = getMessagingInstance();
        if (!messaging) {
          this.setupMessageHandlers();
          return;
        }
        await registerDeviceForRemoteMessages(messaging);
        hasPermission = await this.requestPermission();
      }

      if (hasPermission) {
        await this.ensureNotifeeReady();
        await this.getFCMToken();
        if (Platform.OS === 'ios' && !this.fcmToken) {
          await new Promise<void>(resolve => setTimeout(resolve, 2000));
          await this.getFCMToken();
        }
        if (this.fcmToken) {
          await this.sendTokenToBackend(this.fcmToken);
        }
      }
      this.setupMessageHandlers();
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] initialize error', e);
      }
      try {
        this.setupMessageHandlers();
      } catch {
        // ignore
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }

      if (Platform.OS === 'ios') {
        const messaging = getMessagingInstance();
        if (!messaging) {
          return false;
        }
        const authStatus = await requestFirebaseMessagingPermission(messaging);
        return (
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL
        );
      }

      return false;
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] requestPermission error', e);
      }
      return false;
    }
  }

  async getFCMToken(): Promise<string | null> {
    try {
      const messaging = getMessagingInstance();
      if (!messaging) {
        return null;
      }
      const token = await getToken(messaging);
      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem(StorageKeys.fcmToken, token);
        return token;
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] getFCMToken error', e);
      }
    }
    return null;
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const result = await registerUserDevicePushToken(token);
      if (!result.ok && __DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] registerUserDevicePushToken', result.message);
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] sendTokenToBackend error', e);
      }
    }
  }

  async ensureNotifeeReady(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await notifee.requestPermission();
      }
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: NOTIFEE_CHANNEL_ID,
          name: 'Eve Cal reminders',
          description: 'Updates and gentle reminders. Uses your default notification sound.',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          vibrationPattern: [300, 500],
          lights: true,
          lightColor: NOTIF_ACCENT,
        });
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] ensureNotifeeReady error', e);
      }
    }
  }

  setupMessageHandlers(): void {
    if (this.messageHandlersAttached) {
      return;
    }
    this.messageHandlersAttached = true;

    try {
      try {
        notifee.onForegroundEvent(({ type, detail }) => {
          try {
            if (__DEV__) {
              const n = detail.notification;
              // eslint-disable-next-line no-console
              console.log('[FCM notify] notifee:foreground', {
                eventType: type,
                notificationId: n?.id,
                title: n?.title,
                body: n?.body,
                data: n?.data,
              });
            }
            if (type === EventType.PRESS && detail.notification?.data) {
              navigateFromNotificationData(
                detail.notification.data as Record<string, string | object | undefined>,
              );
            }
          } catch (e) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log('[FCM] onForegroundEvent error', e);
            }
          }
        });
        void notifee
          .getInitialNotification()
          .then(initial => {
            if (__DEV__ && initial?.notification) {
              const n = initial.notification;
              // eslint-disable-next-line no-console
              console.log('[FCM notify] notifee:initial (app opened from tray)', {
                title: n.title,
                body: n.body,
                data: n.data,
              });
            }
            if (initial?.notification?.data) {
              navigateFromNotificationData(
                initial.notification.data as Record<string, string | object | undefined>,
              );
            }
          })
          .catch(() => {});
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[FCM] Notifee listeners error', e);
        }
      }

      const messaging = getMessagingInstance();
      if (!messaging) {
        return;
      }

      onMessage(messaging, async remoteMessage => {
        try {
          logFcmRemoteMessage('onMessage (foreground)', remoteMessage);
          await this.showNotification(remoteMessage);
        } catch (e) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[FCM] onMessage error', e);
          }
        }
      });

      onNotificationOpenedApp(messaging, remoteMessage => {
        try {
          logFcmRemoteMessage(
            'onNotificationOpenedApp (from background)',
            remoteMessage,
          );
          this.handleNotificationTap(remoteMessage);
        } catch (e) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[FCM] onNotificationOpenedApp error', e);
          }
        }
      });

      void getInitialNotification(messaging)
        .then(remoteMessage => {
          if (remoteMessage) {
            logFcmRemoteMessage(
              'getInitialNotification (FCM, cold start)',
              remoteMessage,
            );
            this.handleNotificationTap(remoteMessage);
          } else if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log(
              '[FCM notify] getInitialNotification (FCM): no message (normal cold start)',
            );
          }
        })
        .catch(() => {});

      onTokenRefresh(messaging, async token => {
        try {
          this.fcmToken = token;
          await AsyncStorage.setItem(StorageKeys.fcmToken, token);
          await this.sendTokenToBackend(token);
        } catch (e) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[FCM] onTokenRefresh error', e);
          }
        }
      });
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] setupMessageHandlers error', e);
      }
    }
  }

  private async showNotification(remoteMessage: RemoteMessage): Promise<void> {
    try {
      const { notification, data } = remoteMessage || {};
      const title =
        notification?.title ??
        stringFromMessageField(data?.title) ??
        stringFromMessageField(data?.notification_title) ??
        'Eve Cal';
      const body =
        notification?.body ??
        stringFromMessageField(data?.body) ??
        stringFromMessageField(data?.message) ??
        stringFromMessageField(data?.notification_body) ??
        'New notification';

      try {
        await this.ensureNotifeeReady();
        const notifeeData = fcmDataToNotifeeData(
          data as Record<string, unknown> | undefined,
        );
        await notifee.displayNotification({
          title,
          body,
          data: notifeeData,
          android: {
            channelId: NOTIFEE_CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default' },
            color: NOTIF_ACCENT,
            autoCancel: true,
            showTimestamp: true,
            sound: 'default',
            style: {
              type: AndroidStyle.BIGTEXT,
              text: body,
            },
          },
          ios: {
            sound: 'default',
            foregroundPresentationOptions: {
              sound: true,
              banner: true,
              list: true,
              badge: true,
            },
          },
        });
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[FCM] showNotification Notifee error', e);
        }
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] showNotification error', e);
      }
    }
  }

  private handleNotificationTap(remoteMessage: RemoteMessage): void {
    try {
      const data = remoteMessage?.data ?? {};
      navigateFromNotificationData(
        data as Record<string, string | object | undefined>,
      );
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FCM] handleNotificationTap error', e);
      }
    }
  }

  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  async refreshToken(): Promise<string | null> {
    return this.getFCMToken();
  }
}

export default new FCMService();
