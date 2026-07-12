import { describe, it, expect } from 'vitest';
import {
  generateCsrfToken,
  validateCsrfToken,
  buildCsrfCookieHeader,
  CSRF_CONFIG,
} from './csrf';

describe('CSRF Protection Module', () => {
  describe('CSRF_CONFIG', () => {
    it('should have correct default configuration', () => {
      expect(CSRF_CONFIG.cookieName).toBe('__csrf');
      expect(CSRF_CONFIG.headerName).toBe('x-csrf-token');
      expect(CSRF_CONFIG.tokenLength).toBe(32);
    });
  });

  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex string (32 bytes)', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });

    it('should only contain valid hex characters', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('validateCsrfToken', () => {
    it('should return true when both tokens are identical and non-empty', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, token)).toBe(true);
    });

    it('should return false when tokens differ', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(validateCsrfToken(token1, token2)).toBe(false);
    });

    it('should return false when cookie token is empty', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken('', token)).toBe(false);
    });

    it('should return false when header token is empty', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, '')).toBe(false);
    });

    it('should return false when both tokens are empty', () => {
      expect(validateCsrfToken('', '')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      expect(validateCsrfToken(null as unknown as string, 'token')).toBe(false);
      expect(validateCsrfToken('token', undefined as unknown as string)).toBe(false);
      expect(validateCsrfToken(123 as unknown as string, 'token')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(validateCsrfToken('abcdef', 'ABCDEF')).toBe(false);
    });
  });

  describe('buildCsrfCookieHeader', () => {
    it('should include the cookie name and token value', () => {
      const token = 'abc123';
      const header = buildCsrfCookieHeader(token);
      expect(header).toContain('__csrf=abc123');
    });

    it('should include Secure attribute', () => {
      const header = buildCsrfCookieHeader('test');
      expect(header).toContain('Secure');
    });

    it('should include HttpOnly attribute', () => {
      const header = buildCsrfCookieHeader('test');
      expect(header).toContain('HttpOnly');
    });

    it('should include SameSite=Strict attribute', () => {
      const header = buildCsrfCookieHeader('test');
      expect(header).toContain('SameSite=Strict');
    });

    it('should include Path=/ attribute', () => {
      const header = buildCsrfCookieHeader('test');
      expect(header).toContain('Path=/');
    });

    it('should produce the complete expected format', () => {
      const token = generateCsrfToken();
      const header = buildCsrfCookieHeader(token);
      expect(header).toBe(
        `__csrf=${token}; Path=/; Secure; HttpOnly; SameSite=Strict`
      );
    });
  });
});
