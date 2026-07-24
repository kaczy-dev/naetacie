/**
 * Google Sign-In integration using Firebase Authentication.
 * Handles first-time login (profile creation) and re-authentication (idempotent).
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import { getClientAuth, getClientFirestore } from '@/lib/firebase/client';
import type { AuthResult, LoginResult } from './types';

// --- Types ---

export interface GoogleSignInResult extends LoginResult {
  isNewUser: boolean;
}

// --- Constants ---

const OAUTH_CANCELLED_CODES = [
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
];

const SERVICE_UNAVAILABLE_CODES = [
  'auth/network-request-failed',
  'auth/internal-error',
  'auth/too-many-requests',
  'auth/popup-blocked',
  'auth/invalid-api-key',
  'auth/api-key-not-valid',
];

// --- Public API ---

/**
 * Sign in with Google using Firebase popup flow.
 */
export async function signInWithGoogle(): Promise<AuthResult<GoogleSignInResult>> {
  const auth = typeof getClientAuth === 'function' ? getClientAuth() : null;
  if (!auth) {
    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Konto Google nie zostało skonfigurowane. Aplikacja działa w trybie odczytu (Gość).',
      },
    };
  }

  const provider = new GoogleAuthProvider();
  let credential: UserCredential;

  try {
    credential = await signInWithPopup(auth, provider);
  } catch (error: unknown) {
    return handleGoogleAuthError(error);
  }

  const user = credential.user;
  let isNewUser = false;

  try {
    const firestore = getClientFirestore();
    if (firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // First-time Google login: create user profile
        const now = Timestamp.now();
        await setDoc(userDocRef, {
          uid: user.uid,
        email: user.email!,
        display_name: user.displayName || user.email!.split('@')[0],
        tier: 'free',
        auth_provider: 'google',
        email_verified: true,
        created_at: now,
        updated_at: now,
        notification_prefs: null,
      });
      isNewUser = true;
    }
  }
  // If profile exists, do nothing (idempotent re-authentication)
  } catch (error: unknown) {
    console.error('Failed to check/create user profile in Firestore:', error);
    // Auth succeeded even if Firestore profile creation failed
  }

  try {
    const idToken = await user.getIdToken();
    return {
      success: true,
      data: { uid: user.uid, email: user.email!, idToken, isNewUser },
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

function handleGoogleAuthError(
  error: unknown
): { success: false; error: { code: 'authentication_failed' | 'service_unavailable'; message: string } } {
  const firebaseError = error as { code?: string };
  const errorCode = firebaseError.code || '';

  // OAuth cancelled by user — return gracefully without error message
  if (OAUTH_CANCELLED_CODES.includes(errorCode)) {
    return {
      success: false,
      error: {
        code: 'authentication_failed',
        message: '',
      },
    };
  }

  if (SERVICE_UNAVAILABLE_CODES.includes(errorCode)) {
    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Service temporarily unavailable. Please try again later.',
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'authentication_failed',
      message: 'Google sign-in failed. Please try again.',
    },
  };
}
