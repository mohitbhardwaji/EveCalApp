import type { UserData } from '../state/auth/types';

/** Treats active expiry as premium even if `is_premium` is stale. */
export function isPremiumUser(userData: UserData | null): boolean {
  if (!userData) {
    return false;
  }
  if (userData.is_premium === true) {
    return true;
  }
  const raw = userData.premium_expires_at;
  if (typeof raw === 'string' && raw.length > 0) {
    const ms = Date.parse(raw);
    if (!Number.isNaN(ms) && ms > Date.now()) {
      return true;
    }
  }
  return false;
}
