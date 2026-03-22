export type AuthState = {
  isAuthed: boolean;
  premiumSeen: boolean;
  isHydrated: boolean;
};

export type AuthActions = {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  markPremiumSeen: () => Promise<void>;
};

