import { describe, it, expect } from 'vitest';
import { normalizeText, tokenize, searchScore, searchAnnouncements } from './engine';
import type { DisplayAnnouncement } from '@/lib/types/display';

function makeAd(overrides: Partial<DisplayAnnouncement> = {}): DisplayAnnouncement {
  return {
    id: 'x1',
    title: 'Murarz na budowę',
    description: 'Zatrudnię murarza z doświadczeniem',
    source_url: '',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Szczecin, Pogodno',
    latitude: 53.4,
    longitude: 14.5,
    price: 6500,
    phone: null,
    scraped_at: new Date(),
    published_at: null,
    company: 'BudMax',
    employment_type: 'Umowa o pracę',
    ...overrides,
  };
}

describe('normalizeText', () => {
  it('strips Polish diacritics', () => {
    expect(normalizeText('Ł ą ę ó ż ź ć ń ś')).toBe('l a e o z z c n s');
  });
  it('lowercases and removes punctuation', () => {
    expect(normalizeText('Elektryk, SEP!')).toBe('elektryk sep');
  });
});

describe('tokenize', () => {
  it('splits into terms', () => {
    expect(tokenize('murarz szczecin')).toEqual(['murarz', 'szczecin']);
  });
  it('returns empty for blank query', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('searchScore', () => {
  it('returns 1 (neutral) for empty terms', () => {
    expect(searchScore(makeAd(), [])).toBe(1);
  });

  it('returns 0 when any term is missing (AND semantics)', () => {
    expect(searchScore(makeAd(), ['murarz', 'kosmonauta'])).toBe(0);
  });

  it('scores title matches higher than description matches', () => {
    const titleHit = searchScore(makeAd({ title: 'Elektryk', description: 'x' }), ['elektryk']);
    const descHit = searchScore(makeAd({ title: 'Praca', description: 'szukam elektryk' }), ['elektryk']);
    expect(titleHit).toBeGreaterThan(descHit);
  });

  it('matches diacritic-insensitively', () => {
    // query "budowe" should match title "budowę"
    expect(searchScore(makeAd({ title: 'Murarz na budowę' }), ['budowe'])).toBeGreaterThan(0);
  });
});

describe('searchAnnouncements', () => {
  const ads = [
    makeAd({ id: 'a', title: 'Elektryk instalacje', description: 'x' }),
    makeAd({ id: 'b', title: 'Murarz', description: 'pomoc elektryka mile widziana' }),
    makeAd({ id: 'c', title: 'Hydraulik', description: 'wod-kan' }),
  ];

  it('returns all ads for empty query', () => {
    expect(searchAnnouncements(ads, '')).toHaveLength(3);
  });

  it('filters out non-matching ads', () => {
    const result = searchAnnouncements(ads, 'elektryk');
    expect(result.map((a) => a.id)).toEqual(['a', 'b']); // a ranks first (title)
  });

  it('ranks title match above description match', () => {
    const result = searchAnnouncements(ads, 'elektryk');
    expect(result[0].id).toBe('a');
  });
});
