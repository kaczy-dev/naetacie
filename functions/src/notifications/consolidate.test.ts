import { describe, it, expect } from 'vitest';
import { consolidateForEmail } from './consolidate';
import { Announcement } from '../../../lib/types/announcement';

function makeAnnouncement(index: number): Announcement {
  return {
    deduplication_key: `key-${index}`,
    title: `Announcement ${index}`,
    description: `Description ${index}`,
    source_url: `https://example.com/${index}`,
    source_portal: 'olx',
    category: 'construction',
    location_text: `Location ${index}`,
    latitude: 53.4 + index * 0.01,
    longitude: 14.5 + index * 0.01,
    price: index * 100,
    contact_info: null,
    scraped_at: new Date(),
    published_at: null,
  };
}

describe('consolidateForEmail', () => {
  it('returns empty array when given empty input', () => {
    expect(consolidateForEmail([])).toEqual([]);
  });

  it('returns all items when input has fewer than 10', () => {
    const announcements = Array.from({ length: 5 }, (_, i) => makeAnnouncement(i));
    const result = consolidateForEmail(announcements);
    expect(result).toHaveLength(5);
    expect(result).toEqual(announcements);
  });

  it('returns exactly 10 items when input has exactly 10', () => {
    const announcements = Array.from({ length: 10 }, (_, i) => makeAnnouncement(i));
    const result = consolidateForEmail(announcements);
    expect(result).toHaveLength(10);
    expect(result).toEqual(announcements);
  });

  it('returns first 10 items when input has more than 10', () => {
    const announcements = Array.from({ length: 15 }, (_, i) => makeAnnouncement(i));
    const result = consolidateForEmail(announcements);
    expect(result).toHaveLength(10);
    expect(result).toEqual(announcements.slice(0, 10));
  });

  it('preserves original order of items', () => {
    const announcements = Array.from({ length: 12 }, (_, i) => makeAnnouncement(i));
    const result = consolidateForEmail(announcements);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].deduplication_key).toBe(`key-${i}`);
    }
  });

  it('does not mutate the original array', () => {
    const announcements = Array.from({ length: 15 }, (_, i) => makeAnnouncement(i));
    const originalLength = announcements.length;
    consolidateForEmail(announcements);
    expect(announcements).toHaveLength(originalLength);
  });
});
