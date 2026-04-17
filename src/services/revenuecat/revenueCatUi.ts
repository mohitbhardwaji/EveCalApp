import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { PRO_ENTITLEMENT_ID } from '../../config/revenuecat';

export async function presentPaywall(): Promise<{
  unlocked: boolean;
  result: PAYWALL_RESULT;
}> {
  const result = await RevenueCatUI.presentPaywall();
  return {
    unlocked:
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED,
    result,
  };
}

export async function presentProPaywall(): Promise<{
  unlocked: boolean;
  result: PAYWALL_RESULT;
}> {
  const result = await RevenueCatUI.presentPaywallIfNeeded({
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
  await RevenueCatUI.presentCustomerCenter();
}

