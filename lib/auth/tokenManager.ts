/**
 * Token Manager - handles Firebase ID token refresh and expiry.
 *
 * Responsibilities:
 * - Auto-refresh tokens when < 5 minutes remaining before expiry
 * - Redirect to login on unrecoverable auth failures
 * - Retry failed requests after token refresh (HTTP 401 handling)
 * - Clear all auth state on sign-out
 *
 * Supports dependency injection of the Firebase Auth instance for testability.
 */

import type { Auth, User } from 'firebase/auth';

// --- Constants ---

/** Refresh threshold: 5 minutes in milliseconds */
const REFRESH_THRESHOLD_MS = 300_000;

/** Interval to check token expiry: 60 seconds */
const CHECK_INTERVAL_MS = 60_000;

/** Login redirect URL with session expired message */
const SESSION_EXPIRED_URL = '/login?message=session_expired';

/** Prefix patterns for Firebase auth localStorage keys */
const FIREBASE_AUTH_KEY_PREFIX = 'firebase:';

// --- Types ---

export interface TokenManagerDeps {
  /** Firebase Auth instance */
  auth: Auth;
  /** Override for window.location (testability) */
  redirect?: (url: string) => void;
  /** Override for localStorage (testability) */
  storage?: Storage;
}

export interface TokenManagerInstance {
  /** Start monitoring token expiry, auto-refresh when < 5min remaining */
  startAutoRefresh(): void;
  /** Stop monitoring */
  stopAutoRefresh(): void;
  /** Get current valid token, refreshing if needed */
  getValidToken(): Promise<string | null>;
  /** Clear all auth state from client */
  clearAuthState(): void;
  /** Retry a failed request after token refresh */
  retryWithFreshToken(originalRequest: () => Promise<Response>): Promise<Response>;
}

// --- Implementation ---

export function createTokenManager(deps: TokenManagerDeps): TokenManagerInstance {
  const { auth, redirect, storage } = deps;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isRefreshing = false;

  function getStorage(): Storage | null {
    if (storage) return storage;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  function performRedirect(url: string): void {
    if (redirect) {
      redirect(url);
    } else if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }

  function getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Determines if a token needs refreshing based on its expiration time.
   * Returns true if the token expires within REFRESH_THRESHOLD_MS.
   */
  function shouldRefresh(expirationTime: string): boolean {
    const expiresAt = new Date(expirationTime).getTime();
    const now = Date.now();
    return expiresAt - now < REFRESH_THRESHOLD_MS;
  }

  /**
   * Attempts to refresh the current user's token.
   * Returns the new token or null if refresh fails.
   */
  async function refreshToken(forceRefresh = false): Promise<string | null> {
    const user = getCurrentUser();
    if (!user) return null;

    try {
      const token = await user.getIdToken(forceRefresh);
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Checks if the current token needs refreshing and performs it if needed.
   * Called periodically by the auto-refresh interval.
   */
  async function checkAndRefresh(): Promise<void> {
    if (isRefreshing) return;

    const user = getCurrentUser();
    if (!user) return;

    try {
      const tokenResult = await user.getIdTokenResult();
      if (shouldRefresh(tokenResult.expirationTime)) {
        isRefreshing = true;
        await user.getIdToken(true);
        isRefreshing = false;
      }
    } catch {
      isRefreshing = false;
      // Token refresh failed - the next interval check will retry,
      // or getValidToken will handle it when called explicitly.
    }
  }

  // --- Public Methods ---

  function startAutoRefresh(): void {
    if (intervalId !== null) return; // Already running
    intervalId = setInterval(checkAndRefresh, CHECK_INTERVAL_MS);
  }

  function stopAutoRefresh(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  async function getValidToken(): Promise<string | null> {
    const user = getCurrentUser();
    if (!user) return null;

    try {
      const tokenResult = await user.getIdTokenResult();

      if (shouldRefresh(tokenResult.expirationTime)) {
        // Token is expiring soon or already expired, force refresh
        const newToken = await refreshToken(true);
        if (!newToken) {
          // Cannot refresh - session has expired
          performRedirect(SESSION_EXPIRED_URL);
          return null;
        }
        return newToken;
      }

      return tokenResult.token;
    } catch {
      // Token retrieval failed entirely - try force refresh
      const newToken = await refreshToken(true);
      if (!newToken) {
        performRedirect(SESSION_EXPIRED_URL);
        return null;
      }
      return newToken;
    }
  }

  function clearAuthState(): void {
    const store = getStorage();
    if (!store) return;

    // Collect keys to remove (iterate over all localStorage keys)
    const keysToRemove: string[] = [];

    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && isAuthRelatedKey(key)) {
        keysToRemove.push(key);
      }
    }

    // Remove all auth-related keys
    for (const key of keysToRemove) {
      store.removeItem(key);
    }
  }

  async function retryWithFreshToken(
    originalRequest: () => Promise<Response>
  ): Promise<Response> {
    // Attempt to force refresh the token
    const newToken = await refreshToken(true);

    if (!newToken) {
      // Cannot refresh - redirect to login
      performRedirect(SESSION_EXPIRED_URL);
      // Return a synthetic response indicating auth failure
      return new Response(JSON.stringify({ error: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Retry the original request with the fresh token
    try {
      const response = await originalRequest();
      return response;
    } catch {
      // Retry also failed - redirect to login
      performRedirect(SESSION_EXPIRED_URL);
      return new Response(JSON.stringify({ error: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return {
    startAutoRefresh,
    stopAutoRefresh,
    getValidToken,
    clearAuthState,
    retryWithFreshToken,
  };
}

// --- Helper Functions ---

/**
 * Determines if a localStorage key is auth-related and should be cleared on sign-out.
 */
function isAuthRelatedKey(key: string): boolean {
  // Firebase auth state keys
  if (key.startsWith(FIREBASE_AUTH_KEY_PREFIX)) return true;

  // Common Firebase auth persistence keys
  if (key.startsWith('firebase:host:')) return true;

  // Cached user profile data
  if (key === 'cached_user_profile') return true;
  if (key === 'user_profile') return true;
  if (key === 'auth_token') return true;
  if (key === 'id_token') return true;

  return false;
}

// --- Exported Helpers (for testing) ---

export { REFRESH_THRESHOLD_MS, CHECK_INTERVAL_MS, SESSION_EXPIRED_URL, isAuthRelatedKey };
