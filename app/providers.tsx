'use client';

/**
 * Client-side providers wrapper for the app.
 * Nesting order: AuthProvider > ThemeProvider > ToastProvider > children
 */

import { type ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ToastProvider } from '@/components/feedback/ToastProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
