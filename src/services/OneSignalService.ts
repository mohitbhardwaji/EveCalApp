import { Platform } from 'react-native';
import OneSignal from 'react-native-onesignal';
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

  async bootstrap(): Promise<void> {
    if (this.bootstrapped) {
      return;
    }
    this.bootstrapped = true;

    OneSignal.initialize(ONESIGNAL_APP_ID);

    // iOS requires prompting; Android auto-grants on < 13 and prompts on 13+.
    // We ask on both to keep behavior consistent.
    try {
      await OneSignal.Notifications.requestPermission(true);
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[OneSignal] requestPermission error', e);
      }
    }

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
      // eslint-disable-next-line no-console
      console.log('[OneSignal] bootstrapped', { platform: Platform.OS });
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

