/**
 * Client-side Firebase Authentication functions.
 * Safe to import in 'use client' components and pages.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

import { clientAuth, getClientFirestore, isFirebaseConfigValid } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/types/user';
import type { AuthResult, AuthError, RegistrationResult, LoginResult } from './types';

// --- Constants ---

const MAX_DISPLAY_NAME_LENGTH = 100;

const EMAIL_EXISTS_CODES = [
  'auth/email-already-in-use',
  'auth/email-already-exists',
];

const INVALID_CREDENTIAL_CODES = [
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-credential',
  'auth/invalid-email',
  'auth/user-disabled',
];

const SERVICE_UNAVAILABLE_CODES = [
  'auth/network-request-failed',
  'auth/internal-error',
  'auth/too-many-requests',
  'auth/invalid-api-key',
  'auth/api-key-not-valid',
];

// --- Public API ---

export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult<RegistrationResult>> {
  if (typeof isFirebaseConfigValid === 'function' && !isFirebaseConfigValid()) {
    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Serwer rejestracji nie jest skonfigurowany. Aplikacja działa w trybie odczytu (Gość).',
      },
    };
  }

  const truncatedDisplayName = displayName.slice(0, MAX_DISPLAY_NAME_LENGTH);
  let credential: UserCredential;

  try {
    credential = await createUserWithEmailAndPassword(clientAuth, email, password);
  } catch (error: unknown) {
    return handleAuthError(error, 'registration_failed');
  }

  const user = credential.user;

  try {
    const firestore = getClientFirestore();
    if (firestore) {
      const now = Timestamp.now();
      const userProfile: Omit<UserProfile, 'created_at' | 'updated_at'> & {
        created_at: typeof now;
        updated_at: typeof now;
      } = {
        uid: user.uid,
        email: user.email!,
        display_name: truncatedDisplayName,
        role: 'candidate',
        tier: 'free',
        auth_provider: 'email',
        email_verified: false,
        created_at: now,
        updated_at: now,
        notification_prefs: null,
      };

      await setDoc(doc(firestore, 'users', user.uid), userProfile);
    }
  } catch (error: unknown) {
    console.error('Failed to create user profile in Firestore:', error);
  }

  try {
    const idToken = await user.getIdToken();
    return {
      success: true,
      data: { uid: user.uid, email: user.email!, idToken },
    };
  } catch {
    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Service temporarily unavailable. Please try again later.',
      },
    };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult<LoginResult>> {
  if (typeof isFirebaseConfigValid === 'function' && !isFirebaseConfigValid()) {
    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Serwer logowania nie jest skonfigurowany. Aplikacja działa w trybie odczytu (Gość).',
      },
    };
  }

  let credential: UserCredential;

  try {
    credential = await signInWithEmailAndPassword(clientAuth, email, password);
  } catch (error: unknown) {
    return handleAuthError(error, 'authentication_failed');
  }

  const user = credential.user;

  try {
    const idToken = await user.getIdToken();
    return {
      success: true,
      data: { uid: user.uid, email: user.email!, idToken },
    };
  } catch {
    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Service temporarily unavailable. Please try again later.',
      },
    };
  }
}

// --- Internal Helpers ---

function handleAuthError(
  error: unknown,
  defaultCode: 'registration_failed' | 'authentication_failed'
): { success: false; error: AuthError } {
  const firebaseError = error as { code?: string };
  const errorCode = firebaseError.code || '';

  if (SERVICE_UNAVAILABLE_CODES.includes(errorCode)) {
    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Service temporarily unavailable. Please try again later.',
      },
    };
  }

  if (EMAIL_EXISTS_CODES.includes(errorCode)) {
    return {
      success: false,
      error: {
        code: 'registration_failed',
        message: 'Registration failed. Please check your information and try again.',
      },
    };
  }

  if (INVALID_CREDENTIAL_CODES.includes(errorCode)) {
    return {
      success: false,
      error: {
        code: 'authentication_failed',
        message: 'Authentication failed. Please check your credentials and try again.',
      },
    };
  }

  return {
    success: false,
    error: {
      code: defaultCode,
      message:
        defaultCode === 'registration_failed'
          ? 'Registration failed. Please check your information and try again.'
          : 'Authentication failed. Please check your credentials and try again.',
    },
  };
}
