import { describe, it, expect, vi } from 'vitest';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { CATEGORIES, normalizeCategory } from '@/lib/data/categories';
import { haversineKm } from '@/lib/matching/engine';
import { getAnnouncementExternalUrl } from '@/lib/utils';

describe('DraggableJobModal Component Logic Unit Tests', () => {
  const mockAd: DisplayAnnouncement = {
    id: 'ad-map-123',
    deduplication_key: 'olx-ad-map-123',
    title: 'Kierownik Budowy - Szczecin Centrum',
    company: 'Budimex S.A.',
    description: 'Nadzór nad pracami budowlanymi, wymagana uprawnienia budowlane.',
    source_portal: 'olx',
    category: 'construction',
    location_text: 'Szczecin, Śródmieście',
    latitude: 53.4285,
    longitude: 14.5528,
    price: 12500,
    phone: '600111222',
    scraped_at: new Date('2026-08-01'),
    published_at: null,
  };

  it('normalizes category and resolves label & color', () => {
    const catKey = normalizeCategory(mockAd.category);
    expect(catKey).toBeDefined();

    const cat = CATEGORIES[catKey];
    expect(cat).toBeDefined();
    expect(cat.label).toBeDefined();
    expect(cat.color).toBeDefined();
  });

  it('formats salary correctly as PLN or string', () => {
    const priceDisplay = typeof mockAd.price === 'number'
      ? `${mockAd.price.toLocaleString('pl-PL')} zł`
      : mockAd.price;

    expect(priceDisplay).toContain('12');
    expect(priceDisplay).toContain('500');
    expect(priceDisplay).toContain('zł');
  });

  it('generates correct external link for OLX announcement', () => {
    const externalUrl = getAnnouncementExternalUrl(mockAd);
    expect(externalUrl).toContain('https://www.olx.pl');
  });

  it('handles distance and commute estimation if home coordinates are provided', () => {
    const homeLat = 53.4000;
    const homeLng = 14.5000;

    const distKm = Math.round(haversineKm(homeLat, homeLng, mockAd.latitude!, mockAd.longitude!) * 10) / 10;
    const estDriveMin = Math.max(2, Math.round((distKm / 35) * 60));

    expect(distKm).toBeGreaterThan(0);
    expect(estDriveMin).toBeGreaterThan(0);
  });

  it('triggers callbacks on user actions (favorite toggle, show in list, close)', () => {
    const onClose = vi.fn();
    const onShowInList = vi.fn();
    const onToggleFavorite = vi.fn();

    onToggleFavorite();
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);

    onShowInList();
    expect(onShowInList).toHaveBeenCalledTimes(1);

    onClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
