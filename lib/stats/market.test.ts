import { describe, it, expect } from 'vitest';
import { parseSalary, computeMarketOverview } from './market';
import type { DisplayAnnouncement } from '@/lib/types/display';

function ad(overrides: Partial<DisplayAnnouncement> = {}): DisplayAnnouncement {
  return {
    id: Math.random().toString(36),
    title: 'Murarz',
    description: '',
    source_url: '',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Szczecin, Centrum',
    latitude: 53.4,
    longitude: 14.5,
    price: 6000,
    phone: null,
    scraped_at: new Date(),
    published_at: null,
    company: null,
    employment_type: null,
    ...overrides,
  };
}

describe('parseSalary', () => {
  it('returns numbers directly', () => {
    expect(parseSalary(6500)).toBe(6500);
  });
  it('parses "6500 zł/mies."', () => {
    expect(parseSalary('6500 zł/mies.')).toBe(6500);
  });
  it('averages a monthly range', () => {
    expect(parseSalary('6000-8000 zł')).toBe(7000);
  });
  it('converts hourly to monthly (×168)', () => {
    // (35+37)/2 = 36 × 168 = 6048
    expect(parseSalary('35–37 zł/h')).toBe(6048);
  });
  it('rejects broken/out-of-range values', () => {
    expect(parseSalary('19999–1999999 zł/h')).toBeNull();
    expect(parseSalary('do uzgodnienia')).toBeNull();
    expect(parseSalary(null)).toBeNull();
  });
});

describe('computeMarketOverview', () => {
  it('handles empty input', () => {
    const o = computeMarketOverview([]);
    expect(o.totalOffers).toBe(0);
    expect(o.overallAvgSalary).toBeNull();
    expect(o.byCategory).toEqual([]);
  });

  it('computes counts and averages', () => {
    const o = computeMarketOverview([
      ad({ category: 'budowa', price: 6000 }),
      ad({ category: 'budowa', price: 8000 }),
      ad({ category: 'instalacje', price: 10000 }),
    ]);
    expect(o.totalOffers).toBe(3);
    expect(o.offersWithSalary).toBe(3);
    expect(o.overallAvgSalary).toBe(8000);
    const budowa = o.byCategory.find((c) => c.category === 'budowa')!;
    expect(budowa.count).toBe(2);
    expect(budowa.avgSalary).toBe(7000);
  });

  it('sorts categories by count desc', () => {
    const o = computeMarketOverview([
      ad({ category: 'budowa' }),
      ad({ category: 'budowa' }),
      ad({ category: 'instalacje' }),
    ]);
    expect(o.byCategory[0].category).toBe('budowa');
  });

  it('finds the top location', () => {
    const o = computeMarketOverview([
      ad({ location_text: 'Szczecin, Centrum' }),
      ad({ location_text: 'Szczecin, Pogodno' }),
      ad({ location_text: 'Police' }),
    ]);
    expect(o.topLocation).toBe('Szczecin');
  });
});
