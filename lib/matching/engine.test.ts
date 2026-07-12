import { describe, it, expect } from 'vitest';
import { scoreMatch, haversineKm, hasNoPreferences } from './engine';
import { DEFAULT_PREFERENCES, type JobPreferences } from './types';
import type { DisplayAnnouncement } from '@/lib/types/display';

function makeAd(overrides: Partial<DisplayAnnouncement> = {}): DisplayAnnouncement {
  return {
    id: 'x1',
    title: 'Murarz-tynkarz na budowę',
    description: 'Poszukujemy murarza z doświadczeniem, uprawnienia mile widziane',
    source_url: 'https://olx.pl/x',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Szczecin',
    latitude: 53.4285,
    longitude: 14.5528,
    price: 6500,
    phone: null,
    scraped_at: new Date(),
    published_at: null,
    company: 'BudMax',
    employment_type: 'Umowa o pracę',
    ...overrides,
  };
}

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(53.4, 14.5, 53.4, 14.5)).toBeCloseTo(0, 5);
  });

  it('computes a known distance (Szczecin → Police ≈ 14km)', () => {
    const d = haversineKm(53.4285, 14.5528, 53.5513, 14.5692);
    expect(d).toBeGreaterThan(12);
    expect(d).toBeLessThan(16);
  });
});

describe('hasNoPreferences', () => {
  it('is true for defaults', () => {
    expect(hasNoPreferences(DEFAULT_PREFERENCES)).toBe(true);
  });

  it('is false when any criterion is set', () => {
    expect(hasNoPreferences({ ...DEFAULT_PREFERENCES, keywords: ['spawacz'] })).toBe(false);
  });
});

describe('scoreMatch', () => {
  it('returns neutral 100 when no preferences set', () => {
    const r = scoreMatch(makeAd(), DEFAULT_PREFERENCES);
    expect(r.score).toBe(100);
    expect(r.reasons).toHaveLength(0);
  });

  it('scores 100 for a perfect keyword+category+salary match', () => {
    const prefs: JobPreferences = {
      ...DEFAULT_PREFERENCES,
      keywords: ['murarz'],
      categories: ['budowa'],
      minSalary: 6000,
    };
    const r = scoreMatch(makeAd(), prefs);
    expect(r.score).toBe(100);
  });

  it('penalizes wrong category', () => {
    const prefs: JobPreferences = { ...DEFAULT_PREFERENCES, categories: ['instalacje'] };
    const r = scoreMatch(makeAd({ category: 'budowa' }), prefs);
    expect(r.score).toBe(0);
  });

  it('gives more weight to title keyword than description keyword', () => {
    const prefs: JobPreferences = { ...DEFAULT_PREFERENCES, keywords: ['murarz'] };
    const titleMatch = scoreMatch(makeAd({ title: 'Murarz', description: 'x' }), prefs);
    const bodyMatch = scoreMatch(makeAd({ title: 'Praca', description: 'szukamy murarz' }), prefs);
    expect(titleMatch.score).toBeGreaterThan(bodyMatch.score);
  });

  it('computes distance when home location is set', () => {
    const prefs: JobPreferences = {
      ...DEFAULT_PREFERENCES,
      homeLat: 53.4285,
      homeLng: 14.5528,
      maxDistanceKm: 25,
    };
    const r = scoreMatch(makeAd(), prefs);
    expect(r.distanceKm).not.toBeNull();
    expect(r.distanceKm!).toBeLessThan(1);
  });

  it('scores salary below minimum as partial credit within 20%', () => {
    const prefs: JobPreferences = { ...DEFAULT_PREFERENCES, minSalary: 7000 };
    const r = scoreMatch(makeAd({ price: 6000 }), prefs); // ~86% of min
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
  });
});
