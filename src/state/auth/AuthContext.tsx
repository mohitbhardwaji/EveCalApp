import React from 'react';
import type { AuthActions, AuthState } from './types';

export const AuthContext = React.createContext<
  (AuthState & AuthActions) | undefined
>(undefined);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

