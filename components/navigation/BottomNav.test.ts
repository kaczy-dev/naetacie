import { describe, it, expect } from 'vitest';
import { BOTTOM_NAV_HEIGHT } from './BottomNav';
import type { TabId } from './BottomNav';

describe('BottomNav constants', () => {
  it('exports BOTTOM_NAV_HEIGHT as a positive number', () => {
    expect(BOTTOM_NAV_HEIGHT).toBeGreaterThan(0);
    expect(typeof BOTTOM_NAV_HEIGHT).toBe('number');
  });

  it('BOTTOM_NAV_HEIGHT is at least 44px to meet touch target requirements', () => {
    expect(BOTTOM_NAV_HEIGHT).toBeGreaterThanOrEqual(44);
  });
});

describe('BottomNav TabId type', () => {
  it('accepts valid tab identifiers', () => {
    const validTabs: TabId[] = ['map', 'list', 'favorites', 'settings'];
    expect(validTabs).toHaveLength(4);
    expect(validTabs).toContain('map');
    expect(validTabs).toContain('list');
    expect(validTabs).toContain('favorites');
    expect(validTabs).toContain('settings');
  });
});
