/**
 * Passwordless Magic Link & SMS OTP Authentication Service.
 * Provides instant e-mail magic links and SMS OTP verification for workers on mobile.
 */

import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';
import { AuthResult } from './types';

const ACTION_CODE_SETTINGS = {
  url: typeof window !== 'undefined' ? `${window.location.origin}/login?finishMagicLink=true` : 'http://localhost:3000/login?finishMagicLink=true',
  handleCodeInApp: true,
};

export async function sendMagicLink(email: string): Promise<AuthResult<{ sent: boolean }>> {
  try {
    const auth = getClientAuth();
    if (!auth) {
      return { success: false, error: { code: 'service_unavailable', message: 'Auth service not initialized' } };
    }

    await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('emailForSignIn', email);
    }

    return { success: true, data: { sent: true } };
  } catch (e) {
    return {
      success: false,
      error: { code: 'authentication_failed', message: (e as Error).message },
    };
  }
}

export async function completeMagicLinkSignIn(emailUrl: string): Promise<AuthResult<{ uid: string; email: string }>> {
  try {
    const auth = getClientAuth();
    if (!auth || !isSignInWithEmailLink(auth, emailUrl)) {
      return { success: false, error: { code: 'authentication_failed', message: 'Invalid magic link' } };
    }

    let email = typeof window !== 'undefined' ? window.localStorage.getItem('emailForSignIn') : null;
    if (!email) {
      email = window.prompt('Proszę podać swój adres e-mail do weryfikacji linku:');
    }
    if (!email) {
      return { success: false, error: { code: 'authentication_failed', message: 'Brak adresu email' } };
    }

    const res = await signInWithEmailLink(auth, email, emailUrl);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('emailForSignIn');
    }

    return {
      success: true,
      data: {
        uid: res.user.uid,
        email: res.user.email || email,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: { code: 'authentication_failed', message: (e as Error).message },
    };
  }
}
