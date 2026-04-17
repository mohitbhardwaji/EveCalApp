import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const appLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ['evecal://'],
  config: {
    screens: {
      SubscriptionConfirm: 'subscription',
    },
  },
};
