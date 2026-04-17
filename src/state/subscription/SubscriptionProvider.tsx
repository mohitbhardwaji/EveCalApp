import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { revenueCatService } from '../../services/revenuecat/RevenueCatService';
import { SubscriptionContext } from './SubscriptionContext';

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthed, isHydrated } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [isPro, setIsPro] = React.useState(false);
  const [customerInfo, setCustomerInfo] = React.useState<Awaited<
    ReturnType<typeof revenueCatService.getCustomerInfo>
  > | null>(null);
  const [products, setProducts] = React.useState<
    Awaited<ReturnType<typeof revenueCatService.getProducts>>
  >([]);
  const lastAuthUserIdRef = React.useRef<string | null>(null);

  const refresh = React.useCallback(async () => {
    const [info, loadedProducts] = await Promise.all([
      revenueCatService.getCustomerInfo(),
      revenueCatService.getProducts(),
    ]);
    setCustomerInfo(info);
    setProducts(loadedProducts);
    setIsPro(revenueCatService.isProActive(info));
  }, []);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }
    const appUserId = user?.id ?? null;
    const prevUserId = lastAuthUserIdRef.current;

    void (async () => {
      setLoading(true);
      try {
        await revenueCatService.configure();
        // Critical mapping: RevenueCat app_user_id == Supabase user.id
        if (prevUserId && appUserId == null) {
          await revenueCatService.logOut();
        } else if (appUserId && appUserId !== prevUserId) {
          await revenueCatService.logIn(appUserId);
        }
        await refresh();
      } catch {
        if (!isAuthed) {
          setIsPro(false);
          setCustomerInfo(null);
        }
      } finally {
        lastAuthUserIdRef.current = appUserId;
        setLoading(false);
      }
    })();
  }, [isAuthed, isHydrated, refresh, user?.id]);

  React.useEffect(() => {
    const unsubscribe = revenueCatService.addCustomerInfoListener(info => {
      setCustomerInfo(info);
      setIsPro(revenueCatService.isProActive(info));
    });
    return unsubscribe;
  }, []);

  const value = React.useMemo(
    () => ({
      loading,
      isPro,
      customerInfo,
      products,
      refresh,
    }),
    [customerInfo, isPro, loading, products, refresh],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

