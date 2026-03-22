/**
 * Holds category context when navigating from Path → Task List → Capture (+).
 * Avoids stale params on the Capture tab when switching tabs.
 */
export type CaptureCategoryIntent = {
  categoryId: string;
  categoryTitle: string;
  kicker: string;
  tint: string;
  /** Feather icon name (matches Path cards). */
  icon: string;
};

let pending: CaptureCategoryIntent | null = null;

export function setCaptureCategoryIntent(intent: CaptureCategoryIntent) {
  pending = intent;
}

export function consumeCaptureCategoryIntent(): CaptureCategoryIntent | null {
  const next = pending;
  pending = null;
  return next;
}
