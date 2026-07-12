'use client';

/**
 * Form validation module with real-time feedback for login/registration forms.
 * Provides pure validation functions (testable without React) and a React hook
 * for integration with form components.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { useState, useCallback, useRef } from 'react';

// --- Interfaces ---

export interface PasswordStrength {
  hasMinLength: boolean;    // >= 8 characters
  hasUppercase: boolean;    // at least one uppercase letter
  hasLowercase: boolean;    // at least one lowercase letter
  hasDigit: boolean;        // at least one digit
  isValid: boolean;         // all four criteria met
  score: number;            // 0-4 (count of met criteria)
}

export interface EmailValidation {
  isValid: boolean;
  error: string | null;     // null when valid, error message when invalid
}

export interface FieldValidation {
  isValid: boolean;
  error: string | null;
}

// --- Constants ---

/**
 * Email validation regex — checks for a basic valid email format.
 * Requires: non-empty local part, @ symbol, domain with at least one dot,
 * and TLD of 2+ characters.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Debounce delay for email validation in milliseconds */
export const EMAIL_VALIDATION_DEBOUNCE_MS = 300;

// --- Pure Validation Functions ---

/**
 * Validates an email address format.
 * Returns validation result with error message when invalid.
 */
export function validateEmail(email: string): EmailValidation {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true, error: null };
}

/**
 * Checks password strength against 4 criteria:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 *
 * Returns detailed strength info with individual criteria status,
 * overall validity, and score (0-4).
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);

  const criteria = [hasMinLength, hasUppercase, hasLowercase, hasDigit];
  const score = criteria.filter(Boolean).length;
  const isValid = score === 4;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasDigit,
    isValid,
    score,
  };
}

/**
 * Validates that a required field is not empty.
 * Returns validation result with an error message referencing the field name.
 */
export function validateRequired(value: string, fieldName: string): FieldValidation {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true, error: null };
}

// --- React Hook ---

/**
 * React hook for managing form validation state with real-time feedback.
 *
 * Features:
 * - Debounced email validation (300ms) for inline error display
 * - Synchronous password strength checking on every keystroke
 * - Empty field detection on blur or submit attempt
 * - Form-level validity tracking
 */
export function useFormValidation() {
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    isValid: false,
    score: 0,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Validates email with 300ms debounce for real-time inline feedback.
   * Requirement 2.1: inline error within 300ms.
   */
  const validateEmailField = useCallback((email: string) => {
    // Clear existing debounce timer
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }

    // If email is empty, clear error immediately (will be caught by required validation)
    if (!email || email.trim() === '') {
      setEmailError(null);
      return;
    }

    // Debounce the validation
    emailDebounceRef.current = setTimeout(() => {
      const result = validateEmail(email);
      setEmailError(result.error);
    }, EMAIL_VALIDATION_DEBOUNCE_MS);
  }, []);

  /**
   * Checks password strength synchronously on every keystroke.
   * Requirements 2.2, 2.3: real-time strength indicator showing all 4 criteria.
   */
  const validatePasswordField = useCallback((password: string) => {
    const strength = checkPasswordStrength(password);
    setPasswordStrength(strength);
  }, []);

  /**
   * Validates a required field and updates field errors state.
   * Requirement 2.4: inline error messages for empty required fields.
   */
  const validateRequiredField = useCallback((field: string, value: string) => {
    const result = validateRequired(value, field);
    setFieldErrors((prev) => ({ ...prev, [field]: result.error }));
  }, []);

  /**
   * Resets all validation state.
   */
  const resetValidation = useCallback(() => {
    setEmailError(null);
    setPasswordStrength({
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasDigit: false,
      isValid: false,
      score: 0,
    });
    setFieldErrors({});

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }
  }, []);

  /**
   * Computes overall form validity.
   * Form is valid when:
   * - No email error
   * - Password meets all criteria
   * - No field errors present
   */
  const isFormValid =
    emailError === null &&
    passwordStrength.isValid &&
    Object.values(fieldErrors).every((error) => error === null);

  return {
    emailError,
    passwordStrength,
    fieldErrors,
    validateEmailField,
    validatePasswordField,
    validateRequiredField,
    isFormValid,
    resetValidation,
  };
}
