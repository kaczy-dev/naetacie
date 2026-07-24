/**
 * Firebase client-side SDK initialization with defensive guards.
 * Prevents crashes when Firebase env variables are missing or invalid (auth/invalid-api-key).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

/**
 * Validates whether a real Firebase API Key is configured in environment variables.
 */
export function isFirebaseConfigValid(): boolean {
  const rawKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!rawKey) return false;
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');
  if (
    !apiKey ||
    apiKey === 'placeholder' ||
    apiKey === 'undefined' ||
    apiKey === 'null' ||
    apiKey.includes('AIzaSyB3TaYeyqkyMEEYdbgDv9BwR67fAoG8P-A') ||
    apiKey.toLowerCase().includes('your') ||
    apiKey.toLowerCase().includes('dummy') ||
    !apiKey.startsWith('AIzaSy') ||
    apiKey.length < 30 ||
    apiKey.length > 55
  ) {
    return false;
  }
  return true;
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigValid()) {
    return null;
  }
  try {
    if (getApps().length > 0) {
      return getApp();
    }
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('[Firebase] App initialization skipped:', error);
    return null;
  }
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _firestore: Firestore | null = null;

export function getClientApp(): FirebaseApp | null {
  if (!_app) {
    _app = getFirebaseApp();
  }
  return _app;
}

export function getClientAuth(): Auth {
  if (!_auth) {
    if (!isFirebaseConfigValid()) {
      return ({} as unknown) as Auth;
    }
    try {
      const app = getClientApp();
      if (app) {
        _auth = getAuth(app);
      }
    } catch (error) {
      console.warn('[Firebase] Auth initialization skipped (invalid API key):', error);
      return ({} as unknown) as Auth;
    }
  }
  return (_auth || {}) as Auth;
}

export function getClientFirestore(): Firestore {
  if (!_firestore) {
    if (!isFirebaseConfigValid()) {
      return ({} as unknown) as Firestore;
    }
    try {
      const app = getClientApp();
      if (app) {
        _firestore = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      }
    } catch (error) {
      console.warn('[Firebase] Firestore initialization skipped:', error);
      return ({} as unknown) as Firestore;
    }
  }
  return (_firestore || {}) as Firestore;
}

// Safe backward-compatible exports
export const clientAuth: Auth = typeof window !== 'undefined' && isFirebaseConfigValid()
  ? getClientAuth()
  : ({} as Auth);

export const clientFirestore: Firestore = typeof window !== 'undefined' && isFirebaseConfigValid()
  ? getClientFirestore()
  : ({} as Firestore);
