import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// Feature: ux-security-enhancements, Property 6: Google first-login creates correct profile
// Feature: ux-security-enhancements, Property 7: Google re-authentication is idempotent
// **Validates: Requirements 3.3, 3.4**

// --- Mocks ---

// Mock firebase/auth
const mockSignInWithPopup = vi.fn();
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
}));

// Mock firebase/firestore
const mockDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockTimestampNow = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  Timestamp: {
    now: () => mockTimestampNow(),
  },
}));

// Mock @/lib/firebase/client
vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {},
  getClientAuth: () => ({}),
  getClientFirestore: () => ({}),
  isFirebaseConfigValid: () => true,
}));

// Import after mocks are set up
import { signInWithGoogle } from './googleAuth';

describe('Property 6: Google first-login creates correct profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any Google user with uid, email, and displayName, first login creates a profile with correct shape', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0), // uid
        fc.emailAddress(), // email
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0), // displayName
        async (uid, email, displayName) => {
          vi.clearAllMocks();

          const fakeTimestamp = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
          mockTimestampNow.mockReturnValue(fakeTimestamp);

          // Mock signInWithPopup to return a user with these values
          mockSignInWithPopup.mockResolvedValue({
            user: {
              uid,
              email,
              displayName,
              getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
            },
          });

          // Mock doc to return a ref
          const fakeDocRef = { id: uid, path: `users/${uid}` };
          mockDoc.mockReturnValue(fakeDocRef);

          // Mock getDoc to return exists: false (first login)
          mockGetDoc.mockResolvedValue({
            exists: () => false,
          });

          // Mock setDoc to succeed
          mockSetDoc.mockResolvedValue(undefined);

          const result = await signInWithGoogle();

          // Verify success
          expect(result.success).toBe(true);

          // Verify setDoc was called with correct profile shape
          expect(mockSetDoc).toHaveBeenCalledTimes(1);
          const [docRef, profileData] = mockSetDoc.mock.calls[0];

          expect(docRef).toBe(fakeDocRef);
          expect(profileData.uid).toBe(uid);
          expect(profileData.email).toBe(email);
          expect(profileData.display_name).toBe(displayName);
          expect(profileData.tier).toBe('free');
          expect(profileData.auth_provider).toBe('google');
          expect(profileData.notification_prefs).toBeNull();
          expect(profileData.created_at).toBe(fakeTimestamp);
          expect(profileData.updated_at).toBe(fakeTimestamp);
          expect(profileData.email_verified).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 7: Google re-authentication is idempotent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any existing user profile, re-authentication does not modify the profile', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0), // uid
        fc.emailAddress(), // email
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0), // displayName
        fc.constantFrom('free' as const, 'premium' as const), // tier
        fc.constantFrom('email' as const, 'google' as const), // auth_provider
        async (uid, email, displayName, tier, authProvider) => {
          vi.clearAllMocks();

          // Mock signInWithPopup to return the user
          mockSignInWithPopup.mockResolvedValue({
            user: {
              uid,
              email,
              displayName,
              getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
            },
          });

          // Mock doc to return a ref
          const fakeDocRef = { id: uid, path: `users/${uid}` };
          mockDoc.mockReturnValue(fakeDocRef);

          // Mock getDoc to return exists: true (existing profile)
          mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
              uid,
              email,
              display_name: displayName,
              tier,
              auth_provider: authProvider,
              email_verified: true,
              created_at: { seconds: 1000000, nanoseconds: 0 },
              updated_at: { seconds: 1000000, nanoseconds: 0 },
              notification_prefs: null,
            }),
          });

          const result = await signInWithGoogle();

          // Verify success
          expect(result.success).toBe(true);

          // Verify setDoc was NOT called (profile remains unchanged)
          expect(mockSetDoc).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
