import { PermissionsAndroid, Platform } from 'react-native';
import { OneSignal, LogLevel } from 'react-native-onesignal';
import { ONESIGNAL_APP_ID } from '../config/onesignal';
import { registerUserDevicePushToken } from '../lib/supabase/userDevicesApi';
import { navigateFromNotificationData } from '../navigation/rootNavigationRef';

type OneSignalAdditionalData = Record<string, unknown> | undefined;

function additionalDataToPlainRecord(
  additionalData: OneSignalAdditionalData,
): Record<string, string | object | undefined> {
  if (!additionalData || typeof additionalData !== 'object') {
    return {};
  }
  const out: Record<string, string | object | undefined> = {};
  for (const [k, v] of Object.entries(additionalData)) {
    if (v == null) {
      out[k] = undefined;
    } else if (typeof v === 'string') {
      out[k] = v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v);
    } else {
      out[k] = v as object;
    }
  }
  return out;
}

class OneSignalService {
  private bootstrapped = false;
  private lastSavedToken: string | null = null;
  private lastSyncedUserId: string | null = null;

  async bootstrap(): Promise<void> {
    if (this.bootstrapped) {
      return;
    }
    const appId = ONESIGNAL_APP_ID.trim();
    if (!appId || appId === 'YOUR_ONESIGNAL_APP_ID') {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[OneSignal] app id missing');
      }
      return;
    }
    this.bootstrapped = true;

    if (__DEV__) {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    } else {
      OneSignal.Debug.setLogLevel(LogLevel.Warn);
    }

    OneSignal.initialize(appId);
    OneSignal.User.pushSubscription.optIn();

    await this.requestSystemNotificationPermission();

    // Tap handling -> keep existing deep-link navigation format.
    OneSignal.Notifications.addEventListener('click', event => {
      try {
        const additionalData = event?.notification?.additionalData as
          | OneSignalAdditionalData
          | undefined;
        navigateFromNotificationData(additionalDataToPlainRecord(additionalData));
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[OneSignal] click handler error', e);
        }
      }
    });

    // Foreground notifications (optional): allow OneSignal to display them as usual.
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', event => {
      try {
        event.getNotification().display();
      } catch {
        // ignore
      }
    });

    // Save the push token to Supabase when available/rotates.
    await this.syncTokenToBackend();
    OneSignal.User.pushSubscription.addEventListener('change', () => {
      void this.syncTokenToBackend();
    });

    if (__DEV__) {
      const token = await OneSignal.User.pushSubscription.getTokenAsync();
      // eslint-disable-next-line no-console
      console.log('[OneSignal] bootstrapped', {
        platform: Platform.OS,
        appId,
        canRequestPermission: OneSignal.Notifications.canRequestPermission,
        permission: OneSignal.Notifications.permission,
        optedIn: OneSignal.User.pushSubscription.optedIn,
        tokenPresent: Boolean(token),
      });
    }
  }

  async requestSystemNotificationPermission(): Promise<void> {
    try {
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[OneSignal] android notification permission', { granted });
        }
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[OneSignal] android permission request error', e);
      }
    }

    try {
      if (OneSignal.Notifications.canRequestPermission) {
        await OneSignal.Notifications.requestPermission(true);
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[OneSignal] requestPermission error', e);
      }
    }
  }

  syncUser(userId: string | null | undefined): void {
    const appId = ONESIGNAL_APP_ID.trim();
    if (!appId || appId === 'YOUR_ONESIGNAL_APP_ID') {
      return;
    }
    const next = userId?.trim() ?? null;
    if (this.lastSyncedUserId === next) {
      return;
    }
    this.lastSyncedUserId = next;
    try {
      if (next) {
        OneSignal.login(next);
      } else {
        OneSignal.logout();
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[OneSignal] syncUser error', e);
      }
    }
  }

  private async syncTokenToBackend(): Promise<void> {
    try {
      const token = await OneSignal.User.pushSubscription.getTokenAsync();
      if (!token) {
        return;
      }
      if (token === this.lastSavedToken) {
        return;
      }
      this.lastSavedToken = token;

      const r = await registerUserDevicePushToken(token);
      if (!r.ok && __DEV__) {
        // eslint-disable-next-line no-console
        console.log('[OneSignal] registerUserDevicePushToken failed', r.message);
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[OneSignal] syncTokenToBackend error', e);
      }
    }
  }
}

export default new OneSignalService();

