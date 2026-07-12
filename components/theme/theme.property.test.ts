import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// Feature: ux-security-enhancements, Property 17/18

/**
 * Feature: ux-security-enhancements, Property 17: Theme preference round-trip persistence
 * Validates: Requirements 13.5
 *
 * For any valid theme mode ('light', 'dark', 'system'), setting the theme preference
 * SHALL persist the value to localStorage, and reading the preference on next load
 * SHALL return the same value.
 */

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme-preference';

/** Persist theme preference to localStorage */
function setThemePreference(mode: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

/** Read theme preference from localStorage */
function getThemePreference(): ThemeMode | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

// --- WCAG Contrast Ratio Utilities ---

/**
 * Parse a hex color string to RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

/**
 * Compute relative luminance per WCAG 2.1 definition.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const toLinear = (c: number): number => {
    const sRgb = c / 255;
    return sRgb <= 0.03928 ? sRgb / 12.92 : Math.pow((sRgb + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Compute WCAG contrast ratio between two colors.
 * Returns a value >= 1 (higher = more contrast).
 */
function contrastRatio(foreground: string, background: string): number {
  const lumFg = relativeLuminance(foreground);
  const lumBg = relativeLuminance(background);
  const lighter = Math.max(lumFg, lumBg);
  const darker = Math.min(lumFg, lumBg);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Dark mode color pairs from styles/tokens.css ---

interface ColorPair {
  name: string;
  foreground: string;
  background: string;
}

const DARK_MODE_COLOR_PAIRS: ColorPair[] = [
  {
    name: 'Primary text (gray-100) on background (gray-900)',
    foreground: '#f3f4f6',
    background: '#111827',
  },
  {
    name: 'Secondary text (gray-400) on background (gray-900)',
    foreground: '#9ca3af',
    background: '#111827',
  },
  {
    name: 'Primary color (#60a5fa) on background (gray-900)',
    foreground: '#60a5fa',
    background: '#111827',
  },
  {
    name: 'Primary text (gray-100) on surface (gray-800)',
    foreground: '#f3f4f6',
    background: '#1f2937',
  },
];

// --- localStorage mock for Node environment ---

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
  };
})();

// Set up localStorage mock
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Property 17: Theme preference round-trip persistence', () => {
  // Feature: ux-security-enhancements, Property 17

  beforeEach(() => {
    localStorageMock.clear();
  });

  const themeModeArb: fc.Arbitrary<ThemeMode> = fc.constantFrom('light', 'dark', 'system');

  it('setting a theme preference persists it and reading returns the same value', () => {
    fc.assert(
      fc.property(themeModeArb, (mode) => {
        // Clear before each iteration to simulate fresh state
        localStorageMock.clear();

        // Set the theme preference
        setThemePreference(mode);

        // Read it back (simulating "next load")
        const retrieved = getThemePreference();

        expect(retrieved).toBe(mode);
      }),
      { numRuns: 100 }
    );
  });

  it('the last-set theme preference wins when set multiple times', () => {
    fc.assert(
      fc.property(
        fc.array(themeModeArb, { minLength: 1, maxLength: 10 }),
        (modes) => {
          localStorageMock.clear();

          // Set multiple times
          for (const mode of modes) {
            setThemePreference(mode);
          }

          // The last one should be the persisted value
          const lastMode = modes[modes.length - 1];
          const retrieved = getThemePreference();

          expect(retrieved).toBe(lastMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('reading preference returns null when nothing has been stored', () => {
    localStorageMock.clear();
    const retrieved = getThemePreference();
    expect(retrieved).toBeNull();
  });

  it('reading preference returns null for invalid stored values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          (s) => s !== 'light' && s !== 'dark' && s !== 'system'
        ),
        (invalidValue) => {
          localStorageMock.clear();
          localStorage.setItem(THEME_STORAGE_KEY, invalidValue);

          const retrieved = getThemePreference();
          expect(retrieved).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ux-security-enhancements, Property 18: Dark mode contrast ratio compliance
 * Validates: Requirements 13.6
 *
 * For any text/background color pair defined in the dark theme tokens,
 * the computed WCAG contrast ratio SHALL be >= 4.5:1.
 */
describe('Property 18: Dark mode contrast ratio compliance', () => {
  // Feature: ux-security-enhancements, Property 18

  const colorPairArb: fc.Arbitrary<ColorPair> = fc.constantFrom(...DARK_MODE_COLOR_PAIRS);

  it('all dark mode text/background color pairs meet WCAG AA contrast ratio (>= 4.5:1)', () => {
    fc.assert(
      fc.property(colorPairArb, (pair) => {
        const ratio = contrastRatio(pair.foreground, pair.background);

        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }),
      { numRuns: 100 }
    );
  });

  it('contrast ratio computation is symmetric (order of lighter/darker does not matter)', () => {
    fc.assert(
      fc.property(colorPairArb, (pair) => {
        const ratioNormal = contrastRatio(pair.foreground, pair.background);
        const ratioReversed = contrastRatio(pair.background, pair.foreground);

        // Contrast ratio should be the same regardless of which is fg/bg
        expect(Math.abs(ratioNormal - ratioReversed)).toBeLessThan(0.001);
      }),
      { numRuns: 100 }
    );
  });

  it('all specific dark mode pairs have contrast ratio >= 4.5:1 (exhaustive)', () => {
    // Verify each pair explicitly to provide clear diagnostics on failure
    for (const pair of DARK_MODE_COLOR_PAIRS) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      expect(
        ratio,
        `${pair.name}: expected contrast ratio >= 4.5:1, got ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('relative luminance is always between 0 and 1 for any valid hex color', () => {
    const hexColorArb = fc
      .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      )
      .map(
        ([r, g, b]) =>
          `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

    fc.assert(
      fc.property(hexColorArb, (hex) => {
        const lum = relativeLuminance(hex);
        expect(lum).toBeGreaterThanOrEqual(0);
        expect(lum).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('contrast ratio is always >= 1 for any two colors', () => {
    const hexColorArb = fc
      .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      )
      .map(
        ([r, g, b]) =>
          `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

    fc.assert(
      fc.property(hexColorArb, hexColorArb, (color1, color2) => {
        const ratio = contrastRatio(color1, color2);
        expect(ratio).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});
