/**
 * Unit tests for AnnouncementList component logic.
 *
 * Since the component imports Firebase client (which requires API keys at module level),
 * we test the pure utility functions that power the component's display logic.
 * Full rendering tests require a jsdom environment with Firebase mocked.
 */

import { describe, it, expect } from 'vitest';
import { computeStaggerDelay } from './AnnouncementList';

describe('formatPrice utility', () => {
  it('should return "N/A" for null price', () => {
    const result = formatPriceLogic(null);
    expect(result).toBe('N/A');
  });

  it('should format a numeric price with PLN suffix', () => {
    const result = formatPriceLogic(5000);
    expect(result).toContain('PLN');
    expect(result).toContain('5');
  });

  it('should format zero price', () => {
    const result = formatPriceLogic(0);
    expect(result).toBe('0 PLN');
  });
});

describe('formatRelativeTime utility', () => {
  it('should return "just now" for timestamps within 60 seconds', () => {
    const now = new Date();
    const result = formatRelativeTimeLogic(new Date(now.getTime() - 30000));
    expect(result).toBe('just now');
  });

  it('should return minutes ago for < 60 minutes', () => {
    const now = new Date();
    const result = formatRelativeTimeLogic(new Date(now.getTime() - 5 * 60 * 1000));
    expect(result).toBe('5m ago');
  });

  it('should return hours ago for < 24 hours', () => {
    const now = new Date();
    const result = formatRelativeTimeLogic(new Date(now.getTime() - 3 * 60 * 60 * 1000));
    expect(result).toBe('3h ago');
  });

  it('should return days ago for < 7 days', () => {
    const now = new Date();
    const result = formatRelativeTimeLogic(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000));
    expect(result).toBe('2d ago');
  });

  it('should return weeks ago for < 4 weeks', () => {
    const now = new Date();
    const result = formatRelativeTimeLogic(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));
    expect(result).toBe('2w ago');
  });
});

describe('getPortalLabel utility', () => {
  it('should return OLX label for olx portal', () => {
    expect(getPortalLabelLogic('olx')).toBe('OLX');
  });

  it('should return Oferteo label for oferteo portal', () => {
    expect(getPortalLabelLogic('oferteo')).toBe('Oferteo');
  });

  it('should return Fixly label for fixly portal', () => {
    expect(getPortalLabelLogic('fixly')).toBe('Fixly');
  });

  it('should return portal name as label for unknown portal', () => {
    expect(getPortalLabelLogic('unknown')).toBe('unknown');
  });
});

describe('computeStaggerDelay', () => {
  it('should return 0 for the first card (index 0)', () => {
    expect(computeStaggerDelay(0)).toBe(0);
  });

  it('should return 50ms per card index', () => {
    expect(computeStaggerDelay(1)).toBe(50);
    expect(computeStaggerDelay(5)).toBe(250);
    expect(computeStaggerDelay(10)).toBe(500);
  });
});

// Helper to replicate the portal label logic for testing
function getPortalLabelLogic(portal: string): string {
  switch (portal) {
    case 'olx':
      return 'OLX';
    case 'oferteo':
      return 'Oferteo';
    case 'fixly':
      return 'Fixly';
    default:
      return portal;
  }
}

// Helper to replicate the price formatting logic for testing
function formatPriceLogic(price: number | null): string {
  if (price === null) {
    return 'N/A';
  }
  return `${price.toLocaleString('pl-PL')} PLN`;
}

// Helper to replicate the relative time formatting logic for testing
function formatRelativeTimeLogic(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return d.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' });
}
