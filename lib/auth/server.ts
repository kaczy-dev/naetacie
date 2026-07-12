/**
 * Server-side Firebase Authentication functions.
 * Only import in API routes and server components — NOT in 'use client' components.
 */

import { adminAuth } from '@/lib/firebase/admin';
import type { AuthResult, TokenVerificationResult } from './types';

export async function verifyIdToken(
  token: string
): Promise<AuthResult<TokenVerificationResult>> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      success: true,
      data: {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
      },
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };

    if (
      firebaseError.code === 'auth/id-token-expired' ||
      firebaseError.code === 'auth/id-token-revoked' ||
      firebaseError.code === 'auth/argument-error' ||
      firebaseError.code === 'auth/invalid-id-token'
    ) {
      return {
        success: false,
        error: {
          code: 'authentication_failed',
          message: 'Authentication failed.',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Service temporarily unavailable. Please try again later.',
      },
    };
  }
}
