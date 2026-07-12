import { describe, it, expect } from 'vitest';
import { applyTierMasking } from './masking';
import type { Announcement } from '@/lib/types/announcement';

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    deduplication_key: 'olx-123',
    title: 'Test Ad',
    description: 'Short description',
    source_url: 'https://olx.pl/ad/123',
    source_portal: 'olx',
    category: 'construction',
    location_text: 'Szczecin',
    latitude: 53.4285,
    longitude: 14.5528,
    price: 1500,
    contact_info: '555-123-456',
    scraped_at: new Date('2024-01-01T00:00:00Z'),
    published_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('applyTierMasking', () => {
  const currentTime = new Date('2024-01-05T00:00:00Z'); // 4 days after scraped_at

  describe('premium tier', () => {
    it('returns all announcements with full data', () => {
      const announcements = [
        makeAnnouncement({ scraped_at: new Date('2024-01-04T23:00:00Z') }), // 1h old
        makeAnnouncement({ scraped_at: new Date('2024-01-01T00:00:00Z') }), // 4 days old
      ];

      const result = applyTierMasking(announcements, 'premium', currentTime);

      expect(result).toHaveLength(2);
      expect(result[0].source_url).toBe('https://olx.pl/ad/123');
      expect(result[0].contact_info).toBe('555-123-456');
      expect(result[1].source_url).toBe('https://olx.pl/ad/123');
      expect(result[1].contact_info).toBe('555-123-456');
    });

    it('does not truncate descriptions', () => {
      const longDesc = 'A'.repeat(200);
      const announcements = [makeAnnouncement({ description: longDesc })];

      const result = applyTierMasking(announcements, 'premium', currentTime);

      expect(result[0].description).toBe(longDesc);
    });
  });

  describe('free tier', () => {
    it('filters out announcements newer than 48 hours', () => {
      const announcements = [
        makeAnnouncement({ deduplication_key: 'new', scraped_at: new Date('2024-01-04T12:00:00Z') }), // 12h old
        makeAnnouncement({ deduplication_key: 'old', scraped_at: new Date('2024-01-01T00:00:00Z') }), // 4 days old
      ];

      const result = applyTierMasking(announcements, 'free', currentTime);

      expect(result).toHaveLength(1);
      expect(result[0].deduplication_key).toBe('old');
    });

    it('filters out announcements exactly at 48h boundary', () => {
      // Exactly 48h ago should NOT be included (> 48h required, not >=)
      const exactlyAt48h = new Date(currentTime.getTime() - 48 * 60 * 60 * 1000);
      const announcements = [makeAnnouncement({ scraped_at: exactlyAt48h })];

      const result = applyTierMasking(announcements, 'free', currentTime);

      expect(result).toHaveLength(0);
    });

    it('includes announcements just over 48h old', () => {
      const justOver48h = new Date(currentTime.getTime() - 48 * 60 * 60 * 1000 - 1);
      const announcements = [makeAnnouncement({ scraped_at: justOver48h })];

      const result = applyTierMasking(announcements, 'free', currentTime);

      expect(result).toHaveLength(1);
    });

    it('truncates descriptions longer than 100 characters', () => {
      const longDesc = 'B'.repeat(150);
      const announcements = [makeAnnouncement({ description: longDesc })];

      const result = applyTierMasking(announcements, 'free', currentTime);

      expect(result[0].description).toBe('B'.repeat(100) + '...');
      expect(result[0].description).toHaveLength(103);
    });

    it('does not truncate descriptions of exactly 100 characters', () => {
      const exactDesc = 'C'.repeat(100);
      const announcements = [makeAnnouncement({ description: exactDesc })];

      const result = applyTierMasking(announcements, 'free', currentTime);

      expect(result[0].description).toBe(exactDesc);
    });

    it('does not truncate descriptions shorter than 100 characters', () => {
      const shortDesc = 'Short';
      const announcements = [makeAnnouncement({ description: shortDesc })];

      const result = applyTierMasking(announcements, 'free', currentTime);

      expect(result[0].description).toBe(shortDesc);
    });

    it('omits source_url and contact_info', () => {
      const announcements = [makeAnnouncement()];

      const result = applyTierMasking(announcements, 'free', currentTime);

      expect(result[0]).not.toHaveProperty('source_url');
      expect(result[0]).not.toHaveProperty('contact_info');
    });

    it('returns empty array when all announcements are too new', () => {
      const announcements = [
        makeAnnouncement({ scraped_at: new Date('2024-01-04T12:00:00Z') }),
        makeAnnouncement({ scraped_at: new Date('2024-01-04T23:00:00Z') }),
      ];

      const result = applyTierMasking(announcements, 'free', currentTime);

      expect(result).toHaveLength(0);
    });

    it('handles empty input array', () => {
      const result = applyTierMasking([], 'free', currentTime);
      expect(result).toHaveLength(0);
    });
  });
});
