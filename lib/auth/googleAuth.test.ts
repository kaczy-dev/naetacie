/**
 * Unit tests for Google Sign-In integration.
 * Tests the signInWithGoogle function covering:
 * - First-time login (profile creation)
 * - Re-authentication (idempotent)
 * - OAuth cancellation handling
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/auth
const mockSignInWithPopup = vi.fn();
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
}));

// Mock firebase/firestore
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn().mockReturnValue('mock-doc-ref');

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  Timestamp: {
    now: () => ({ seconds: 1700000000, nanoseconds: 0 }),
  },
}));

// Mock firebase client
vi.mock('@/lib/firebase/client', () => ({
  clientAuth: { currentUser: null },
  getClientAuth: () => ({}),
  getClientFirestore: vi.fn().mockReturnValue({}),
  isFirebaseConfigValid: () => true,
}));

import { signInWithGoogle } from './googleAuth';

describe('signInWithGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('first-time Google login', () => {
    it('should create a new user profile when no profile exists', async () => {
      const mockUser = {
        uid: 'google-user-123',
        email: 'user@gmail.com',
        displayName: 'Google User',
        getIdToken: vi.fn().mockResolvedValue('mock-google-token'),
      };
      mockSignInWithPopup.mockResolvedValue({ user: mockUser });
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const result = await signInWithGoogle();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uid).toBe('google-user-123');
        expect(result.data.email).toBe('user@gmail.com');
        expect(result.data.idToken).toBe('mock-google-token');
        expect(result.data.isNewUser).toBe(true);
      }

      // Verify profile creation with correct fields
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          uid: 'google-user-123',
          email: 'user@gmail.com',
          display_name: 'Google User',
          tier: 'free',
          auth_provider: 'google',
          email_verified: true,
          notification_prefs: null,
        })
      );
    });

    it('should use email prefix as display_name when Google displayName is null', async () => {
      const mockUser = {
        uid: 'google-user-456',
        email: 'noname@gmail.com',
        displayName: null,
        getIdToken: vi.fn().mockResolvedValue('token'),
      };
      mockSignInWithPopup.mockResolvedValue({ user: mockUser });
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const result = await signInWithGoogle();

      expect(result.success).toBe(true);
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          display_name: 'noname',
        })
      );
    });
  });

  describe('subsequent Google login', () => {
    it('should not modify existing profile on re-authentication', async () => {
      const mockUser = {
        uid: 'existing-user',
        email: 'existing@gmail.com',
        displayName: 'Existing User',
        getIdToken: vi.fn().mockResolvedValue('token-2'),
      };
      mockSignInWithPopup.mockResolvedValue({ user: mockUser });
      mockGetDoc.mockResolvedValue({ exists: () => true });

      const result = await signInWithGoogle();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uid).toBe('existing-user');
        expect(result.data.isNewUser).toBe(false);
      }

      // setDoc should NOT have been called
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  describe('OAuth cancellation', () => {
    it('should return gracefully when popup is closed by user', async () => {
      mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('authentication_failed');
        expect(result.error.message).toBe('');
      }
    });

    it('should return gracefully when popup request is cancelled', async () => {
      mockSignInWithPopup.mockRejectedValue({ code: 'auth/cancelled-popup-request' });

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('');
      }
    });

    it('should return gracefully when user cancels OAuth', async () => {
      mockSignInWithPopup.mockRejectedValue({ code: 'auth/user-cancelled' });

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('');
      }
    });
  });

  describe('error handling', () => {
    it('should return service_unavailable for network errors', async () => {
      mockSignInWithPopup.mockRejectedValue({ code: 'auth/network-request-failed' });

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
        expect(result.error.message).toContain('temporarily unavailable');
      }
    });

    it('should return service_unavailable when popup is blocked', async () => {
      mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-blocked' });

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
      }
    });

    it('should return authentication_failed for unknown errors', async () => {
      mockSignInWithPopup.mockRejectedValue({ code: 'auth/unknown-error' });

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('authentication_failed');
        expect(result.error.message).toContain('Google sign-in failed');
      }
    });

    it('should return service_unavailable if getIdToken fails', async () => {
      const mockUser = {
        uid: 'user-token-fail',
        email: 'fail@gmail.com',
        displayName: 'Fail User',
        getIdToken: vi.fn().mockRejectedValue(new Error('Token error')),
      };
      mockSignInWithPopup.mockResolvedValue({ user: mockUser });
      mockGetDoc.mockResolvedValue({ exists: () => true });

      const result = await signInWithGoogle();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
      }
    });

    it('should still return success if Firestore profile creation fails', async () => {
      const mockUser = {
        uid: 'user-firestore-fail',
        email: 'firestore-fail@gmail.com',
        displayName: 'FS Fail',
        getIdToken: vi.fn().mockResolvedValue('token'),
      };
      mockSignInWithPopup.mockResolvedValue({ user: mockUser });
      mockGetDoc.mockRejectedValue(new Error('Firestore unavailable'));

      const result = await signInWithGoogle();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uid).toBe('user-firestore-fail');
      }
    });
  });
});
