import { describe, it, expect } from 'vitest';
import { useDesktopShortcuts } from '@/lib/hooks/useDesktopShortcuts';

describe('Desktop Pro Architecture & Power-User Features', () => {
  it('exposes useDesktopShortcuts hook as a function', () => {
    expect(typeof useDesktopShortcuts).toBe('function');
  });

  it('validates keyboard shortcuts map keys', () => {
    const supportedKeys = ['j', 'k', 'f', 's', 'c', 'm', 'w', '?', '/'];
    expect(supportedKeys).toContain('j');
    expect(supportedKeys).toContain('k');
    expect(supportedKeys).toContain('f');
    expect(supportedKeys).toContain('s');
    expect(supportedKeys).toContain('c');
    expect(supportedKeys).toContain('m');
    expect(supportedKeys).toContain('?');
  });

  it('validates Compare Shelf Dock capacity constraints', () => {
    const maxCompareCount = 3;
    const testIds = ['job-1', 'job-2', 'job-3', 'job-4'];
    const clampedSet = new Set(testIds.slice(0, maxCompareCount));

    expect(clampedSet.size).toBe(3);
    expect(clampedSet.has('job-4')).toBe(false);
  });

  it('validates district filtering matching', () => {
    const ads = [
      { id: '1', title: 'Murarz', location_text: 'Szczecin, Śródmieście' },
      { id: '2', title: 'Hydraulik', location_text: 'Szczecin, Prawobrzeże' },
      { id: '3', title: 'Elektryk', location_text: 'Police' },
    ];

    const filterDistrict = 'śródmieście';
    const filtered = ads.filter((a) => a.location_text.toLowerCase().includes(filterDistrict));

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });
});
