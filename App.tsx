import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { EveCalTheme } from './src/theme/theme';
import { AuthProvider } from './src/state/auth/AuthProvider';
import Feather from 'react-native-vector-icons/Feather';

export default function App() {
  React.useEffect(() => {
    // iOS sometimes needs explicit font loading for react-native-vector-icons.
    // Without it, glyphs can render as "?".
    try {
      void Feather.loadFont();
    } catch {
      // No-op: if the native module isn't available, icons will fall back.
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <NavigationContainer theme={EveCalTheme.navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
