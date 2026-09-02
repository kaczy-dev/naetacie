import { describe, it, expect } from 'vitest';
import {
  checkRolePermission,
  verifyResourceOwnership,
  sanitizePathTraversal,
  maskSensitivePii,
  constantTimeCompare,
  sanitizeHtmlInput,
  preventPrototypePollution,
  sanitizeSafeUrl,
  computePayloadSignature,
  verifyPayloadSignature,
  getEnterpriseSecurityHeaders,
  evaluatePasswordEntropy,
  recordSecurityAudit,
  isSsrfSafeUrl,
} from '@/lib/security/owaspDefenseShield';

describe('OWASP TOP 10 (2021/2025) SECURITY DEFENSE SUITE', () => {

  // =========================================================================
  // A01: BROKEN ACCESS CONTROL (BAC) & IDOR
  // =========================================================================
  describe('A01: Broken Access Control & IDOR Protection', () => {
    it('enforces RBAC role hierarchy correctly', () => {
      expect(checkRolePermission('ADMIN', 'VERIFIED_PRO')).toBe(true);
      expect(checkRolePermission('EMPLOYER', 'VERIFIED_PRO')).toBe(true);
      expect(checkRolePermission('VERIFIED_PRO', 'ADMIN')).toBe(false);
      expect(checkRolePermission('FREE_USER', 'VERIFIED_PRO')).toBe(false);
      expect(checkRolePermission('ANONYMOUS', 'FREE_USER')).toBe(false);
    });

    it('verifies resource ownership and prevents IDOR breaches', () => {
      expect(verifyResourceOwnership('user_123', 'user_123', 'FREE_USER')).toBe(true);
      expect(verifyResourceOwnership('attacker_999', 'victim_123', 'FREE_USER')).toBe(false);
      // Admin override
      expect(verifyResourceOwnership('admin_001', 'victim_123', 'ADMIN')).toBe(true);
    });

    it('strips directory traversal path attempts', () => {
      expect(sanitizePathTraversal('../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizePathTraversal('..\\..\\windows\\system32')).toBe('windows\\system32');
      expect(sanitizePathTraversal('/var/www/html/file.txt')).toBe('var/www/html/file.txt');
    });
  });

  // =========================================================================
  // A02: CRYPTOGRAPHIC FAILURES & PII DATA MASKING
  // =========================================================================
  describe('A02: Cryptographic Failures & Sensitive PII Masking', () => {
    it('masks phone numbers, emails, and NIP numbers for non-authorized viewers', () => {
      const masked = maskSensitivePii({
        phone: '501234567',
        email: 'biuro@budmax-szczecin.pl',
        nip: '8510000003',
      });

      expect(masked.phone).toBe('+48 501 *** 567');
      expect(masked.email).toBe('b***o@b***.pl');
      expect(masked.nip).toBe('851-***-**-03');
    });

    it('prevents timing attacks with constant-time comparison', () => {
      expect(constantTimeCompare('secret_token_12345', 'secret_token_12345')).toBe(true);
      expect(constantTimeCompare('secret_token_12345', 'secret_token_99999')).toBe(false);
      expect(constantTimeCompare('token', 'longer_token')).toBe(false);
    });
  });

  // =========================================================================
  // A03: INJECTION DEFENSE (XSS, Prototype Pollution & Scheme Poisoning)
  // =========================================================================
  describe('A03: Injection Defense (XSS & Prototype Pollution)', () => {
    it('neutralizes malicious XSS script tags and event handlers', () => {
      const dirtyHtml = '<script>alert("XSS")</script><img src="x" onerror="stealCookies()" />Szukam murarza';
      const clean = sanitizeHtmlInput(dirtyHtml);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('onerror');
      expect(clean).toContain('Szukam murarza');
    });

    it('strips malicious javascript: and data: URIs', () => {
      expect(sanitizeSafeUrl('javascript:alert(document.domain)')).toBe('#');
      expect(sanitizeSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('#');
      expect(sanitizeSafeUrl('https://www.olx.pl/d/szczecin/q-elektryk/')).toBe('https://www.olx.pl/d/szczecin/q-elektryk/');
      expect(sanitizeSafeUrl('tel:+48501234567')).toBe('tel:+48501234567');
    });

    it('prevents prototype pollution attacks on JSON payloads', () => {
      const maliciousPayload = JSON.parse('{"title":"Oferta","__proto__":{"polluted":true},"nested":{"constructor":{"admin":true}}}');
      const sanitized = preventPrototypePollution(maliciousPayload);

      expect(sanitized.title).toBe('Oferta');
      expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();
      expect(sanitized).not.toHaveProperty('__proto__');
    });
  });

  // =========================================================================
  // A04: INSECURE DESIGN & ANTI-TAMPERING
  // =========================================================================
  describe('A04: Insecure Design & Price Anti-Tampering Signatures', () => {
    it('signs and verifies payment payloads with HMAC SHA-256', () => {
      const secret = 'super_secret_platform_key_2026';
      const payload = { productId: 'PRO_MONTHLY_SUB', amountGross: 79.0, userId: 'u_123' };

      const signature = computePayloadSignature(payload, secret);
      expect(signature).toHaveLength(64);
      expect(verifyPayloadSignature(payload, signature, secret)).toBe(true);

      // Tampered payload
      const tampered = { ...payload, amountGross: 1.0 };
      expect(verifyPayloadSignature(tampered, signature, secret)).toBe(false);
    });
  });

  // =========================================================================
  // A05: SECURITY MISCONFIGURATION
  // =========================================================================
  describe('A05: Security Misconfiguration & Enterprise Headers', () => {
    it('provides all mandatory HTTP security headers (CSP, HSTS, X-Frame, Nosniff, Permissions)', () => {
      const headers = getEnterpriseSecurityHeaders(false);
      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Permissions-Policy']).toContain('camera=()');
    });
  });

  // =========================================================================
  // A07: IDENTIFICATION AND AUTHENTICATION FAILURES
  // =========================================================================
  describe('A07: Identification and Authentication Failures', () => {
    it('evaluates password entropy and enforces strong passwords', () => {
      const strong = evaluatePasswordEntropy('SzczecinBudMax2026!');
      expect(strong.isStrong).toBe(true);
      expect(strong.score).toBeGreaterThanOrEqual(3);

      const weak = evaluatePasswordEntropy('123456');
      expect(weak.isStrong).toBe(false);
      expect(weak.feedback.length).toBeGreaterThan(0);

      const common = evaluatePasswordEntropy('haslo123456');
      expect(common.isStrong).toBe(false);
      expect(common.feedback).toContain('Hasło jest zbyt popularne');
    });
  });

  // =========================================================================
  // A09: SECURITY LOGGING & MONITORING
  // =========================================================================
  describe('A09: Security Logging & Audit Trail Sanitization', () => {
    it('records security events while redacting secret tokens and passwords', () => {
      const event = recordSecurityAudit({
        eventType: 'AUTH_FAILURE',
        severity: 'MEDIUM',
        ip: '192.168.1.50',
        metadata: {
          userEmail: 'majster@szczecin.pl',
          userPassword: 'RawSecretPassword123!',
          authToken: 'jwt_bearer_token_abc',
        },
      });

      expect(event.metadata?.userPassword).toBe('[REDACTED_SECRET]');
      expect(event.metadata?.authToken).toBe('[REDACTED_SECRET]');
      expect(event.metadata?.userEmail).toBe('majster@szczecin.pl');
    });
  });

  // =========================================================================
  // A10: SERVER-SIDE REQUEST FORGERY (SSRF) DEFENSE
  // =========================================================================
  describe('A10: Server-Side Request Forgery (SSRF) Defense Shield', () => {
    it('allows legitimate external public job board URLs', () => {
      expect(isSsrfSafeUrl('https://www.olx.pl/praca/szczecin/').isSafe).toBe(true);
      expect(isSsrfSafeUrl('https://www.pracuj.pl/praca/szczecin').isSafe).toBe(true);
      expect(isSsrfSafeUrl('https://pl.indeed.com/jobs?q=murarz').isSafe).toBe(true);
    });

    it('blocks internal localhost, 127.0.0.1 and loopback IPs', () => {
      expect(isSsrfSafeUrl('http://localhost:3000/api/secrets').isSafe).toBe(false);
      expect(isSsrfSafeUrl('http://127.0.0.1:8080/admin').isSafe).toBe(false);
      expect(isSsrfSafeUrl('http://127.0.0.5/').isSafe).toBe(false);
    });

    it('blocks private RFC 1918 internal network ranges (10.x, 172.16.x, 192.168.x)', () => {
      expect(isSsrfSafeUrl('http://10.0.0.1/db_backup').isSafe).toBe(false);
      expect(isSsrfSafeUrl('http://172.20.0.5/internal').isSafe).toBe(false);
      expect(isSsrfSafeUrl('http://192.168.1.1/router_admin').isSafe).toBe(false);
    });

    it('blocks Cloud Provider Instance Metadata endpoints (169.254.169.254)', () => {
      expect(isSsrfSafeUrl('http://169.254.169.254/latest/meta-data/').isSafe).toBe(false);
      expect(isSsrfSafeUrl('http://metadata.google.internal/computeMetadata/v1/').isSafe).toBe(false);
    });
  });
});
