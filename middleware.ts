/**
 * Next.js Middleware - Security Headers, Rate Limiting, and Body Size Enforcement
 *
 * Applied to all routes except static files (_next/static, _next/image, favicon.ico).
 *
 * Execution order:
 * 1. Rate limiting (applied before auth verification per Requirement 5.5)
 * 2. Body size enforcement (10KB limit for POST/PUT/PATCH on API routes)
 * 3. Security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
 *
 * Requirements: 6.1, 6.2, 4.5, 5.5
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  checkRateLimit,
  AUTH_RATE_LIMIT,
  GENERAL_RATE_LIMIT,
} from './lib/middleware/rateLimiter';

/** Maximum request body size in bytes (10KB) */
const MAX_BODY_SIZE = 10240;

/** Whether we are running in development mode */
const isDev = process.env.NODE_ENV === 'development';

/** Security headers applied to all responses */
const securityHeaders: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://*.googleusercontent.com https://*.basemaps.cartocdn.com https://unpkg.com https://*.google.com",
    `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firestore.googleapis.com wss://*.firestore.googleapis.com wss://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://www.olx.pl${isDev ? ' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*' : ''}`,
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(self), payment=(self)',
  'X-XSS-Protection': '1; mode=block',
};

/**
 * Extract client IP from the request.
 * Checks x-forwarded-for header first, then request.ip, with 'unknown' as fallback.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs; take the first one
    return forwarded.split(',')[0].trim();
  }
  return request.ip || 'unknown';
}

/**
 * Apply security headers to a NextResponse.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Fast-path bypass for static files & Next internals
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname.includes('.') ||
      pathname === '/favicon.ico'
    ) {
      return NextResponse.next();
    }

    const isApiRoute = pathname.startsWith('/api/');

    // --- 1. Rate Limiting (applied before auth verification) ---
    if (isApiRoute) {
      const clientIp = getClientIp(request);
      const isAuthEndpoint = pathname.startsWith('/api/auth');
      const config = isAuthEndpoint ? AUTH_RATE_LIMIT : GENERAL_RATE_LIMIT;
      const rateLimitKey = isAuthEndpoint ? `auth:${clientIp}` : clientIp;

      const result = checkRateLimit(rateLimitKey, config);

      if (!result.allowed) {
        const rateLimitResponse = NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
        rateLimitResponse.headers.set(
          'Retry-After',
          String(result.retryAfterSeconds)
        );
        return applySecurityHeaders(rateLimitResponse);
      }
    }

    // --- 2. Body Size Enforcement (POST/PUT/PATCH on API routes) ---
    if (isApiRoute) {
      const method = request.method.toUpperCase();
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
          const payloadResponse = NextResponse.json(
            { error: 'Payload too large' },
            { status: 413 }
          );
          return applySecurityHeaders(payloadResponse);
        }
      }
    }

    // --- 3. Apply Security Headers to all responses ---
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|woff|woff2)).*)'],
};
