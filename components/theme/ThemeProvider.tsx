'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'theme-preference';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Tailwind dark mode via class
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedMode = getStoredMode();
    setModeState(storedMode);

    const resolved = storedMode === 'system' ? getSystemTheme() : storedMode;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia(MEDIA_QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);

    const resolved = newMode === 'system' ? getSystemTheme() : newMode;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
