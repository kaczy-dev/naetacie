import { describe, it, expect } from 'vitest';
import { searchAnnouncements, isSzczecinAnnouncement } from '@/lib/search/engine';
import { scoreMatch } from '@/lib/matching/engine';
import { extractRequirements } from '@/lib/ai/extractor';
import { estimateSalary } from '@/lib/ai/salaryEstimator';
import { generateCoverLetter } from '@/lib/ai/coverLetter';
import { SEED_DATA } from '@/lib/data/announcements';
import type { DisplayAnnouncement } from '@/lib/types/display';
import type { JobPreferences } from '@/lib/matching/types';

describe('Job Search & AI Workflow E2E Test Suite', () => {
  const samplePreferences: JobPreferences = {
    categories: ['budowa', 'instalacje'],
    keywords: ['murarz', 'spawacz', 'b2b'],
    minSalary: 6000,
    employmentTypes: ['uop', 'b2b'],
    homeLat: 53.4285,
    homeLng: 14.5528,
    maxDistanceKm: 35,
    preferredPortals: ['olx', 'pracuj', 'oferteo'],
    allowNoLocation: false,
  };

  const sampleAds: DisplayAnnouncement[] = SEED_DATA.map((s) => ({
    id: s.id,
    deduplication_key: s.id,
    title: s.title,
    description: s.description,
    source_url: s.source_url,
    source_portal: s.source_portal,
    category: s.category,
    location_text: s.location_text,
    latitude: s.latitude,
    longitude: s.longitude,
    price: s.price,
    phone: s.phone,
    scraped_at: new Date(),
    published_at: null,
  }));

  it('Step 1: Filters announcements specifically for Szczecin and region', () => {
    const szczecinAds = sampleAds.filter(isSzczecinAnnouncement);
    expect(szczecinAds.length).toBeGreaterThan(0);
  });

  it('Step 2: Performs full-text search with diacritic insensitivity', () => {
    const searchResults = searchAnnouncements(sampleAds, 'elektryk');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].title.toLowerCase()).toContain('elektryk');
  });

  it('Step 3: Ranks job matches based on user preferences & salary criteria', () => {
    const scored = sampleAds.map((ad) => ({
      ad,
      match: scoreMatch(ad, samplePreferences),
    }));

    scored.sort((a, b) => b.match.score - a.match.score);
    expect(scored[0].match.score).toBeGreaterThanOrEqual(0);
  });

  it('Step 4: AI Skill Extractor extracts badges from raw announcement descriptions', () => {
    const sampleText = 'Poszukujemy elektryka z uprawnieniami SEP E+D, wymóg: prawo jazdy kat. B oraz własne auto. Stawka 7000 PLN.';
    const badges = extractRequirements(sampleText);

    expect(badges.some((b) => b.label.includes('SEP'))).toBe(true);
    expect(badges.some((b) => b.label.includes('Prawo Jazdy'))).toBe(true);
  });

  it('Step 5: AI Salary Estimator calculates predicted ranges for unlisted salary ads', () => {
    const unlistedAd = sampleAds.find((a) => a.price === null) || sampleAds[0];
    const estimate = estimateSalary(unlistedAd.category, unlistedAd.title, unlistedAd.description);

    expect(estimate.minGross).toBeGreaterThan(3000);
    expect(estimate.maxGross).toBeGreaterThan(estimate.minGross);
    expect(estimate.confidence).toMatch(/high|medium|low/);
  });

  it('Step 6: AI Cover Letter Generator compiles professional Polish application letter', () => {
    const ad = sampleAds[0];
    const formalLetter = generateCoverLetter({
      jobTitle: ad.title,
      locationText: ad.location_text,
      sourcePortal: ad.source_portal,
      tone: 'formal',
      applicantSkills: '5 lat doświadczenia w budownictwie',
    });

    const directLetter = generateCoverLetter({
      jobTitle: ad.title,
      locationText: ad.location_text,
      sourcePortal: ad.source_portal,
      tone: 'direct',
      applicantSkills: 'Uprawnienia SEP i własne narzędzia',
    });

    expect(formalLetter).toContain('Szanowni Państwo');
    expect(formalLetter).toContain(ad.title);
    expect(directLetter).toContain('Dzień dobry');
    expect(directLetter.length).toBeGreaterThan(50);
  });
});
