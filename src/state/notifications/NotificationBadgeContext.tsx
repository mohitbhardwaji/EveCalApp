import React from 'react';
import { getUnreadNotificationCount } from '../../lib/supabase/notificationsApi';
import { useAuth } from '../auth/AuthContext';

type NotificationBadgeContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationBadgeContext =
  React.createContext<NotificationBadgeContextValue | null>(null);

export function NotificationBadgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isHydrated } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(0);

  const refreshUnreadCount = React.useCallback(async () => {
    if (!isHydrated || user == null) {
      setUnreadCount(0);
      return;
    }
    const result = await getUnreadNotificationCount();
    setUnreadCount(result.ok ? result.count : 0);
  }, [isHydrated, user]);

  React.useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  const value = React.useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [unreadCount, refreshUnreadCount],
  );

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadge(): NotificationBadgeContextValue {
  const ctx = React.useContext(NotificationBadgeContext);
  if (ctx == null) {
    throw new Error(
      'useNotificationBadge must be used within NotificationBadgeProvider',
    );
  }
  return ctx;
}
