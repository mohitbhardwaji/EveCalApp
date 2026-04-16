import {
  PAYWALL_RESULT,
  presentCustomerCenter,
  presentPaywallIfNeeded,
} from 'react-native-purchases-ui';
import { PRO_ENTITLEMENT_ID } from '../../config/revenuecat';

export async function presentProPaywall(): Promise<{
  unlocked: boolean;
  result: PAYWALL_RESULT;
}> {
  const result = await presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
  });
  return {
    unlocked:
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED ||
      result === PAYWALL_RESULT.NOT_PRESENTED,
    result,
  };
}

export async function openCustomerCenter(): Promise<void> {
  await presentCustomerCenter();
}

