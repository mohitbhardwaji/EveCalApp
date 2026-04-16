/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

try {
  const messaging = getMessaging(getApp());
  setBackgroundMessageHandler(messaging, async () => {
    // Data-only / notification messages while backgrounded (native display when applicable).
  });
} catch {
  // Firebase not configured in this build — app still runs.
}

AppRegistry.registerComponent(appName, () => App);
