/**
 * Unit tests for Token Manager.
 * Tests cover: auto-refresh behavior, getValidToken, clearAuthState, retryWithFreshToken.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Auth, User, IdTokenResult } from 'firebase/auth';
import {
  createTokenManager,
  CHECK_INTERVAL_MS,
  SESSION_EXPIRED_URL,
  isAuthRelatedKey,
} from './tokenManager';

// --- Mock Helpers ---

function createMockUser(options: {
  expirationTime?: string;
  token?: string;
  getIdTokenFails?: boolean;
  getIdTokenResultFails?: boolean;
} = {}): User {
  const {
    expirationTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    token = 'mock-token-123',
    getIdTokenFails = false,
    getIdTokenResultFails = false,
  } = options;

  return {
    getIdToken: vi.fn(async () => {
      if (getIdTokenFails) throw new Error('Token refresh failed');
      return token;
    }),
    getIdTokenResult: vi.fn(async () => {
      if (getIdTokenResultFails) throw new Error('Token result failed');
      return {
        token,
        expirationTime,
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        signInProvider: 'password',
        signInSecondFactor: null,
        claims: {},
      } as IdTokenResult;
    }),
  } as unknown as User;
}

function createMockAuth(user: User | null = null): Auth {
  return {
    currentUser: user,
  } as unknown as Auth;
}

function createMockStorage(initialData: Record<string, string> = {}): Storage {
  const data = new Map<string, string>(Object.entries(initialData));
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); }),
    clear: vi.fn(() => { data.clear(); }),
    key: vi.fn((index: number) => {
      const keys = Array.from(data.keys());
      return keys[index] ?? null;
    }),
    get length() { return data.size; },
  } as Storage;
}

// --- Tests ---

describe('tokenManager', () => {
  let redirect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    redirect = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startAutoRefresh / stopAutoRefresh', () => {
    it('should start periodic token checking', async () => {
      const user = createMockUser();
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      tm.startAutoRefresh();

      // Advance time past one interval
      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

      expect(user.getIdTokenResult).toHaveBeenCalled();

      tm.stopAutoRefresh();
    });

    it('should not create multiple intervals on repeated startAutoRefresh calls', async () => {
      const user = createMockUser();
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      tm.startAutoRefresh();
      tm.startAutoRefresh(); // duplicate call

      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

      // Should only have been called once per interval
      expect(user.getIdTokenResult).toHaveBeenCalledTimes(1);

      tm.stopAutoRefresh();
    });

    it('should stop checking after stopAutoRefresh', async () => {
      const user = createMockUser();
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      tm.startAutoRefresh();
      tm.stopAutoRefresh();

      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS * 3);

      expect(user.getIdTokenResult).not.toHaveBeenCalled();
    });

    it('should force refresh when token is near expiry', async () => {
      // Token expires in 3 minutes (below the 5-minute threshold)
      const expirationTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      const user = createMockUser({ expirationTime });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      tm.startAutoRefresh();
      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

      // Should have called getIdToken(true) for force refresh
      expect(user.getIdToken).toHaveBeenCalledWith(true);

      tm.stopAutoRefresh();
    });

    it('should not force refresh when token has plenty of time', async () => {
      // Token expires in 30 minutes (well above threshold)
      const expirationTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const user = createMockUser({ expirationTime });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      tm.startAutoRefresh();
      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

      // Should not have called getIdToken for force refresh
      expect(user.getIdToken).not.toHaveBeenCalled();

      tm.stopAutoRefresh();
    });
  });

  describe('getValidToken', () => {
    it('should return token when it is still valid', async () => {
      const user = createMockUser({ token: 'valid-token' });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      const token = await tm.getValidToken();
      expect(token).toBe('valid-token');
    });

    it('should return null when no user is signed in', async () => {
      const auth = createMockAuth(null);
      const tm = createTokenManager({ auth, redirect });

      const token = await tm.getValidToken();
      expect(token).toBeNull();
    });

    it('should force refresh and return new token when near expiry', async () => {
      const expirationTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      const user = createMockUser({ expirationTime, token: 'refreshed-token' });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      const token = await tm.getValidToken();
      expect(token).toBe('refreshed-token');
      expect(user.getIdToken).toHaveBeenCalledWith(true);
    });

    it('should redirect to login when token cannot be refreshed', async () => {
      const expirationTime = new Date(Date.now() + 1 * 60 * 1000).toISOString();
      const user = createMockUser({ expirationTime, getIdTokenFails: true });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      const token = await tm.getValidToken();
      expect(token).toBeNull();
      expect(redirect).toHaveBeenCalledWith(SESSION_EXPIRED_URL);
    });

    it('should redirect to login when getIdTokenResult throws and refresh fails', async () => {
      const user = createMockUser({ getIdTokenResultFails: true, getIdTokenFails: true });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      const token = await tm.getValidToken();
      expect(token).toBeNull();
      expect(redirect).toHaveBeenCalledWith(SESSION_EXPIRED_URL);
    });
  });

  describe('clearAuthState', () => {
    it('should remove all auth-related keys from storage', () => {
      const storage = createMockStorage({
        'firebase:authUser:abc123': '{"uid":"user1"}',
        'firebase:host:project.firebaseapp.com': 'data',
        'cached_user_profile': '{"name":"Test"}',
        'theme-preference': 'dark', // should NOT be removed
        'some-other-key': 'value', // should NOT be removed
      });
      const auth = createMockAuth(null);
      const tm = createTokenManager({ auth, redirect, storage });

      tm.clearAuthState();

      expect(storage.removeItem).toHaveBeenCalledWith('firebase:authUser:abc123');
      expect(storage.removeItem).toHaveBeenCalledWith('firebase:host:project.firebaseapp.com');
      expect(storage.removeItem).toHaveBeenCalledWith('cached_user_profile');
      expect(storage.removeItem).not.toHaveBeenCalledWith('theme-preference');
      expect(storage.removeItem).not.toHaveBeenCalledWith('some-other-key');
    });

    it('should handle empty storage gracefully', () => {
      const storage = createMockStorage({});
      const auth = createMockAuth(null);
      const tm = createTokenManager({ auth, redirect, storage });

      expect(() => tm.clearAuthState()).not.toThrow();
    });
  });

  describe('retryWithFreshToken', () => {
    it('should refresh token and retry the request', async () => {
      const user = createMockUser({ token: 'fresh-token' });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      const mockResponse = new Response('{"data":"success"}', { status: 200 });
      const originalRequest = vi.fn().mockResolvedValue(mockResponse);

      const response = await tm.retryWithFreshToken(originalRequest);

      expect(user.getIdToken).toHaveBeenCalledWith(true);
      expect(originalRequest).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
    });

    it('should redirect to login when token refresh fails', async () => {
      const user = createMockUser({ getIdTokenFails: true });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      const originalRequest = vi.fn();

      const response = await tm.retryWithFreshToken(originalRequest);

      expect(redirect).toHaveBeenCalledWith(SESSION_EXPIRED_URL);
      expect(originalRequest).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should redirect to login when retry request throws', async () => {
      const user = createMockUser({ token: 'fresh-token' });
      const auth = createMockAuth(user);
      const tm = createTokenManager({ auth, redirect });

      const originalRequest = vi.fn().mockRejectedValue(new Error('Network error'));

      const response = await tm.retryWithFreshToken(originalRequest);

      expect(redirect).toHaveBeenCalledWith(SESSION_EXPIRED_URL);
      expect(response.status).toBe(401);
    });

    it('should redirect when no user is available for refresh', async () => {
      const auth = createMockAuth(null);
      const tm = createTokenManager({ auth, redirect });

      const originalRequest = vi.fn();

      const response = await tm.retryWithFreshToken(originalRequest);

      expect(redirect).toHaveBeenCalledWith(SESSION_EXPIRED_URL);
      expect(originalRequest).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe('isAuthRelatedKey', () => {
    it('should identify Firebase auth keys', () => {
      expect(isAuthRelatedKey('firebase:authUser:abc')).toBe(true);
      expect(isAuthRelatedKey('firebase:host:project.firebaseapp.com')).toBe(true);
    });

    it('should identify cached profile keys', () => {
      expect(isAuthRelatedKey('cached_user_profile')).toBe(true);
      expect(isAuthRelatedKey('user_profile')).toBe(true);
      expect(isAuthRelatedKey('auth_token')).toBe(true);
      expect(isAuthRelatedKey('id_token')).toBe(true);
    });

    it('should not flag unrelated keys', () => {
      expect(isAuthRelatedKey('theme-preference')).toBe(false);
      expect(isAuthRelatedKey('some-app-data')).toBe(false);
      expect(isAuthRelatedKey('announcements-cache')).toBe(false);
    });
  });
});
