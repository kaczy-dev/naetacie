/**
 * Unit tests for Next.js security middleware.
 *
 * Tests cover:
 * - Security headers applied to all responses
 * - Rate limiting on API routes
 * - Body size enforcement (413 for oversized payloads)
 * - Non-API routes get headers without rate limiting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { resetRateLimitStore } from './lib/middleware/rateLimiter';

function createRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    ip?: string;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, ip } = options;
  const req = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers,
  });
  // Simulate IP for testing
  if (ip) {
    Object.defineProperty(req, 'ip', { value: ip, writable: false });
  }
  return req;
}

describe('Security Headers Middleware', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  describe('Security Headers', () => {
    it('should set Content-Security-Policy header', () => {
      const req = createRequest('http://localhost:3000/');
      const res = middleware(req);

      const csp = res.headers.get('Content-Security-Policy');
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain('img-src \'self\' data: *.tile.openstreetmap.org');
      expect(csp).toContain("connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should set X-Content-Type-Options header', () => {
      const req = createRequest('http://localhost:3000/');
      const res = middleware(req);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should set X-Frame-Options header', () => {
      const req = createRequest('http://localhost:3000/');
      const res = middleware(req);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should set Referrer-Policy header', () => {
      const req = createRequest('http://localhost:3000/');
      const res = middleware(req);
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should apply security headers to API route responses', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        ip: '10.0.0.1',
      });
      const res = middleware(req);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests under the general rate limit', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        ip: '192.168.1.1',
      });
      const res = middleware(req);
      expect(res.status).not.toBe(429);
    });

    it('should return 429 when general rate limit is exceeded', () => {
      const ip = '192.168.1.100';
      // Make 100 requests to exhaust the limit
      for (let i = 0; i < 100; i++) {
        const req = createRequest('http://localhost:3000/api/announcements', { ip });
        middleware(req);
      }
      // 101st request should be rate-limited
      const req = createRequest('http://localhost:3000/api/announcements', { ip });
      const res = middleware(req);
      expect(res.status).toBe(429);
    });

    it('should include Retry-After header on 429 responses', () => {
      const ip = '192.168.1.101';
      for (let i = 0; i < 100; i++) {
        const req = createRequest('http://localhost:3000/api/announcements', { ip });
        middleware(req);
      }
      const req = createRequest('http://localhost:3000/api/announcements', { ip });
      const res = middleware(req);
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });

    it('should return rate limit error JSON body', async () => {
      const ip = '192.168.1.102';
      for (let i = 0; i < 100; i++) {
        const req = createRequest('http://localhost:3000/api/announcements', { ip });
        middleware(req);
      }
      const req = createRequest('http://localhost:3000/api/announcements', { ip });
      const res = middleware(req);
      const body = await res.json();
      expect(body).toEqual({ error: 'Rate limit exceeded' });
    });

    it('should apply stricter auth rate limit for /api/auth routes', () => {
      const ip = '192.168.1.103';
      // Make 10 requests to exhaust auth limit
      for (let i = 0; i < 10; i++) {
        const req = createRequest('http://localhost:3000/api/auth/login', { ip });
        middleware(req);
      }
      // 11th request should be rate-limited
      const req = createRequest('http://localhost:3000/api/auth/login', { ip });
      const res = middleware(req);
      expect(res.status).toBe(429);
    });

    it('should not apply rate limiting to non-API routes', () => {
      const ip = '192.168.1.104';
      // Even many requests to non-API pages should work
      for (let i = 0; i < 200; i++) {
        const req = createRequest('http://localhost:3000/dashboard', { ip });
        const res = middleware(req);
        expect(res.status).not.toBe(429);
      }
    });

    it('should use x-forwarded-for header for IP extraction', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        headers: { 'x-forwarded-for': '10.0.0.50, 10.0.0.1' },
      });
      const res = middleware(req);
      expect(res.status).not.toBe(429);
    });
  });

  describe('Body Size Enforcement', () => {
    it('should return 413 for POST requests exceeding 10KB', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        method: 'POST',
        headers: { 'content-length': '20000' },
        ip: '10.0.0.2',
      });
      const res = middleware(req);
      expect(res.status).toBe(413);
    });

    it('should return payload too large error JSON', async () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        method: 'POST',
        headers: { 'content-length': '20000' },
        ip: '10.0.0.3',
      });
      const res = middleware(req);
      const body = await res.json();
      expect(body).toEqual({ error: 'Payload too large' });
    });

    it('should return 413 for PUT requests exceeding 10KB', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        method: 'PUT',
        headers: { 'content-length': '15000' },
        ip: '10.0.0.4',
      });
      const res = middleware(req);
      expect(res.status).toBe(413);
    });

    it('should return 413 for PATCH requests exceeding 10KB', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        method: 'PATCH',
        headers: { 'content-length': '11000' },
        ip: '10.0.0.5',
      });
      const res = middleware(req);
      expect(res.status).toBe(413);
    });

    it('should allow POST requests under 10KB', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        method: 'POST',
        headers: { 'content-length': '5000' },
        ip: '10.0.0.6',
      });
      const res = middleware(req);
      expect(res.status).not.toBe(413);
    });

    it('should allow exactly 10KB body (boundary)', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        method: 'POST',
        headers: { 'content-length': '10240' },
        ip: '10.0.0.7',
      });
      const res = middleware(req);
      expect(res.status).not.toBe(413);
    });

    it('should reject body of 10241 bytes (just over limit)', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        method: 'POST',
        headers: { 'content-length': '10241' },
        ip: '10.0.0.8',
      });
      const res = middleware(req);
      expect(res.status).toBe(413);
    });

    it('should not check body size for GET requests', () => {
      const req = createRequest('http://localhost:3000/api/announcements', {
        method: 'GET',
        headers: { 'content-length': '99999' },
        ip: '10.0.0.9',
      });
      const res = middleware(req);
      expect(res.status).not.toBe(413);
    });

    it('should not check body size for non-API routes', () => {
      const req = createRequest('http://localhost:3000/dashboard', {
        method: 'POST',
        headers: { 'content-length': '99999' },
      });
      const res = middleware(req);
      expect(res.status).not.toBe(413);
    });
  });

  describe('Security headers on error responses', () => {
    it('should include security headers on 429 responses', () => {
      const ip = '192.168.1.200';
      for (let i = 0; i < 100; i++) {
        const req = createRequest('http://localhost:3000/api/data', { ip });
        middleware(req);
      }
      const req = createRequest('http://localhost:3000/api/data', { ip });
      const res = middleware(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should include security headers on 413 responses', () => {
      const req = createRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: { 'content-length': '50000' },
        ip: '10.0.0.10',
      });
      const res = middleware(req);
      expect(res.status).toBe(413);
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });
});
