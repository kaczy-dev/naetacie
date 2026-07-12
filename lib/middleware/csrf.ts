/**
 * CSRF Protection Module - Double-Submit Cookie Pattern
 *
 * Implements CSRF protection using a double-submit cookie pattern:
 * 1. Server generates a random token and sets it as a cookie
 * 2. Client reads the token and sends it back in a custom header
 * 3. Server validates that both values match
 *
 * Cookie configuration:
 * - Name: __csrf
 * - Attributes: Secure, HttpOnly, SameSite=Strict
 *
 * Header: x-csrf-token
 */

import { randomBytes } from 'crypto';

export interface CsrfConfig {
  cookieName: string; // "__csrf"
  headerName: string; // "x-csrf-token"
  tokenLength: number; // 32 bytes
}

/** Default CSRF configuration */
export const CSRF_CONFIG: CsrfConfig = {
  cookieName: '__csrf',
  headerName: 'x-csrf-token',
  tokenLength: 32,
};

/**
 * Generate a cryptographically secure CSRF token.
 *
 * Produces a 32-byte random hex string (64 characters).
 *
 * @returns A random hex string suitable for use as a CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_CONFIG.tokenLength).toString('hex');
}

/**
 * Validate a CSRF token pair from the cookie and request header.
 *
 * Validation rules:
 * - Both tokens must be non-empty strings
 * - Both tokens must be identical
 *
 * @param cookieToken - The token value from the __csrf cookie
 * @param headerToken - The token value from the x-csrf-token header
 * @returns true if both tokens are non-empty and identical, false otherwise
 */
export function validateCsrfToken(
  cookieToken: string,
  headerToken: string
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return false;
  }

  return cookieToken === headerToken;
}

/**
 * Build the Set-Cookie header value for the CSRF token.
 *
 * Cookie attributes:
 * - Secure: only sent over HTTPS
 * - HttpOnly: not accessible via JavaScript
 * - SameSite=Strict: not sent on cross-origin requests
 * - Path=/: available across the entire site
 *
 * @param token - The CSRF token to set in the cookie
 * @returns A formatted Set-Cookie header value string
 */
export function buildCsrfCookieHeader(token: string): string {
  return `${CSRF_CONFIG.cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}
