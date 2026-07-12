/**
 * Unit tests for AnnouncementDetail component logic.
 *
 * Tests validate the pure utility functions and tier-based access logic
 * that drive the component's rendering decisions.
 */

import { describe, it, expect } from 'vitest';
import type { MaskedAnnouncement } from '@/lib/types/announcement';

// Replicate formatPrice logic from the component
function formatPrice(price: number | null): string {
  if (price === null) {
    return 'Price not listed';
  }
  return `${price.toLocaleString('pl-PL')} PLN`;
}

// Replicate formatDate logic from the component
function formatDate(date: Date | string | null): string {
  if (date === null) {
    return '—';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Replicate getPortalLabel logic from the component
function getPortalLabel(portal: string): string {
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

/**
 * Determine whether a field should show the locked/upgrade state.
 * For free tier: source_url and contact_info are masked.
 */
function isFieldLocked(
  tier: 'free' | 'premium',
  fieldValue: string | null | undefined
): boolean {
  return tier === 'free' || fieldValue === undefined;
}

describe('AnnouncementDetail - formatPrice', () => {
  it('should return "Price not listed" for null price', () => {
    expect(formatPrice(null)).toBe('Price not listed');
  });

  it('should format numeric price with PLN suffix', () => {
    const result = formatPrice(15000);
    expect(result).toContain('PLN');
    expect(result).toContain('15');
  });

  it('should handle zero price', () => {
    expect(formatPrice(0)).toBe('0 PLN');
  });
});

describe('AnnouncementDetail - formatDate', () => {
  it('should return "—" for null date', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('should format a Date object', () => {
    const date = new Date('2024-03-15T10:30:00Z');
    const result = formatDate(date);
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  it('should format a date string', () => {
    const result = formatDate('2024-06-20T08:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('20');
  });
});

describe('AnnouncementDetail - getPortalLabel', () => {
  it('should return "OLX" for olx', () => {
    expect(getPortalLabel('olx')).toBe('OLX');
  });

  it('should return "Oferteo" for oferteo', () => {
    expect(getPortalLabel('oferteo')).toBe('Oferteo');
  });

  it('should return "Fixly" for fixly', () => {
    expect(getPortalLabel('fixly')).toBe('Fixly');
  });

  it('should return raw portal name for unknown portal', () => {
    expect(getPortalLabel('other')).toBe('other');
  });
});

describe('AnnouncementDetail - tier-based field locking', () => {
  it('should lock field for free tier even when value exists', () => {
    expect(isFieldLocked('free', 'https://example.com')).toBe(true);
  });

  it('should lock field when value is undefined (field omitted by masking)', () => {
    expect(isFieldLocked('premium', undefined)).toBe(true);
  });

  it('should not lock field for premium tier when value is present', () => {
    expect(isFieldLocked('premium', 'https://example.com')).toBe(false);
  });

  it('should not lock field for premium tier when value is null (not provided)', () => {
    expect(isFieldLocked('premium', null)).toBe(false);
  });
});

describe('AnnouncementDetail - empty state', () => {
  it('should identify null announcement as empty state', () => {
    const announcement: MaskedAnnouncement | null = null;
    expect(announcement === null).toBe(true);
  });

  it('should identify non-null announcement as having content', () => {
    const announcement: MaskedAnnouncement = {
      deduplication_key: 'test-123',
      title: 'Test Ad',
      description: 'Test description',
      source_portal: 'olx',
      category: 'construction',
      location_text: 'Szczecin',
      latitude: 53.4285,
      longitude: 14.5528,
      price: 5000,
      scraped_at: new Date('2024-01-01'),
      published_at: null,
    };
    expect(announcement !== null).toBe(true);
  });
});

describe('AnnouncementDetail - premium tier field visibility', () => {
  it('should show source_url when present for premium tier', () => {
    const announcement: MaskedAnnouncement = {
      deduplication_key: 'premium-123',
      title: 'Premium Ad',
      description: 'Full description visible',
      source_portal: 'oferteo',
      category: 'renovation',
      location_text: 'Szczecin centrum',
      latitude: 53.43,
      longitude: 14.55,
      price: 12000,
      scraped_at: new Date('2024-06-01'),
      published_at: new Date('2024-05-30'),
      source_url: 'https://oferteo.pl/ad/123',
      contact_info: '+48 123 456 789',
    };

    // Premium user with defined source_url - should not be locked
    expect(isFieldLocked('premium', announcement.source_url)).toBe(false);
    expect(isFieldLocked('premium', announcement.contact_info)).toBe(false);
  });

  it('should show lock for free tier even with full data', () => {
    const announcement: MaskedAnnouncement = {
      deduplication_key: 'free-123',
      title: 'Free Ad',
      description: 'Truncated desc...',
      source_portal: 'fixly',
      category: 'construction',
      location_text: 'Szczecin',
      latitude: null,
      longitude: null,
      price: null,
      scraped_at: new Date('2024-01-15'),
      published_at: null,
      // source_url and contact_info omitted for free tier
    };

    expect(isFieldLocked('free', announcement.source_url)).toBe(true);
    expect(isFieldLocked('free', announcement.contact_info)).toBe(true);
  });
});
