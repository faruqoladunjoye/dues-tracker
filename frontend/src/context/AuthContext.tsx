import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'scroll'] as const;

interface AuthContextValue {
  isAdmin: boolean;
  autoLoggedOut: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearAutoLogout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => !!localStorage.getItem('akoka_token'));
  const [autoLoggedOut, setAutoLoggedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem('akoka_token');
    setIsAdmin(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token } = await api.login(username, password);
    localStorage.setItem('akoka_token', token);
    setIsAdmin(true);
  }, []);

  const clearAutoLogout = useCallback(() => setAutoLoggedOut(false), []);

  // Idle-timeout effect — only active while admin is logged in
  useEffect(() => {
    if (!isAdmin) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
        setAutoLoggedOut(true);
      }, IDLE_TIMEOUT_MS);
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start the first countdown

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [isAdmin, logout]);

  return (
    <AuthContext.Provider value={{ isAdmin, autoLoggedOut, login, logout, clearAutoLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
