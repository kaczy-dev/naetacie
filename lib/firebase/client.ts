/**
 * Firebase client-side SDK initialization.
 * Used for authentication flows in the browser/Next.js client components.
 *
 * Connects directly to Firebase production services.
 * Uses lazy getter functions to avoid crashes when env vars are missing
 * (e.g. during SSR/build without .env.local).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _firestore: Firestore | null = null;

export function getClientApp(): FirebaseApp {
  if (!_app) {
    _app = getFirebaseApp();
  }
  return _app;
}

export function getClientAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getClientApp());
  }
  return _auth;
}

export function getClientFirestore(): Firestore {
  if (!_firestore) {
    _firestore = getFirestore(getClientApp());
  }
  return _firestore;
}

// Convenience exports for backward compatibility — these are safe in the browser
// but will throw if accessed during SSR without env vars (which is expected).
export const clientAuth: Auth = typeof window !== 'undefined'
  ? getClientAuth()
  : ({} as Auth);

export const clientFirestore: Firestore = typeof window !== 'undefined'
  ? getClientFirestore()
  : ({} as Firestore);
