/**
 * Instant Job Alert & Fast-Response Dispatcher ("Kto pierwszy, ten lepszy").
 * In the construction trade, the first tradesman to call an investor gets the job.
 * Dispatches real-time alerts formatted for WebPush, Telegram Bot, and in-app toasts.
 */

import { ScrapedAd } from '@/lib/scraper/types';
import { haversineKm } from '@/lib/matching/engine';

export interface InstantAlertNotification {
  id: string;
  title: string;
  body: string;
  sourcePortal: string;
  category: string;
  priceFormatted: string;
  phoneCallUrl: string | null;
  directOfferUrl: string;
  distanceKm?: number;
  urgencyScore: number; // 0-100
  isDirectInvestor: boolean;
  telegramMessageText: string;
}

export function buildInstantAlert(
  ad: ScrapedAd,
  workerLocation?: { lat: number; lng: number }
): InstantAlertNotification {
  const isDirectInvestor = ad.employer_type === 'direct_investor';

  let distanceKm: number | undefined;
  if (workerLocation && ad.latitude != null && ad.longitude != null) {
    distanceKm = Math.round(haversineKm(workerLocation.lat, workerLocation.lng, ad.latitude, ad.longitude) * 10) / 10;
  }

  // Calculate urgency score: phone number present + direct investor + high price = 90-100
  let urgencyScore = 50;
  if (ad.phone) urgencyScore += 30;
  if (isDirectInvestor) urgencyScore += 15;
  if (ad.price) urgencyScore += 5;

  const phoneCallUrl = ad.phone ? `tel:${ad.phone.replace(/[^\d+]/g, '')}` : null;
  const priceFormatted = ad.price || 'Stawka do uzgodnienia';

  const body = `${ad.title} (${priceFormatted})${distanceKm !== undefined ? ` • ${distanceKm} km od Ciebie` : ''}`;

  // Formatted markdown for Telegram notification bots
  const telegramMessageText = [
    `🚨 *NOWE ZLECENIE BUDOWLANE:* ${ad.title}`,
    `💰 *Stawka:* ${priceFormatted}`,
    `📍 *Lokalizacja:* ${ad.location_text}${distanceKm !== undefined ? ` (${distanceKm} km)` : ''}`,
    `👤 *Zleceniodawca:* ${isDirectInvestor ? 'Inwestor Bezpośredni (Właściciel)' : ad.company || 'Firma'}`,
    ad.phone ? `📞 *Telefon:* \`${ad.phone}\`` : `🔗 *Link:* ${ad.source_url}`,
    `\n⚡ _Kto pierwszy, ten lepszy!_`,
  ].join('\n');

  return {
    id: `alert_${ad.id}`,
    title: isDirectInvestor ? '🔥 Pilne zlecenie od inwestora!' : '🔨 Nowa oferta pracy',
    body,
    sourcePortal: ad.source_portal,
    category: ad.category,
    priceFormatted,
    phoneCallUrl,
    directOfferUrl: ad.source_url,
    distanceKm,
    urgencyScore,
    isDirectInvestor,
    telegramMessageText,
  };
}
