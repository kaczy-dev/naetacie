/**
 * Shared types for the auth module (used by both client and server).
 */

export type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; error: AuthError };

export interface AuthError {
  code: 'registration_failed' | 'authentication_failed' | 'service_unavailable';
  message: string;
}

export interface RegistrationResult {
  uid: string;
  email: string;
  idToken: string;
}

export interface LoginResult {
  uid: string;
  email: string;
  idToken: string;
}

export interface TokenVerificationResult {
  uid: string;
  email: string;
}
