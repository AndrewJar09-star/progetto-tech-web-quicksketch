import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getCurrentUser, isLoggedIn, clearTokens } from '../api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loggedIn: boolean;
  refreshAuth: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isLoggedIn());

  const refreshAuth = useCallback(() => {
    setUser(getCurrentUser());
    setLoggedIn(isLoggedIn());
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setLoggedIn(false);
  }, []);

  useEffect(() => {
    const handler = () => refreshAuth();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={{ user, loggedIn, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
