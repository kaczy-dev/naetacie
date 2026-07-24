import { describe, it, expect } from 'vitest';
import { filterGeocodedAnnouncements, formatPrice } from './utils';
import { MaskedAnnouncement } from '@/lib/types/announcement';

function createAnnouncement(
  overrides: Partial<MaskedAnnouncement> = {}
): MaskedAnnouncement {
  return {
    deduplication_key: 'test-key-1',
    title: 'Test Announcement',
    description: 'Test description',
    source_portal: 'olx',
    category: 'construction',
    location_text: 'Szczecin',
    latitude: 53.4285,
    longitude: 14.5528,
    price: 1000,
    scraped_at: new Date(),
    published_at: null,
    ...overrides,
  };
}

describe('filterGeocodedAnnouncements', () => {
  it('includes announcements with both latitude and longitude', () => {
    const announcements = [
      createAnnouncement({ latitude: 53.4, longitude: 14.5 }),
    ];

    const result = filterGeocodedAnnouncements(announcements);

    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBe(53.4);
    expect(result[0].longitude).toBe(14.5);
  });

  it('excludes announcements with null latitude', () => {
    const announcements = [
      createAnnouncement({ latitude: null, longitude: 14.5 }),
    ];

    const result = filterGeocodedAnnouncements(announcements);

    expect(result).toHaveLength(0);
  });

  it('excludes announcements with null longitude', () => {
    const announcements = [
      createAnnouncement({ latitude: 53.4, longitude: null }),
    ];

    const result = filterGeocodedAnnouncements(announcements);

    expect(result).toHaveLength(0);
  });

  it('excludes announcements with both null latitude and longitude', () => {
    const announcements = [
      createAnnouncement({ latitude: null, longitude: null }),
    ];

    const result = filterGeocodedAnnouncements(announcements);

    expect(result).toHaveLength(0);
  });

  it('filters a mixed list correctly', () => {
    const announcements = [
      createAnnouncement({
        deduplication_key: 'valid-1',
        latitude: 53.4,
        longitude: 14.5,
      }),
      createAnnouncement({
        deduplication_key: 'no-lat',
        latitude: null,
        longitude: 14.5,
      }),
      createAnnouncement({
        deduplication_key: 'no-lng',
        latitude: 53.4,
        longitude: null,
      }),
      createAnnouncement({
        deduplication_key: 'valid-2',
        latitude: 53.5,
        longitude: 14.6,
      }),
      createAnnouncement({
        deduplication_key: 'no-both',
        latitude: null,
        longitude: null,
      }),
    ];

    const result = filterGeocodedAnnouncements(announcements);

    expect(result).toHaveLength(2);
    expect(result[0].deduplication_key).toBe('valid-1');
    expect(result[1].deduplication_key).toBe('valid-2');
  });

  it('returns empty array for empty input', () => {
    const result = filterGeocodedAnnouncements([]);
    expect(result).toHaveLength(0);
  });

  it('returns all announcements when all have valid coordinates', () => {
    const announcements = [
      createAnnouncement({
        deduplication_key: 'a',
        latitude: 53.0,
        longitude: 14.0,
      }),
      createAnnouncement({
        deduplication_key: 'b',
        latitude: 53.1,
        longitude: 14.1,
      }),
      createAnnouncement({
        deduplication_key: 'c',
        latitude: 53.2,
        longitude: 14.2,
      }),
    ];

    const result = filterGeocodedAnnouncements(announcements);

    expect(result).toHaveLength(3);
  });
});


describe('formatPrice', () => {
  it('returns "Cena niepodana" for null price', () => {
    expect(formatPrice(null)).toBe('Cena niepodana');
  });

  it('formats a numeric price with PLN suffix', () => {
    const result = formatPrice(1000);
    expect(result).toContain('1');
    expect(result).toContain('000');
    expect(result).toContain('PLN');
  });

  it('formats zero price', () => {
    const result = formatPrice(0);
    expect(result).toContain('0');
    expect(result).toContain('PLN');
  });
});
