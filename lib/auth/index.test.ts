/**
 * Unit tests for Firebase Authentication integration module.
 * Tests registration, login, and token verification flows.
 *
 * We mock Firebase SDK calls since these are integration boundaries —
 * testing the logic that maps Firebase results/errors to our AuthResult types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/auth
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
}));

// Mock firebase/firestore
const mockSetDoc = vi.fn();
const mockDoc = vi.fn().mockReturnValue('mock-doc-ref');

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  Timestamp: {
    now: () => ({ seconds: 1700000000, nanoseconds: 0 }),
  },
}));

// Mock firebase client
vi.mock('@/lib/firebase/client', () => ({
  clientAuth: { currentUser: null },
  clientFirestore: {},
  getClientFirestore: () => ({}),
  isFirebaseConfigValid: () => true,
}));

// Mock firebase admin
const mockVerifyIdToken = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
}));

import { registerUser, loginUser, verifyIdToken } from './index';

describe('lib/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a user and create Firestore profile', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
      };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      mockSetDoc.mockResolvedValue(undefined);

      const result = await registerUser('test@example.com', 'Password1', 'John Doe');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uid).toBe('user-123');
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.idToken).toBe('mock-id-token');
      }

      // Verify Firestore profile was created
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          uid: 'user-123',
          email: 'test@example.com',
          display_name: 'John Doe',
          tier: 'free',
          notification_prefs: null,
        })
      );
    });

    it('should truncate display_name to 100 characters', async () => {
      const longName = 'A'.repeat(150);
      const mockUser = {
        uid: 'user-456',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('token'),
      };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      mockSetDoc.mockResolvedValue(undefined);

      await registerUser('test@example.com', 'Password1', longName);

      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          display_name: 'A'.repeat(100),
        })
      );
    });

    it('should return registration_failed error for existing email', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use',
      });

      const result = await registerUser('existing@example.com', 'Password1', 'Name');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('registration_failed');
        // Should NOT reveal that email already exists
        expect(result.error.message).not.toContain('already');
        expect(result.error.message).toContain('Registration failed');
      }
    });

    it('should return service_unavailable error for network failures', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/network-request-failed',
      });

      const result = await registerUser('test@example.com', 'Password1', 'Name');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
        expect(result.error.message).toContain('temporarily unavailable');
      }
    });

    it('should still return success if Firestore profile write fails', async () => {
      const mockUser = {
        uid: 'user-789',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('token'),
      };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      mockSetDoc.mockRejectedValue(new Error('Firestore unavailable'));

      const result = await registerUser('test@example.com', 'Password1', 'Name');

      // Registration still succeeds — user was created in Auth
      expect(result.success).toBe(true);
    });

    it('should return service_unavailable if getIdToken fails', async () => {
      const mockUser = {
        uid: 'user-101',
        email: 'test@example.com',
        getIdToken: vi.fn().mockRejectedValue(new Error('Token error')),
      };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      mockSetDoc.mockResolvedValue(undefined);

      const result = await registerUser('test@example.com', 'Password1', 'Name');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
      }
    });
  });

  describe('loginUser', () => {
    it('should successfully log in and return ID token', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('login-token'),
      };
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await loginUser('test@example.com', 'Password1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uid).toBe('user-123');
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.idToken).toBe('login-token');
      }
    });

    it('should return authentication_failed for wrong password', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password',
      });

      const result = await loginUser('test@example.com', 'wrongpass');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('authentication_failed');
        // Should NOT reveal whether email or password was wrong
        expect(result.error.message).toContain('Authentication failed');
        expect(result.error.message).not.toContain('password');
        expect(result.error.message).not.toContain('email');
      }
    });

    it('should return authentication_failed for non-existent user', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/user-not-found',
      });

      const result = await loginUser('nobody@example.com', 'Password1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('authentication_failed');
        // Same generic message — doesn't reveal user doesn't exist
        expect(result.error.message).not.toContain('not found');
      }
    });

    it('should return authentication_failed for invalid-credential', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-credential',
      });

      const result = await loginUser('test@example.com', 'Password1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('authentication_failed');
      }
    });

    it('should return service_unavailable for network errors', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/network-request-failed',
      });

      const result = await loginUser('test@example.com', 'Password1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
      }
    });

    it('should return service_unavailable for too-many-requests', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/too-many-requests',
      });

      const result = await loginUser('test@example.com', 'Password1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
      }
    });

    it('should return service_unavailable if getIdToken fails', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        getIdToken: vi.fn().mockRejectedValue(new Error('Token error')),
      };
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await loginUser('test@example.com', 'Password1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
      }
    });
  });

  describe('verifyIdToken', () => {
    it('should successfully verify a valid token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'user-123',
        email: 'test@example.com',
      });

      const result = await verifyIdToken('valid-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uid).toBe('user-123');
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should return empty string for email when not present in token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'user-456',
        email: undefined,
      });

      const result = await verifyIdToken('valid-token-no-email');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('');
      }
    });

    it('should return authentication_failed for expired token', async () => {
      mockVerifyIdToken.mockRejectedValue({
        code: 'auth/id-token-expired',
      });

      const result = await verifyIdToken('expired-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('authentication_failed');
      }
    });

    it('should return authentication_failed for revoked token', async () => {
      mockVerifyIdToken.mockRejectedValue({
        code: 'auth/id-token-revoked',
      });

      const result = await verifyIdToken('revoked-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('authentication_failed');
      }
    });

    it('should return authentication_failed for invalid token format', async () => {
      mockVerifyIdToken.mockRejectedValue({
        code: 'auth/argument-error',
      });

      const result = await verifyIdToken('garbage');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('authentication_failed');
      }
    });

    it('should return service_unavailable for unknown errors', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Unknown error'));

      const result = await verifyIdToken('some-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('service_unavailable');
      }
    });
  });
});
