import { describe, it, expect } from 'vitest';
import { validatePassword } from './password';

describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('accepts a password meeting all requirements', () => {
      const result = validatePassword('Abcdefg1');
      expect(result).toEqual({ valid: true });
    });

    it('accepts a longer password with mixed characters', () => {
      const result = validatePassword('MyStr0ngPassword');
      expect(result).toEqual({ valid: true });
    });

    it('accepts exactly 8 characters with all requirements met', () => {
      const result = validatePassword('Aa1bbbbb');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('invalid passwords', () => {
    it('rejects empty string with all reasons', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reasons).toContain('Password must be at least 8 characters long');
        expect(result.reasons).toContain('Password must contain at least one uppercase letter');
        expect(result.reasons).toContain('Password must contain at least one lowercase letter');
        expect(result.reasons).toContain('Password must contain at least one digit');
      }
    });

    it('rejects password shorter than 8 characters', () => {
      const result = validatePassword('Ab1cdef');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reasons).toContain('Password must be at least 8 characters long');
      }
    });

    it('rejects password without uppercase letter', () => {
      const result = validatePassword('abcdefg1');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reasons).toContain('Password must contain at least one uppercase letter');
        expect(result.reasons).not.toContain('Password must be at least 8 characters long');
      }
    });

    it('rejects password without lowercase letter', () => {
      const result = validatePassword('ABCDEFG1');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reasons).toContain('Password must contain at least one lowercase letter');
      }
    });

    it('rejects password without digit', () => {
      const result = validatePassword('Abcdefgh');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reasons).toContain('Password must contain at least one digit');
      }
    });

    it('rejects password with multiple missing requirements', () => {
      const result = validatePassword('abc');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reasons.length).toBeGreaterThan(1);
        expect(result.reasons).toContain('Password must be at least 8 characters long');
        expect(result.reasons).toContain('Password must contain at least one uppercase letter');
        expect(result.reasons).toContain('Password must contain at least one digit');
      }
    });
  });

  describe('edge cases', () => {
    it('handles password with only digits', () => {
      const result = validatePassword('12345678');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reasons).toContain('Password must contain at least one uppercase letter');
        expect(result.reasons).toContain('Password must contain at least one lowercase letter');
      }
    });

    it('handles password with special characters but meeting all rules', () => {
      const result = validatePassword('P@ssw0rd!');
      expect(result).toEqual({ valid: true });
    });

    it('handles password with unicode characters', () => {
      const result = validatePassword('Pässw0rd');
      expect(result).toEqual({ valid: true });
    });
  });
});
