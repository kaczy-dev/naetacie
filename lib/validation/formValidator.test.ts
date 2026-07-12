import { describe, it, expect } from 'vitest';
import { validateEmail, checkPasswordStrength, validateRequired } from './formValidator';

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('accepts a standard email format', () => {
      const result = validateEmail('user@example.com');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('accepts email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('accepts email with plus addressing', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('accepts email with dots in local part', () => {
      const result = validateEmail('first.last@example.com');
      expect(result).toEqual({ isValid: true, error: null });
    });
  });

  describe('invalid emails', () => {
    it('rejects empty string', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('rejects whitespace-only string', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('rejects email without @ symbol', () => {
      const result = validateEmail('userexample.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('rejects email without domain', () => {
      const result = validateEmail('user@');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('rejects email without TLD', () => {
      const result = validateEmail('user@example');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('rejects email with single char TLD', () => {
      const result = validateEmail('user@example.c');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('rejects email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });
  });
});

describe('checkPasswordStrength', () => {
  describe('full strength (score 4)', () => {
    it('reports all criteria met for a strong password', () => {
      const result = checkPasswordStrength('Abcdefg1');
      expect(result).toEqual({
        hasMinLength: true,
        hasUppercase: true,
        hasLowercase: true,
        hasDigit: true,
        isValid: true,
        score: 4,
      });
    });
  });

  describe('partial strength', () => {
    it('reports missing length for short password with other criteria', () => {
      const result = checkPasswordStrength('Abc1');
      expect(result.hasMinLength).toBe(false);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasDigit).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(3);
    });

    it('reports missing uppercase', () => {
      const result = checkPasswordStrength('abcdefg1');
      expect(result.hasMinLength).toBe(true);
      expect(result.hasUppercase).toBe(false);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasDigit).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(3);
    });

    it('reports missing lowercase', () => {
      const result = checkPasswordStrength('ABCDEFG1');
      expect(result.hasMinLength).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasLowercase).toBe(false);
      expect(result.hasDigit).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(3);
    });

    it('reports missing digit', () => {
      const result = checkPasswordStrength('Abcdefgh');
      expect(result.hasMinLength).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasDigit).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(3);
    });
  });

  describe('no strength', () => {
    it('reports score 0 for empty string', () => {
      const result = checkPasswordStrength('');
      expect(result.hasMinLength).toBe(false);
      expect(result.hasUppercase).toBe(false);
      expect(result.hasLowercase).toBe(false);
      expect(result.hasDigit).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
    });

    it('reports score 1 for only lowercase', () => {
      const result = checkPasswordStrength('abc');
      expect(result.score).toBe(1);
      expect(result.hasLowercase).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles password with special characters meeting all criteria', () => {
      const result = checkPasswordStrength('P@ssw0rd!');
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(4);
    });

    it('handles exactly 8 characters', () => {
      const result = checkPasswordStrength('Abcdefg1');
      expect(result.hasMinLength).toBe(true);
    });

    it('handles 7 characters (just below threshold)', () => {
      const result = checkPasswordStrength('Abcdef1');
      expect(result.hasMinLength).toBe(false);
    });
  });
});

describe('validateRequired', () => {
  it('returns valid for non-empty value', () => {
    const result = validateRequired('hello', 'Username');
    expect(result).toEqual({ isValid: true, error: null });
  });

  it('returns error for empty string', () => {
    const result = validateRequired('', 'Username');
    expect(result).toEqual({ isValid: false, error: 'Username is required' });
  });

  it('returns error for whitespace-only string', () => {
    const result = validateRequired('   ', 'Email');
    expect(result).toEqual({ isValid: false, error: 'Email is required' });
  });

  it('uses the provided field name in error message', () => {
    const result = validateRequired('', 'Display name');
    expect(result.error).toBe('Display name is required');
  });

  it('accepts a single character value', () => {
    const result = validateRequired('a', 'Field');
    expect(result.isValid).toBe(true);
  });
});
