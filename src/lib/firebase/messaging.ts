/**
 * FCM on device — `@react-native-firebase/messaging` (native registration token).
 *
 * This is **not** the web Firebase SDK: do not use `Notification.requestPermission()` or
 * `getToken(messaging, { vapidKey })` here; VAPID is for web push only. Native iOS/Android
 * use APNs + FCM as configured in Firebase Console (plist / google-services.json).
 */
import messaging from '@react-native-firebase/messaging';
import FCMService from '../../services/FCMService';
import { registerUserDevicePushToken } from '../supabase/userDevicesApi';

/** Default app messaging instance (namespaced API). */
export function getMessaging() {
  return messaging();
}

/**
 * Requests notification permission (via `FCMService`), returns the FCM device token, or `undefined`.
 * Does not write to Supabase — use `registerPushTokenWithSupabase()` for that.
 */
export async function generateToken(): Promise<string | undefined> {
  try {
    await FCMService.initialize();
    const token =
      FCMService.getCurrentToken() ?? (await FCMService.refreshToken());
    if (token && __DEV__) {
      // eslint-disable-next-line no-console
      console.log('FCM Token:', token);
    }
    if (!token) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('Permission denied or FCM token unavailable');
      }
    }
    return token ?? undefined;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting token:', error);
    return undefined;
  }
}

/**
 * Same as your web flow: get FCM token, then `user_devices` insert for the signed-in user.
 */
export async function registerPushTokenWithSupabase(): Promise<
  { ok: true; token: string } | { ok: false; message: string }
> {
  const token = await generateToken();
  if (!token) {
    return {
      ok: false,
      message:
        'Could not get a push token. Allow notifications and ensure Firebase is configured.',
    };
  }
  const saved = await registerUserDevicePushToken(token);
  if (!saved.ok) {
    return saved;
  }
  return { ok: true, token };
}
