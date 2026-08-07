import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, isLoggedIn, clearTokens } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());

  const refreshAuth = useCallback(() => {
    setUser(getCurrentUser());
    setLoggedIn(isLoggedIn());
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setLoggedIn(false);
  }, []);

  // Listen for storage changes (e.g. login in another tab)
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
