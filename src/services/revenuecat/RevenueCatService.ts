import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesError,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import {
  PRO_ENTITLEMENT_ID,
  REVENUECAT_API_KEY,
  REVENUECAT_PRODUCT_IDS,
} from '../../config/revenuecat';

export type RcPurchaseResult =
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; message: string; cancelled: boolean };

class RevenueCatService {
  private configured = false;
  private configuredAppUserId: string | null = null;

  async configure(appUserId: string | null): Promise<void> {
    if (
      this.configured &&
      (this.configuredAppUserId ?? null) === (appUserId ?? null)
    ) {
      return;
    }

    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: appUserId ?? undefined,
    });
    this.configured = true;
    this.configuredAppUserId = appUserId ?? null;
  }

  async logIn(appUserId: string): Promise<void> {
    await Purchases.logIn(appUserId);
    this.configuredAppUserId = appUserId;
  }

  async logOut(): Promise<void> {
    await Purchases.logOut();
    this.configuredAppUserId = null;
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

