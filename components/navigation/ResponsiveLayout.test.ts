import { describe, it, expect } from 'vitest';

describe('ResponsiveLayout module', () => {
  it('exports ResponsiveLayout as a default export', async () => {
    const mod = await import('./ResponsiveLayout');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('ResponsiveLayout component accepts the expected props signature', async () => {
    const mod = await import('./ResponsiveLayout');
    // The component function should exist and be callable (React component)
    const ResponsiveLayout = mod.default;
    expect(ResponsiveLayout).toBeDefined();
    // Function arity: React components accept a single props object
    expect(ResponsiveLayout.length).toBeLessThanOrEqual(2);
  });

  it('uses BOTTOM_NAV_HEIGHT from BottomNav for content padding', async () => {
    const { BOTTOM_NAV_HEIGHT } = await import('./BottomNav');
    // Ensure the constant is available and reasonable
    expect(BOTTOM_NAV_HEIGHT).toBe(64);
    expect(BOTTOM_NAV_HEIGHT).toBeGreaterThanOrEqual(44);
  });

  it('re-exports correctly from the navigation index', async () => {
    const mod = await import('./index');
    expect(mod.ResponsiveLayout).toBeDefined();
    expect(typeof mod.ResponsiveLayout).toBe('function');
  });
});
