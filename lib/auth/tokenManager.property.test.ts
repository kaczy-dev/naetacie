import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { createTokenManager, isAuthRelatedKey, REFRESH_THRESHOLD_MS } from './tokenManager';
import type { TokenManagerDeps } from './tokenManager';

// Feature: ux-security-enhancements, Property 14: Token refresh triggers at correct threshold
// Feature: ux-security-enhancements, Property 15: Sign-out clears all auth state
// **Validates: Requirements 7.1, 7.4**

/**
 * Creates a mock Storage that behaves like localStorage.
 */
function createMockStorage(initialData: Record<string, string> = {}): Storage {
  const store: Record<string, string> = { ...initialData };

  return {
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
  };
}

describe('Property 14: Token refresh triggers at correct threshold', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers refresh when E - T < 300000ms and does NOT when E - T >= 300000ms', async () => {
    await fc.assert(
      fc.asyncProperty(
        // currentTime: a realistic timestamp
        fc.integer({ min: 1_600_000_000_000, max: 1_800_000_000_000 }),
        // timeUntilExpiry: can be negative (expired), within threshold, or beyond threshold
        fc.integer({ min: -600_000, max: 900_000 }),
        async (currentTime, timeUntilExpiry) => {
          vi.setSystemTime(new Date(currentTime));

          const expiryTime = currentTime + timeUntilExpiry;
          const expirationTimeStr = new Date(expiryTime).toISOString();

          const mockToken = 'mock-token-fresh';

          // Mock User with getIdTokenResult and getIdToken
          const mockUser = {
            getIdTokenResult: vi.fn().mockResolvedValue({
              expirationTime: expirationTimeStr,
              token: 'mock-token-current',
            }),
            getIdToken: vi.fn().mockResolvedValue(mockToken),
          };

          const mockAuth = {
            currentUser: mockUser,
          } as unknown as TokenManagerDeps['auth'];

          const mockRedirect = vi.fn();
          const mockStorage = createMockStorage();

          const tokenManager = createTokenManager({
            auth: mockAuth,
            redirect: mockRedirect,
            storage: mockStorage,
          });

          // Call getValidToken and check behavior
          const token = await tokenManager.getValidToken();
          const shouldHaveRefreshed = expiryTime - currentTime < REFRESH_THRESHOLD_MS;

          if (shouldHaveRefreshed) {
            // Should have called getIdToken(true) for force refresh
            expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
            expect(token).toBe(mockToken);
          } else {
            // Should NOT have called getIdToken(true) — returns existing token
            expect(mockUser.getIdToken).not.toHaveBeenCalled();
            expect(token).toBe('mock-token-current');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not trigger refresh when token is not within threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1_600_000_000_000, max: 1_800_000_000_000 }),
        // Time until expiry is well above threshold (>= 300000ms)
        fc.integer({ min: REFRESH_THRESHOLD_MS, max: 3_600_000 }),
        async (currentTime, timeUntilExpiry) => {
          vi.setSystemTime(new Date(currentTime));

          const expiryTime = currentTime + timeUntilExpiry;
          const expirationTimeStr = new Date(expiryTime).toISOString();

          const mockUser = {
            getIdTokenResult: vi.fn().mockResolvedValue({
              expirationTime: expirationTimeStr,
              token: 'existing-valid-token',
            }),
            getIdToken: vi.fn().mockResolvedValue('should-not-be-called'),
          };

          const mockAuth = {
            currentUser: mockUser,
          } as unknown as TokenManagerDeps['auth'];

          const tokenManager = createTokenManager({
            auth: mockAuth,
            redirect: vi.fn(),
            storage: createMockStorage(),
          });

          const token = await tokenManager.getValidToken();

          // Should NOT trigger refresh — token is still valid
          expect(mockUser.getIdToken).not.toHaveBeenCalled();
          expect(token).toBe('existing-valid-token');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 15: Sign-out clears all auth state', () => {
  it('removes all auth-related keys while preserving non-auth keys', () => {
    fc.assert(
      fc.property(
        // Generate a set of auth-related keys
        fc.array(
          fc.oneof(
            fc.constant('firebase:authUser'),
            fc.constant('firebase:host:example.com'),
            fc.constant('cached_user_profile'),
            fc.constant('user_profile'),
            fc.constant('auth_token'),
            fc.constant('id_token'),
            fc.constantFrom(
              'firebase:authUser:abc123',
              'firebase:persistence',
              'firebase:session:key'
            )
          ),
          { minLength: 1, maxLength: 8 }
        ),
        // Generate a set of non-auth keys
        fc.array(
          fc.oneof(
            fc.constant('theme-preference'),
            fc.constant('app-settings'),
            fc.constant('language'),
            fc.constant('last-visited-page'),
            fc.constant('ui-state'),
            fc.constant('cookie-consent'),
            fc.constant('sidebar-collapsed')
          ),
          { minLength: 0, maxLength: 5 }
        ),
        (authKeys, nonAuthKeys) => {
          // Build initial storage state
          const initialData: Record<string, string> = {};

          for (const key of authKeys) {
            initialData[key] = `auth-value-${key}`;
          }
          for (const key of nonAuthKeys) {
            initialData[key] = `non-auth-value-${key}`;
          }

          const mockStorage = createMockStorage(initialData);

          const mockAuth = {
            currentUser: null,
          } as unknown as TokenManagerDeps['auth'];

          const tokenManager = createTokenManager({
            auth: mockAuth,
            redirect: vi.fn(),
            storage: mockStorage,
          });

          // Act: clear auth state
          tokenManager.clearAuthState();

          // Assert: all auth-related keys should be removed
          for (const key of authKeys) {
            if (isAuthRelatedKey(key)) {
              expect(mockStorage.getItem(key)).toBeNull();
            }
          }

          // Assert: non-auth keys should remain
          for (const key of nonAuthKeys) {
            if (!isAuthRelatedKey(key)) {
              expect(mockStorage.getItem(key)).toBe(`non-auth-value-${key}`);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clearAuthState leaves storage empty of auth keys for any random auth key patterns', () => {
    fc.assert(
      fc.property(
        // Generate random strings that match auth key patterns
        fc.array(
          fc.oneof(
            // Keys starting with firebase: prefix
            fc.string({ minLength: 1, maxLength: 20 }).map(
              (s) => `firebase:${s}`
            ),
            // Keys starting with firebase:host:
            fc.string({ minLength: 1, maxLength: 20 }).map(
              (s) => `firebase:host:${s}`
            ),
            // Known auth keys
            fc.constantFrom(
              'cached_user_profile',
              'user_profile',
              'auth_token',
              'id_token'
            )
          ),
          { minLength: 1, maxLength: 10 }
        ),
        // Generate random non-auth keys (that don't start with firebase: and aren't auth keys)
        fc.array(
          fc.string({ minLength: 1, maxLength: 30 }).filter(
            (s) => !isAuthRelatedKey(s)
          ),
          { minLength: 0, maxLength: 5 }
        ),
        (authKeys, nonAuthKeys) => {
          const initialData: Record<string, string> = {};

          for (const key of authKeys) {
            initialData[key] = JSON.stringify({ data: key });
          }
          for (const key of nonAuthKeys) {
            initialData[key] = JSON.stringify({ preserved: true });
          }

          const mockStorage = createMockStorage(initialData);

          const mockAuth = {
            currentUser: null,
          } as unknown as TokenManagerDeps['auth'];

          const tokenManager = createTokenManager({
            auth: mockAuth,
            redirect: vi.fn(),
            storage: mockStorage,
          });

          // Act
          tokenManager.clearAuthState();

          // Assert: no auth-related keys remain
          for (let i = 0; i < mockStorage.length; i++) {
            const key = mockStorage.key(i);
            if (key !== null) {
              expect(isAuthRelatedKey(key)).toBe(false);
            }
          }

          // Assert: all non-auth keys still present
          for (const key of nonAuthKeys) {
            expect(mockStorage.getItem(key)).toBe(
              JSON.stringify({ preserved: true })
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clearAuthState results in empty auth state regardless of initial state size', () => {
    fc.assert(
      fc.property(
        // Generate varying number of auth keys
        fc.integer({ min: 0, max: 20 }),
        (numAuthKeys) => {
          const initialData: Record<string, string> = {};

          // Create auth keys
          for (let i = 0; i < numAuthKeys; i++) {
            initialData[`firebase:key_${i}`] = `value_${i}`;
          }

          // Always add a non-auth key to verify it stays
          initialData['my-app-preference'] = 'keep-this';

          const mockStorage = createMockStorage(initialData);

          const mockAuth = {
            currentUser: null,
          } as unknown as TokenManagerDeps['auth'];

          const tokenManager = createTokenManager({
            auth: mockAuth,
            redirect: vi.fn(),
            storage: mockStorage,
          });

          // Act
          tokenManager.clearAuthState();

          // Assert: count remaining auth keys is zero
          let authKeysRemaining = 0;
          for (let i = 0; i < mockStorage.length; i++) {
            const key = mockStorage.key(i);
            if (key !== null && isAuthRelatedKey(key)) {
              authKeysRemaining++;
            }
          }
          expect(authKeysRemaining).toBe(0);

          // Non-auth key is preserved
          expect(mockStorage.getItem('my-app-preference')).toBe('keep-this');
        }
      ),
      { numRuns: 100 }
    );
  });
});
