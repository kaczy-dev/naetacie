import { describe, it, expect } from 'vitest';
import { buildInstantAlert } from '@/lib/alerts/instantJobAlerts';
import type { ScrapedAd } from '@/lib/scraper/types';

describe('Instant Job Alert Dispatcher', () => {
  const sampleAd: ScrapedAd = {
    id: 'ad-12345',
    title: 'Glazurnik do łazienki Szczecin Pogodno',
    description: 'Szukam pilnie glazurnika na 30m2 gresu. Płatne od ręki po zakończeniu.',
    source_url: 'https://www.olx.pl/d/oferta/glazurnik-ID123.html',
    source_portal: 'olx',
    category: 'wykończenia',
    location_text: 'Szczecin, Pogodno',
    latitude: 53.437,
    longitude: 14.521,
    price: '140 zł/m²',
    phone: '601 234 567',
    company: null,
    employer_type: 'direct_investor',
    employment_type: 'Zlecenie',
    scraped_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  };

  it('builds high-urgency instant alert for direct investor job with phone number', () => {
    // Worker location at Brama Portowa (Centrum)
    const alert = buildInstantAlert(sampleAd, { lat: 53.4285, lng: 14.5528 });

    expect(alert.title).toContain('Pilne zlecenie');
    expect(alert.isDirectInvestor).toBe(true);
    expect(alert.urgencyScore).toBeGreaterThanOrEqual(80);
    expect(alert.phoneCallUrl).toBe('tel:601234567');
    expect(alert.priceFormatted).toBe('140 zł/m²');
    expect(alert.distanceKm).toBeDefined();
    expect(alert.distanceKm).toBeGreaterThan(1);
    expect(alert.telegramMessageText).toContain('NOWE ZLECENIE BUDOWLANE');
    expect(alert.telegramMessageText).toContain('601 234 567');
  });

  it('handles ads without phone numbers gracefully', () => {
    const adNoPhone: ScrapedAd = {
      ...sampleAd,
      phone: null,
      employer_type: 'contractor',
    };

    const alert = buildInstantAlert(adNoPhone);
    expect(alert.phoneCallUrl).toBeNull();
    expect(alert.urgencyScore).toBeLessThan(80);
    expect(alert.telegramMessageText).toContain(adNoPhone.source_url);
  });
});
