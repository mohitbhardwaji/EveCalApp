/**
 * Walks up to the root stack that hosts `Notifications` (tabs nest inside Main).
 */
export function navigateToNotifications(navigation: {
  getParent?: () => unknown;
}): void {
  let current: {
    getParent?: () => unknown;
    getState?: () => { routeNames?: string[] };
    navigate?: (name: string) => void;
  } = navigation as {
    getParent?: () => unknown;
    getState?: () => { routeNames?: string[] };
    navigate?: (name: string) => void;
  };

  for (let i = 0; i < 8; i += 1) {
    const parent = current?.getParent?.() as typeof current | undefined;
    if (!parent) {
      break;
    }
    const names = parent.getState?.()?.routeNames;
    if (names?.includes('Notifications')) {
      parent.navigate?.('Notifications');
      return;
    }
    current = parent;
  }
}
