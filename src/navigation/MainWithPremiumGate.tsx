import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';
import { useShouldShowPremiumModal } from './RootNavigator';

export function MainWithPremiumGate() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const shouldShowPremium = useShouldShowPremiumModal();

  React.useEffect(() => {
    if (shouldShowPremium) {
      navigation.navigate('Premium');
    }
  }, [navigation, shouldShowPremium]);

  return <MainTabs />;
}

