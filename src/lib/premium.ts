import type { User } from '@supabase/supabase-js';
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

const TRIAL_DAYS = 7;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function pickTrialStartMs(user: User | null, userData: UserData | null): number | null {
  const fromProfile = [
    userData?.trial_started_at,
    userData?.created_at,
    userData?.inserted_at,
  ];
  for (const raw of fromProfile) {
    if (typeof raw === 'string' && raw.length > 0) {
      const ms = Date.parse(raw);
      if (!Number.isNaN(ms)) {
        return ms;
      }
    }
  }
  if (typeof user?.created_at === 'string' && user.created_at.length > 0) {
    const ms = Date.parse(user.created_at);
    if (!Number.isNaN(ms)) {
      return ms;
    }
  }
  return null;
}

export function getTrialDaysRemaining(
  user: User | null,
  userData: UserData | null,
): number {
  const startMs = pickTrialStartMs(user, userData);
  if (!startMs) {
    return TRIAL_DAYS;
  }
  const endMs = startMs + TRIAL_DAYS * ONE_DAY_MS;
  const remainingMs = endMs - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.ceil(remainingMs / ONE_DAY_MS);
}

export function isTrialExpired(
  user: User | null,
  userData: UserData | null,
): boolean {
  return getTrialDaysRemaining(user, userData) <= 0;
}
