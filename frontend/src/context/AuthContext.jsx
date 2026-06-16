import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService.js';

/**
 * Auth Context — Singleton-like global state for the authenticated user.
 *
 * Provides:
 *   user        — the current user object (null if logged out)
 *   login()     — authenticate, persist tokens, set user state
 *   logout()    — clear all stored auth data
 *   isDriver    — convenience boolean
 *   isAdmin     — convenience boolean
 *   isPassenger — convenience boolean
 *   loading     — true while restoring session on page refresh
 *
 * Token storage: localStorage (acceptable for an academic project;
 * production hardening = httpOnly cookies + CSRF tokens).
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);   // restoring session

  // ── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('accessToken');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data: res } = await authService.login({ email, password });
    const { accessToken, refreshToken, ...userData } = res.data;

    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user',         JSON.stringify(userData));

    setUser(userData);
    return userData;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* best effort */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // ── Refresh user profile (after status change etc.) ───────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const { data: res } = await authService.me();
      const updated = res.data;
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch (err) {
      // 401 = token is stale/invalid (e.g. DB was reset, user deleted).
      // Clear everything and force re-login so the app doesn't stay broken.
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
      }
      // Other errors (network, 500): keep existing user state silently
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isDriver:    user?.role === 'DRIVER',
    isAdmin:     user?.role === 'ADMIN',
    isPassenger: user?.role === 'PASSENGER',
    isLoggedIn:  !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}