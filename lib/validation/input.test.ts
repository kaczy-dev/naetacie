import { describe, it, expect } from 'vitest';
import {
  validateAndSanitize,
  sanitizeString,
  stripHtmlTags,
  MAX_QUERY_PARAM_LENGTH,
  MAX_BODY_FIELD_LENGTH,
  type ValidationSchema,
} from './input';

describe('stripHtmlTags', () => {
  it('removes simple HTML tags', () => {
    expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello');
  });

  it('removes self-closing tags', () => {
    expect(stripHtmlTags('Hello<br/>World')).toBe('HelloWorld');
  });

  it('removes HTML comments', () => {
    expect(stripHtmlTags('Hello<!-- comment -->World')).toBe('HelloWorld');
  });

  it('removes nested tags', () => {
    expect(stripHtmlTags('<div><span>text</span></div>')).toBe('text');
  });

  it('returns empty string for tag-only input', () => {
    expect(stripHtmlTags('<div></div>')).toBe('');
  });

  it('preserves plain text', () => {
    expect(stripHtmlTags('Hello World')).toBe('Hello World');
  });
});

describe('sanitizeString', () => {
  it('removes script elements with content', () => {
    const result = sanitizeString('<script>alert("xss")</script>Hello');
    expect(result).toBe('Hello');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('removes event handler attributes', () => {
    const result = sanitizeString('<div onclick="evil()">text</div>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('evil');
    expect(result).toContain('text');
  });

  it('removes onerror handlers', () => {
    const result = sanitizeString('<img onerror="alert(1)" src="x">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('removes SQL injection patterns - DROP TABLE', () => {
    const result = sanitizeString("'; DROP TABLE users;");
    expect(result.toLowerCase()).not.toContain('drop table');
  });

  it('removes SQL injection patterns - OR 1=1', () => {
    const result = sanitizeString("' OR 1=1 --");
    expect(result).not.toMatch(/OR\s+1\s*=\s*1/i);
  });

  it('removes SQL comments', () => {
    const result = sanitizeString('value -- comment');
    expect(result).not.toContain('--');
  });

  it('preserves safe textual content', () => {
    const result = sanitizeString('Hello World, this is safe text.');
    expect(result).toBe('Hello World, this is safe text.');
  });

  it('handles mixed dangerous content', () => {
    const result = sanitizeString(
      '<script>alert(1)</script><p onclick="hack()">safe text</p>; DROP TABLE x;'
    );
    expect(result).not.toContain('<script');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('DROP TABLE');
    expect(result).toContain('safe text');
  });
});

describe('validateAndSanitize', () => {
  describe('string type', () => {
    const schema: ValidationSchema = {
      name: { type: 'string', required: true, maxLength: 50 },
    };

    it('validates and sanitizes a valid string', () => {
      const result = validateAndSanitize({ name: 'John Doe' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.name).toBe('John Doe');
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing required field', () => {
      const result = validateAndSanitize({}, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toEqual({ field: 'name', reason: 'name is required' });
    });

    it('rejects oversized string', () => {
      const result = validateAndSanitize({ name: 'a'.repeat(51) }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].reason).toContain('50 characters');
    });

    it('sanitizes HTML from string values', () => {
      const result = validateAndSanitize({ name: '<b>John</b>' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.name).toBe('John');
    });
  });

  describe('number type', () => {
    const schema: ValidationSchema = {
      page: { type: 'number', required: true, min: 1, max: 100 },
    };

    it('accepts valid number', () => {
      const result = validateAndSanitize({ page: 5 }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.page).toBe(5);
    });

    it('accepts numeric string', () => {
      const result = validateAndSanitize({ page: '10' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.page).toBe(10);
    });

    it('rejects non-numeric value', () => {
      const result = validateAndSanitize({ page: 'abc' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toContain('valid number');
    });

    it('rejects value below min', () => {
      const result = validateAndSanitize({ page: 0 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toContain('at least 1');
    });

    it('rejects value above max', () => {
      const result = validateAndSanitize({ page: 101 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toContain('at most 100');
    });
  });

  describe('boolean type', () => {
    const schema: ValidationSchema = {
      active: { type: 'boolean', required: true },
    };

    it('accepts true boolean', () => {
      const result = validateAndSanitize({ active: true }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.active).toBe(true);
    });

    it('accepts string "true"', () => {
      const result = validateAndSanitize({ active: 'true' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.active).toBe(true);
    });

    it('accepts string "false"', () => {
      const result = validateAndSanitize({ active: 'false' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.active).toBe(false);
    });

    it('rejects invalid boolean value', () => {
      const result = validateAndSanitize({ active: 'maybe' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toContain('boolean');
    });
  });

  describe('email type', () => {
    const schema: ValidationSchema = {
      email: { type: 'email', required: true },
    };

    it('accepts valid email', () => {
      const result = validateAndSanitize({ email: 'user@example.com' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.email).toBe('user@example.com');
    });

    it('normalizes email to lowercase', () => {
      const result = validateAndSanitize({ email: 'User@Example.COM' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.email).toBe('user@example.com');
    });

    it('rejects invalid email format', () => {
      const result = validateAndSanitize({ email: 'not-an-email' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toContain('valid email');
    });

    it('rejects email without domain', () => {
      const result = validateAndSanitize({ email: 'user@' }, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('pattern validation', () => {
    const schema: ValidationSchema = {
      code: { type: 'string', required: true, pattern: /^[A-Z]{3}-\d{4}$/ },
    };

    it('accepts value matching pattern', () => {
      const result = validateAndSanitize({ code: 'ABC-1234' }, schema);
      expect(result.valid).toBe(true);
    });

    it('rejects value not matching pattern', () => {
      const result = validateAndSanitize({ code: 'invalid' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toContain('expected format');
    });
  });

  describe('context-based max length', () => {
    const schema: ValidationSchema = {
      search: { type: 'string' },
    };

    it('enforces 200-char limit for query context', () => {
      const result = validateAndSanitize(
        { search: 'a'.repeat(201) },
        schema,
        'query'
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toContain(`${MAX_QUERY_PARAM_LENGTH} characters`);
    });

    it('allows up to 200 chars in query context', () => {
      const result = validateAndSanitize(
        { search: 'a'.repeat(200) },
        schema,
        'query'
      );
      expect(result.valid).toBe(true);
    });

    it('enforces 1000-char limit for body context', () => {
      const result = validateAndSanitize(
        { search: 'a'.repeat(1001) },
        schema,
        'body'
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toContain(`${MAX_BODY_FIELD_LENGTH} characters`);
    });

    it('allows up to 1000 chars in body context', () => {
      const result = validateAndSanitize(
        { search: 'a'.repeat(1000) },
        schema,
        'body'
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('optional fields', () => {
    const schema: ValidationSchema = {
      name: { type: 'string', required: true },
      bio: { type: 'string', required: false },
    };

    it('skips optional fields when not provided', () => {
      const result = validateAndSanitize({ name: 'John' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toHaveProperty('bio');
    });

    it('validates optional fields when provided', () => {
      const result = validateAndSanitize({ name: 'John', bio: '<script>x</script>Safe' }, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitized.bio).toBe('Safe');
    });
  });

  describe('multiple errors', () => {
    const schema: ValidationSchema = {
      name: { type: 'string', required: true },
      age: { type: 'number', required: true, min: 0 },
      email: { type: 'email', required: true },
    };

    it('reports all errors when multiple fields are invalid', () => {
      const result = validateAndSanitize({ age: -1, email: 'bad' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('age');
      expect(fields).toContain('email');
    });

    it('error responses contain field name and human-readable reason', () => {
      const result = validateAndSanitize({}, schema);
      for (const error of result.errors) {
        expect(error.field).toBeTruthy();
        expect(error.reason).toBeTruthy();
        // Should not expose internal details
        expect(error.reason).not.toMatch(/stack|trace|internal|file|path/i);
      }
    });
  });
});
