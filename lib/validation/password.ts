/**
 * Password validation for user registration.
 * Rules: ≥ 8 characters, at least one uppercase, one lowercase, one digit.
 */

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; reasons: string[] };

export function validatePassword(password: string): PasswordValidationResult {
  const reasons: string[] = [];

  if (password.length < 8) {
    reasons.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    reasons.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    reasons.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    reasons.push('Password must contain at least one digit');
  }

  if (reasons.length === 0) {
    return { valid: true };
  }

  return { valid: false, reasons };
}
