/**
 * Client Firebase config from `src/config/firebase.json` (public keys only).
 *
 * Do **not** put the Firebase **Admin** SDK JSON (`*adminsdk*.json`) in the app —
 * it contains `private_key` and must only run on a server.
 *
 * Native FCM still uses `android/app/google-services.json` and
 * `ios/eve_call/GoogleService-Info.plist` at build time.
 */
import firebase from '@react-native-firebase/app';
import raw from '../../config/firebase.json';

type FirebaseClientJson = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  /** Web Push only; ignored on native FCM. */
  vapidKey?: string;
};

const cfg = raw as FirebaseClientJson;

export const firebaseConfig = {
  apiKey: cfg.apiKey ?? '',
  authDomain: cfg.authDomain ?? '',
  projectId: cfg.projectId ?? '',
  storageBucket: cfg.storageBucket ?? '',
  messagingSenderId: cfg.messagingSenderId ?? '',
  appId: cfg.appId ?? '',
};

export const firebaseVapidKey = cfg.vapidKey ?? '';

export const app = firebase.app();
