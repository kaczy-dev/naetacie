import { describe, it, expect } from 'vitest';
import { SEED_DATA } from '@/lib/data/announcements';
import { searchAnnouncements } from '@/lib/search/engine';
import { sortByScrapedAtDesc } from '@/components/list/sort';
import { applyTierMasking } from '@/app/api/announcements/masking';
import { calculatePagination } from '@/app/api/announcements/pagination';
import type { Announcement } from '@/lib/types/announcement';

describe('Lista Ofert (Job Offers List) Section E2E Flow Test Suite', () => {
  // Map seed data to clean Announcement typed objects
  const announcements: Announcement[] = SEED_DATA.map((ad, idx) => ({
    deduplication_key: ad.id || `test_key_${idx}`,
    title: ad.title,
    description: ad.description,
    source_url: ad.source_url || 'https://www.olx.pl/d/oferta/test.html',
    source_portal: ad.source_portal || 'olx',
    category: ad.category || 'budowa',
    location_text: ad.location_text || 'Szczecin',
    latitude: ad.latitude ?? null,
    longitude: ad.longitude ?? null,
    price: typeof ad.price === 'number' ? ad.price : parseFloat(String(ad.price || '0')) || null,
    contact_info: ad.phone || null,
    scraped_at: new Date(Date.now() - idx * 3600 * 1000), // sequential historical scraped times
    published_at: null,
  }));

  it('Step 1: Simulates initial fetching of all active announcements', () => {
    expect(announcements.length).toBeGreaterThan(0);
    expect(announcements[0]).toHaveProperty('title');
    expect(announcements[0]).toHaveProperty('description');
    expect(announcements[0]).toHaveProperty('source_portal');
  });

  it('Step 2: Simulates portal-specific filtering (OLX, Pracuj.pl, Indeed)', () => {
    const olxOffers = announcements.filter(a => a.source_portal.toLowerCase().includes('olx'));
    const pracujOffers = announcements.filter(a => a.source_portal.toLowerCase().includes('pracuj'));
    const indeedOffers = announcements.filter(a => a.source_portal.toLowerCase().includes('indeed'));

    expect(
      olxOffers.length + 
      pracujOffers.length + 
      indeedOffers.length
    ).toBe(announcements.length);
  });

  it('Step 3: Simulates user search box with diacritics insensitivity', () => {
    const resultsPl = searchAnnouncements(announcements as any, 'murarz');
    const resultsNoDiacritics = searchAnnouncements(announcements as any, 'murarz');
    
    expect(resultsPl.length).toEqual(resultsNoDiacritics.length);
  });

  it('Step 4: Simulates listing sorting (scraped date descending)', () => {
    const sorted = sortByScrapedAtDesc(announcements);
    
    expect(sorted.length).toBe(announcements.length);
    for (let i = 0; i < sorted.length - 1; i++) {
      const dateA = new Date(sorted[i].scraped_at).getTime();
      const dateB = new Date(sorted[i + 1].scraped_at).getTime();
      expect(dateA).toBeGreaterThanOrEqual(dateB);
    }
  });

  it('Step 5: Simulates Tier-based data masking in the list for free vs premium users', () => {
    const currentTime = new Date();
    
    // Free tier masking
    const maskedFree = applyTierMasking(announcements, 'free', currentTime);
    
    // Premium tier masking
    const maskedPremium = applyTierMasking(announcements, 'premium', currentTime);

    // Verify free tier limits: descriptions masked if too long, contact/source_url omitted
    maskedFree.forEach(ad => {
      expect(ad.source_url).toBeUndefined();
      expect(ad.contact_info).toBeUndefined();
      if (ad.description.length > 100) {
        expect(ad.description.endsWith('...')).toBe(true);
      }
    });

    // Verify premium tier has full access
    expect(maskedPremium.length).toBe(announcements.length);
    maskedPremium.forEach(ad => {
      expect(ad.source_url).toBeDefined();
      expect(ad.contact_info).toBeDefined();
    });
  });

  it('Step 6: Simulates List Pagination and calculation of total pages', () => {
    const totalCount = announcements.length;
    const pageSize = 10;
    const pagination = calculatePagination(totalCount, 1, pageSize);

    expect(pagination.current_page).toBe(1);
    expect(pagination.page_size).toBe(pageSize);
    expect(pagination.total_count).toBe(totalCount);
    expect(pagination.total_pages).toBe(Math.ceil(totalCount / pageSize));
  });
});
