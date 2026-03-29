import type { User } from '@supabase/supabase-js';

/** Row from public `users` (loaded after `auth.getUser()`). */
export type UserData = Record<string, unknown>;

export type AuthState = {
  isAuthed: boolean;
  /** Set when signed in with Supabase (OAuth or phone). */
  user: User | null;
  /** Profile row from `users` when signed in with Supabase; null for guest or if missing. */
  userData: UserData | null;
  premiumSeen: boolean;
  isHydrated: boolean;
  /** Last OAuth / deep-link error (optional UI). */
  authError: string | null;
};

export type AuthActions = {
  signInWithGoogle: () => Promise<string | null>;
  signInWithApple: () => Promise<string | null>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  markPremiumSeen: () => Promise<void>;
  clearAuthError: () => void;
};
