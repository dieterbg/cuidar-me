"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthContextType as AuthHookType } from '@/hooks/use-auth';

// Renomeando para evitar conflito de nomes no escopo
interface AuthContextType extends AuthHookType {}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
