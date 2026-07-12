/**
 * Input validation and sanitization module.
 * Validates inputs against a schema and sanitizes string values
 * to protect against injection attacks and malformed data.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email';
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; reason: string }>;
  sanitized: Record<string, unknown>;
}

/** Maximum length for query parameter string values */
export const MAX_QUERY_PARAM_LENGTH = 200;

/** Maximum length for body field string values */
export const MAX_BODY_FIELD_LENGTH = 1000;

/**
 * Email validation regex — checks for a basic valid email format.
 * Allows standard characters before @, domain labels, and a TLD of 2+ chars.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Patterns considered dangerous for SQL injection.
 * These are removed from string inputs during sanitization.
 */
const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|UNION|TRUNCATE)\b\s)/gi,
  /(--|#|\/\*|\*\/)/g,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /('\s*(OR|AND)\s+')/gi,
  /(;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|TRUNCATE))/gi,
  /(\bOR\b\s+\w+\s*=\s*\w+)/gi,
];

/**
 * Strips all HTML tags from a string.
 * Removes both opening and closing tags, self-closing tags, and comments.
 */
export function stripHtmlTags(input: string): string {
  // Remove HTML comments
  let result = input.replace(/<!--[\s\S]*?-->/g, '');
  // Remove all HTML tags
  result = result.replace(/<\/?[^>]+(>|$)/g, '');
  return result;
}

/**
 * Sanitizes a string by removing dangerous patterns:
 * - HTML tags and script elements
 * - Event handler attributes (onclick, onerror, etc.)
 * - SQL injection patterns
 *
 * Preserves safe textual content.
 */
export function sanitizeString(input: string): string {
  let result = input;

  // Remove script elements and their content
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handler attributes (e.g., onclick="...", onerror='...')
  result = result.replace(/\s*on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
  result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Strip remaining HTML tags
  result = stripHtmlTags(result);

  // Remove SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // Trim excessive whitespace produced by removals
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
}

/**
 * Validates and sanitizes an input object against a schema.
 * Returns validation errors and sanitized values.
 *
 * @param input - The raw input object (query params, body fields, etc.)
 * @param schema - The validation schema defining expected fields and rules
 * @param context - Optional context: 'query' enforces 200-char limit, 'body' enforces 1000-char limit
 */
export function validateAndSanitize(
  input: Record<string, unknown>,
  schema: ValidationSchema,
  context: 'query' | 'body' = 'body'
): ValidationResult {
  const errors: Array<{ field: string; reason: string }> = [];
  const sanitized: Record<string, unknown> = {};

  const defaultMaxLength = context === 'query' ? MAX_QUERY_PARAM_LENGTH : MAX_BODY_FIELD_LENGTH;

  for (const [field, rule] of Object.entries(schema)) {
    const value = input[field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, reason: `${field} is required` });
      continue;
    }

    // Skip optional fields that are not provided
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Validate by type
    switch (rule.type) {
      case 'string': {
        const strValue = String(value);
        const maxLen = rule.maxLength ?? defaultMaxLength;

        if (strValue.length > maxLen) {
          errors.push({
            field,
            reason: `${field} must not exceed ${maxLen} characters`,
          });
          continue;
        }

        if (rule.pattern && !rule.pattern.test(strValue)) {
          errors.push({
            field,
            reason: `${field} does not match the expected format`,
          });
          continue;
        }

        sanitized[field] = sanitizeString(strValue);
        break;
      }

      case 'number': {
        const numValue = Number(value);

        if (isNaN(numValue)) {
          errors.push({ field, reason: `${field} must be a valid number` });
          continue;
        }

        if (rule.min !== undefined && numValue < rule.min) {
          errors.push({
            field,
            reason: `${field} must be at least ${rule.min}`,
          });
          continue;
        }

        if (rule.max !== undefined && numValue > rule.max) {
          errors.push({
            field,
            reason: `${field} must be at most ${rule.max}`,
          });
          continue;
        }

        sanitized[field] = numValue;
        break;
      }

      case 'boolean': {
        if (typeof value === 'boolean') {
          sanitized[field] = value;
        } else if (value === 'true' || value === '1') {
          sanitized[field] = true;
        } else if (value === 'false' || value === '0') {
          sanitized[field] = false;
        } else {
          errors.push({ field, reason: `${field} must be a boolean value` });
        }
        break;
      }

      case 'email': {
        const emailStr = String(value);
        const emailMaxLen = rule.maxLength ?? defaultMaxLength;

        if (emailStr.length > emailMaxLen) {
          errors.push({
            field,
            reason: `${field} must not exceed ${emailMaxLen} characters`,
          });
          continue;
        }

        if (!EMAIL_REGEX.test(emailStr)) {
          errors.push({ field, reason: `${field} must be a valid email address` });
          continue;
        }

        sanitized[field] = emailStr.toLowerCase().trim();
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}
