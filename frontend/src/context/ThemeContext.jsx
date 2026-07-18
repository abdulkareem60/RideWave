import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * ThemeContext — single source of truth for light/dark mode across the
 * entire app.
 *
 * Resolution order on first visit:
 *   1. localStorage('theme') — explicit user choice, persists across
 *      refresh, logout, and login (it's a device preference, not tied
 *      to the authenticated user).
 *   2. prefers-color-scheme media query — system preference.
 *   3. 'light' — final fallback.
 *
 * No-flicker: index.html runs an inline script (before React mounts)
 * that applies the same resolution logic directly to <html class="dark">.
 * This context then reads that already-applied class on mount instead of
 * re-deciding, so there's no flash of the wrong theme while React boots.
 */

const ThemeContext = createContext(null);

const STORAGE_KEY = 'theme';

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return getSystemPreference();
}

export function ThemeProvider({ children }) {
  // On mount, the <html> element already has the correct class applied by
  // the inline anti-flicker script in index.html — read it directly rather
  // than recomputing, so this never disagrees with what's already on screen.
  const [theme, setTheme] = useState(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
      return 'light';
    }
    // Fallback for non-browser/test environments or if the inline script
    // didn't run for some reason.
    return typeof window !== 'undefined' ? resolveInitialTheme() : 'light';
  });

  // Tracks whether the user has made an explicit choice (vs. just
  // following system preference). Only an explicit choice is persisted
  // as an override; otherwise we keep following the OS setting live.
  const [hasExplicitPreference, setHasExplicitPreference] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null
  );

  // Apply the class + color-scheme to <html> whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  // If the user has never made an explicit choice, keep following the
  // system preference live (e.g. they switch their OS from light to dark
  // while the tab is open).
  useEffect(() => {
    if (hasExplicitPreference) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [hasExplicitPreference]);

  const setExplicitTheme = useCallback((next) => {
    setTheme(next);
    setHasExplicitPreference(true);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setExplicitTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setExplicitTheme]);

  const resetToSystemPreference = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasExplicitPreference(false);
    setTheme(getSystemPreference());
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,                      // 'light' | 'dark'
        isDark: theme === 'dark',
        toggleTheme,
        setTheme: setExplicitTheme,
        resetToSystemPreference,
        hasExplicitPreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return ctx;
}