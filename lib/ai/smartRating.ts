/**
 * Smart Offer Rating Engine (1-100 Score).
 * Evaluates job announcement attractiveness based on market salary,
 * perks (housing, car, tools), phone availability, and geocoding precision.
 */

import { ScrapedAd } from '@/lib/scraper/types';
import { evaluateMarketSalary } from '@/lib/stats/marketBenchmarks';

export interface OfferRatingDetails {
  score: number; // 1-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  breakdown: {
    salaryScore: number; // max 35
    perksScore: number; // max 25
    contactScore: number; // max 20
    locationScore: number; // max 20
  };
  highlights: string[];
}

export function calculateOfferScore(ad: ScrapedAd): OfferRatingDetails {
  const highlights: string[] = [];
  let salaryScore = 15; // default fallback if no salary specified
  let perksScore = 5;
  let contactScore = 5;
  let locationScore = 10;

  // 1. Salary Score (max 35)
  const priceString = ad.price || ad.salary_range?.raw || null;
  if (priceString) {
    const marketEval = evaluateMarketSalary(ad.title, priceString);
    if (marketEval.badgeColor === 'emerald') {
      salaryScore = 35;
      highlights.push('Płaca powyżej średniej rynkowej w Szczecinie 💰');
    } else if (marketEval.badgeColor === 'blue') {
      salaryScore = 28;
      highlights.push('Zgodna ze stawką rynkową');
    } else {
      salaryScore = 20;
    }
  }

  // 2. Perks & Equipment Score (max 25)
  const fullText = `${ad.title} ${ad.description}`.toLowerCase();

  if (/zakwaterowa|mieszkanie|kwatera|hotel/i.test(fullText)) {
    perksScore += 10;
    highlights.push('Zapewnione zakwaterowanie 🏠');
  }
  if (/samochód|auto służbowe|dojazd/i.test(fullText)) {
    perksScore += 8;
    highlights.push('Auto służbowe / Dojazd 🚗');
  }
  if (/narzędzia|sprzęt|elektronarzędzia/i.test(fullText)) {
    perksScore += 7;
    highlights.push('Komplet narzędzi w cenie 🧰');
  }

  perksScore = Math.min(25, perksScore);

  // 3. Contact & Phone Score (max 20)
  if (ad.phone) {
    contactScore += 15;
    highlights.push('Bezpośredni kontakt telefoniczny 📞');
  }
  if (ad.company) {
    contactScore += 5;
  }
  contactScore = Math.min(20, contactScore);

  // 4. Location Precision Score (max 20)
  if (ad.latitude != null && ad.longitude != null) {
    locationScore = 20;
    highlights.push('Dokładna lokalizacja budowy na mapie 📍');
  }

  const totalScore = Math.min(100, Math.max(1, salaryScore + perksScore + contactScore + locationScore));

  let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'C';
  if (totalScore >= 85) grade = 'S';
  else if (totalScore >= 70) grade = 'A';
  else if (totalScore >= 55) grade = 'B';
  else if (totalScore >= 40) grade = 'C';
  else grade = 'D';

  return {
    score: totalScore,
    grade,
    breakdown: {
      salaryScore,
      perksScore,
      contactScore,
      locationScore,
    },
    highlights,
  };
}
