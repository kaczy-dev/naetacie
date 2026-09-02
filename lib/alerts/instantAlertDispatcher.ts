/**
 * Instant Real-Time Alert Dispatcher & Telegram Webhook Mesh.
 * Dispatches rich job alerts to Telegram, WhatsApp, and SMS webhooks in < 60 seconds.
 */

import { generateApplicationMessageDraft } from '@/lib/contact/draftGenerator';

export interface TelegramAlertPayload {
  adId: string;
  title: string;
  price?: number | string | null;
  locationText?: string | null;
  sourcePortal?: string | null;
  phone?: string | null;
  directUrl: string;
  category?: string | null;
  requirements?: string[];
  matchScore?: number;
}

export interface UserAlertSubscription {
  userId: string;
  telegramChatId?: string;
  keywords?: string[];
  categories?: string[];
  minPrice?: number;
  maxDistanceKm?: number;
  portalFilters?: string[];
}

/**
 * Compiles a high-conversion, formatted Markdown message for Telegram Bot.
 */
export function formatTelegramJobAlert(ad: TelegramAlertPayload): {
  text: string;
  inlineKeyboard: Array<Array<{ text: string; url: string }>>;
} {
  const portalName = (ad.sourcePortal || 'OLX').toUpperCase();
  const priceText = ad.price ? `💰 *Stawka:* ${ad.price} zł` : '💰 *Stawka:* Do uzgodnienia';
  const locationText = ad.locationText ? `📍 *Lokalizacja:* ${ad.locationText}` : '📍 *Lokalizacja:* Szczecin';
  const reqsText = ad.requirements && ad.requirements.length > 0
    ? `\n⚡ *Wymagania:* ${ad.requirements.join(', ')}`
    : '';

  const draft = ad.phone ? generateApplicationMessageDraft(ad.phone, ad.title, ad.sourcePortal || undefined) : null;

  const text = [
    `🔥 *NOWE ZLECENIE / PRACA* (${portalName})`,
    `📌 *${escapeTelegramMarkdown(ad.title)}*`,
    ``,
    priceText,
    locationText,
    reqsText,
    ad.phone ? `📞 *Telefon:* \`${ad.phone}\`` : `💬 *Kontakt:* przez portal`,
    ``,
    `_Wykryto przez NaEtacie.pl w Szczecinie_`,
  ].filter(Boolean).join('\n');

  const keyboardRows: Array<Array<{ text: string; url: string }>> = [];

  // Primary action: Direct portal link
  keyboardRows.push([
    { text: `🔗 Zobacz na ${portalName}`, url: ad.directUrl },
  ]);

  // Secondary actions if phone is available
  if (draft) {
    keyboardRows.push([
      { text: '💬 Aplikuj SMS', url: draft.smsUrl },
      { text: '📲 WhatsApp', url: draft.whatsAppUrl },
    ]);
  }

  return {
    text,
    inlineKeyboard: keyboardRows,
  };
}

/**
 * Escapes reserved Markdown characters in Telegram text.
 */
function escapeTelegramMarkdown(str: string): string {
  return str.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

/**
 * Evaluates whether an announcement matches a user's instant alert subscription filter.
 */
export function doesAdMatchSubscription(
  ad: TelegramAlertPayload,
  sub: UserAlertSubscription
): boolean {
  // Portal filter
  if (sub.portalFilters && sub.portalFilters.length > 0 && ad.sourcePortal) {
    if (!sub.portalFilters.includes(ad.sourcePortal.toLowerCase())) {
      return false;
    }
  }

  // Minimum salary filter
  if (sub.minPrice !== undefined && sub.minPrice > 0) {
    if (typeof ad.price === 'number' && ad.price < sub.minPrice) {
      return false;
    }
  }

  // Category filter
  if (sub.categories && sub.categories.length > 0 && ad.category) {
    const normCategory = ad.category.toLowerCase();
    const matchesCat = sub.categories.some((c) => normCategory.includes(c.toLowerCase()));
    if (!matchesCat) return false;
  }

  // Keyword filter
  if (sub.keywords && sub.keywords.length > 0) {
    const titleLower = ad.title.toLowerCase();
    const hasKeyword = sub.keywords.some((kw) => titleLower.includes(kw.toLowerCase()));
    if (!hasKeyword) return false;
  }

  return true;
}

/**
 * Dispatches instant Telegram message using Telegram Bot API.
 */
export async function dispatchTelegramAlert(
  botToken: string,
  chatId: string,
  payload: TelegramAlertPayload,
  fetchFn = fetch
): Promise<boolean> {
  if (!botToken || !chatId) return false;

  const { text, inlineKeyboard } = formatTelegramJobAlert(payload);

  try {
    const res = await fetchFn(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
