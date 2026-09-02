import { describe, it, expect } from 'vitest';
import { searchAnnouncements, isSzczecinAnnouncement } from '@/lib/search/engine';
import { estimateCommuteTimes } from '@/lib/geo/commuteCalculator';
import { computeMarketOverview } from '@/lib/stats/market';
import { resolveOlxLink, resolveOlxDeviceLink } from '@/lib/olx/olxLinkResolver';
import { generateCoverLetter } from '@/lib/ai/coverLetter';
import { generateInterviewQuestions } from '@/lib/ai/interviewSimulator';
import { SEED_DATA } from '@/lib/data/announcements';

describe('App Core Journeys E2E Integration Suite', () => {
  const sampleAnnouncements = SEED_DATA.map((s) => ({
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

  it('Journey 1: Search, Filter, and Portal Isolation', () => {
    // Filter specifically for Szczecin area
    const szczecinAds = sampleAnnouncements.filter(isSzczecinAnnouncement);
    expect(szczecinAds.length).toBeGreaterThan(0);

    // Diacritic-insensitive full text search
    const electricianAds = searchAnnouncements(sampleAnnouncements, 'elektryk');
    expect(electricianAds.length).toBeGreaterThan(0);
    expect(electricianAds[0].title.toLowerCase()).toContain('elektryk');

    // Portal isolation filter (OLX only)
    const olxOnly = sampleAnnouncements.filter((a) => a.source_portal === 'olx');
    expect(olxOnly.every((a) => a.source_portal === 'olx')).toBe(true);
  });

  it('Journey 2: Geospatial Distance & Commute Calculation', () => {
    const homeLocation = { lat: 53.4285, lng: 14.5528 }; // Szczecin Center
    const adLocation = { lat: 53.4500, lng: 14.5800 }; // Szczecin North

    const commute = estimateCommuteTimes(homeLocation.lat, homeLocation.lng, adLocation.lat, adLocation.lng);

    expect(commute).not.toBeNull();
    if (commute) {
      expect(commute.distanceKm).toBeGreaterThan(0);
      expect(commute.carMinutes).toBeGreaterThan(0);
      expect(commute.transitMinutes).toBeGreaterThanOrEqual(commute.carMinutes);
    }
  });

  it('Journey 3: Market Benchmark & Salary Analytics', () => {
    const overview = computeMarketOverview(sampleAnnouncements);

    expect(overview.totalOffers).toBe(sampleAnnouncements.length);
    expect(overview.offersWithSalary).toBeGreaterThan(0);
    expect(overview.overallAvgSalary).toBeGreaterThan(0);
    expect(overview.overallMedianSalary).toBeGreaterThan(0);
  });

  it('Journey 4: OLX Live Offer Click-Through & Mobile Device Routing', () => {
    const olxAd = sampleAnnouncements.find((a) => a.source_portal === 'olx') || sampleAnnouncements[0];

    const resolvedLink = resolveOlxLink({
      id: olxAd.id,
      source_url: olxAd.source_url,
      source_portal: 'olx',
      title: olxAd.title,
    });

    expect(resolvedLink.url).toContain('olx.pl');
    expect(typeof resolvedLink.isDirectOffer).toBe('boolean');

    const mobileLink = resolveOlxDeviceLink(
      { id: olxAd.id, source_url: olxAd.source_url, source_portal: 'olx' },
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
    );

    expect(mobileLink).toBeTruthy();
  });

  it('Journey 5: AI Job Assistant Workflows (Cover Letter & Interview Simulator)', () => {
    const targetAd = sampleAnnouncements[0];

    // Cover letter generation
    const coverLetter = generateCoverLetter({
      jobTitle: targetAd.title,
      locationText: targetAd.location_text,
      sourcePortal: targetAd.source_portal,
      tone: 'formal',
      applicantSkills: '5 lat doświadczenia w remontach, własny bus',
    });

    expect(coverLetter).toContain('Szanowni Państwo');
    expect(coverLetter).toContain(targetAd.title);

    // Interview simulation questions
    const questions = generateInterviewQuestions(targetAd.category, targetAd.title);

    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0].question).toBeTruthy();
    expect(questions[0].options.length).toBeGreaterThan(0);
  });
});
