import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesError,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import {
  PRO_ENTITLEMENT_ID,
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_IOS_API_KEY,
  REVENUECAT_PRODUCT_IDS,
} from '../../config/revenuecat';

export type RcPurchaseResult =
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; message: string; cancelled: boolean };

class RevenueCatService {
  private configured = false;

  async configure(): Promise<void> {
    if (this.configured) {
      return;
    }

    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.WARN);
    const apiKey =
      Platform.OS === 'ios' ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;
    await Purchases.configure({
      apiKey,
    });
    this.configured = true;
  }

  async logIn(appUserId: string): Promise<void> {
    await Purchases.logIn(appUserId);
  }

  async logOut(): Promise<void> {
    await Purchases.logOut();
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    return Purchases.getCustomerInfo();
  }

  async getProducts(): Promise<PurchasesStoreProduct[]> {
    const ids = Object.values(REVENUECAT_PRODUCT_IDS);
    return Purchases.getProducts(ids);
  }

  isProActive(customerInfo: CustomerInfo | null): boolean {
    if (!customerInfo) {
      return false;
    }
    return customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] != null;
  }

  async purchaseProduct(
    product: PurchasesStoreProduct,
  ): Promise<RcPurchaseResult> {
    try {
      const { customerInfo } = await Purchases.purchaseStoreProduct(product);
      return { ok: true, customerInfo };
    } catch (error) {
      const e = error as PurchasesError;
      const cancelled = e.userCancelled === true;
      return {
        ok: false,
        cancelled,
        message: cancelled ? 'Purchase was cancelled.' : e.message,
      };
    }
  }

  async restorePurchases(): Promise<RcPurchaseResult> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return { ok: true, customerInfo };
    } catch (error) {
      const e = error as PurchasesError;
      return { ok: false, cancelled: false, message: e.message };
    }
  }

  addCustomerInfoListener(listener: (info: CustomerInfo) => void): () => void {
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }
}

export const revenueCatService = new RevenueCatService();

