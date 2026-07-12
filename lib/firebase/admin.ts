/**
 * Firebase Admin SDK initialization.
 * Used for server-side operations: token verification, Firestore writes from API routes.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY env variable for Firestore access.
 * Without it, the app initializes with limited functionality (projectId only).
 */

import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined;

  return initializeApp(
    serviceAccount
      ? { credential: cert(serviceAccount) }
      : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'praca2-93285' }
  );
}

const adminApp = getAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminFirestore: Firestore = getFirestore(adminApp);
export { adminApp };
