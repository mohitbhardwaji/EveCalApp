import {
  REVENUECAT_ANDROID_API_KEY as REVENUECAT_ANDROID_API_KEY_ENV,
  REVENUECAT_IOS_API_KEY as REVENUECAT_IOS_API_KEY_ENV,
  REVENUECAT_PRO_ENTITLEMENT_ID as REVENUECAT_PRO_ENTITLEMENT_ID_ENV,
} from '@env';

export const REVENUECAT_IOS_API_KEY = (REVENUECAT_IOS_API_KEY_ENV ?? '').trim();
export const REVENUECAT_ANDROID_API_KEY = (
  REVENUECAT_ANDROID_API_KEY_ENV ?? ''
).trim();

/** Must exactly match the entitlement identifier configured in RevenueCat. */
export const PRO_ENTITLEMENT_ID = (
  REVENUECAT_PRO_ENTITLEMENT_ID_ENV ?? 'pro'
).trim();

/** Product identifiers configured in stores and mirrored in RevenueCat. */
export const REVENUECAT_PRODUCT_IDS = {
  lifetime: 'lifetime',
  yearly: 'yearly',
  monthly: 'monthly',
} as const;

