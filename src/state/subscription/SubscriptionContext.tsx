import type { CustomerInfo, PurchasesStoreProduct } from 'react-native-purchases';
import React from 'react';

export type SubscriptionContextValue = {
  loading: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  products: PurchasesStoreProduct[];
  refresh: () => Promise<void>;
};

export const SubscriptionContext = React.createContext<
  SubscriptionContextValue | undefined
>(undefined);

export function useSubscription() {
  const ctx = React.useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return ctx;
}

