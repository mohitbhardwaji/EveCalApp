/**
 * Walks up the navigation tree to the root stack that hosts `Settings`
 * (needed when Journal/Path use nested stacks inside tabs).
 */
export function navigateToRootSettings(navigation: {
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

  for (let i = 0; i < 8; i++) {
    const parent = current?.getParent?.() as typeof current | undefined;
    if (!parent) break;
    const names = parent.getState?.()?.routeNames;
    if (names?.includes('Settings')) {
      parent.navigate?.('Settings');
      return;
    }
    current = parent;
  }
}
