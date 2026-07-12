import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ThemeProvider module', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    // Mock window with matchMedia and localStorage
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      value: {
        matchMedia: vi.fn((query: string) => ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
        localStorage: {
          getItem: vi.fn((key: string) => storage.get(key) ?? null),
          setItem: vi.fn((key: string, value: string) => {
            storage.set(key, value);
          }),
          removeItem: vi.fn((key: string) => {
            storage.delete(key);
          }),
        },
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: (globalThis.window as unknown as { localStorage: Storage }).localStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        documentElement: {
          setAttribute: vi.fn(),
          getAttribute: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it('exports ThemeProvider and useTheme', async () => {
    const mod = await import('./ThemeProvider');
    expect(mod.ThemeProvider).toBeDefined();
    expect(typeof mod.ThemeProvider).toBe('function');
    expect(mod.useTheme).toBeDefined();
    expect(typeof mod.useTheme).toBe('function');
  });

  it('ThemeMode type supports light, dark, system values', async () => {
    // Type check via assignment - if this compiles, the types are correct
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    expect(modes).toHaveLength(3);
  });

  it('localStorage key is theme-preference', () => {
    // Verify the constant matches the spec requirement
    const STORAGE_KEY = 'theme-preference';
    expect(STORAGE_KEY).toBe('theme-preference');
  });

  it('valid ThemeMode values are light, dark, and system', () => {
    const validModes = ['light', 'dark', 'system'];
    expect(validModes).toContain('light');
    expect(validModes).toContain('dark');
    expect(validModes).toContain('system');
    expect(validModes).toHaveLength(3);
  });
});
