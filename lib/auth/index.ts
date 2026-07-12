/**
 * Auth module barrel export.
 *
 * Client-side functions (registerUser, loginUser) are in ./client.ts
 * Server-side functions (verifyIdToken) are in ./server.ts
 * Auth context (AuthProvider, useAuth) is in ./AuthContext.tsx
 * Shared types are in ./types.ts
 *
 * IMPORTANT: Do not import this file in client components!
 * - Client components should import from '@/lib/auth/client' or '@/lib/auth/AuthContext'
 * - API routes/server components should import from '@/lib/auth/server'
 */

export { registerUser, loginUser } from './client';
export { verifyIdToken } from './server';
export { AuthProvider, useAuth } from './AuthContext';
export type { AuthState, AuthContextValue } from './AuthContext';
export type {
  AuthResult,
  AuthError,
  RegistrationResult,
  LoginResult,
  TokenVerificationResult,
} from './types';
