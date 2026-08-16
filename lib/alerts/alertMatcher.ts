/**
 * Alert Matching Engine & Notification Triggers.
 * Matches newly scraped construction ads against active user alerts (salary threshold, trade category, keywords).
 */

import { ScrapedAd, JobCategory } from '@/lib/scraper/types';

export interface UserAlertPreference {
  id: string;
  userId: string;
  category?: JobCategory;
  minMonthlySalary?: number;
  minHourlySalary?: number;
  keywords?: string[];
  district?: string;
  channel: 'email' | 'telegram' | 'push';
  contact: string; // email address or phone or telegram chat ID
  isActive: boolean;
}

export interface AlertMatchResult {
  alertId: string;
  userId: string;
  matchedAd: ScrapedAd;
  matchReason: string;
  channel: 'email' | 'telegram' | 'push';
  contact: string;
}

/**
 * Evaluates a list of new ads against user alert rules.
 */
export function matchAdsAgainstAlerts(
  newAds: ScrapedAd[],
  activeAlerts: UserAlertPreference[]
): AlertMatchResult[] {
  const matches: AlertMatchResult[] = [];

  for (const alert of activeAlerts) {
    if (!alert.isActive) continue;

    for (const ad of newAds) {
      // 1. Category check
      if (alert.category && ad.category !== alert.category) continue;

      // 2. Salary threshold check
      if (alert.minMonthlySalary || alert.minHourlySalary) {
        const sr = ad.salary_range;
        if (!sr) continue; // No salary info to match threshold

        if (alert.minMonthlySalary && sr.type === 'monthly') {
          const maxVal = sr.max || sr.min || 0;
          if (maxVal < alert.minMonthlySalary) continue;
        }

        if (alert.minHourlySalary && sr.type === 'hourly') {
          const maxVal = sr.max || sr.min || 0;
          if (maxVal < alert.minHourlySalary) continue;
        }
      }

      // 3. District check
      if (alert.district) {
        const loc = ad.location_text.toLowerCase();
        if (!loc.includes(alert.district.toLowerCase())) continue;
      }

      // 4. Keywords check
      if (alert.keywords && alert.keywords.length > 0) {
        const fullText = `${ad.title} ${ad.description}`.toLowerCase();
        const hasKeyword = alert.keywords.some((kw) => fullText.includes(kw.toLowerCase()));
        if (!hasKeyword) continue;
      }

      matches.push({
        alertId: alert.id,
        userId: alert.userId,
        matchedAd: ad,
        matchReason: `Dopasowano ogłoszenie: ${ad.title} (${ad.price || 'Brak ceny'})`,
        channel: alert.channel,
        contact: alert.contact,
      });
    }
  }

  return matches;
}
