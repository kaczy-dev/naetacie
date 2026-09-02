/**
 * Shared Scraper Network Utilities & Anti-Bot Stealth Layer.
 * Single source of truth for user-agent rotation, stealth headers,
 * HTML entity decoding & sanitization, category inference, and resilient fetch.
 */

import { Agent } from 'undici';

// ─── Stealth Dispatcher ───
export const stealthDispatcher = new Agent({
  connect: { rejectUnauthorized: process.env.NODE_ENV === 'production', timeout: 10_000 },
  connections: 30,
  pipelining: 1,
  keepAliveTimeout: 20_000,
});

// ─── User-Agent & Client-Hints Rotation ───
export interface UserAgentProfile {
  ua: string;
  secChUa: string;
  platform: string;
  mobile: string;
}

const MODERN_PROFILES: UserAgentProfile[] = [
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    secChUa: '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
    platform: '"Windows"',
    mobile: '?0',
  },
  {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    secChUa: '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
    platform: '"macOS"',
    mobile: '?0',
  },
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
    secChUa: '"Firefox";v="134", "Gecko";v="20100101"',
    platform: '"Windows"',
    mobile: '?0',
  },
  {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
    secChUa: '"Safari";v="18", "AppleWebKit";v="605"',
    platform: '"macOS"',
    mobile: '?0',
  },
  {
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    secChUa: '"Chromium";v="132", "Google Chrome";v="132"',
    platform: '"Linux"',
    mobile: '?0',
  },
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
    secChUa: '"Microsoft Edge";v="132", "Chromium";v="132"',
    platform: '"Windows"',
    mobile: '?0',
  },
];

export function getRandomProfile(): UserAgentProfile {
  return MODERN_PROFILES[Math.floor(Math.random() * MODERN_PROFILES.length)];
}

export function getRandomUserAgent(): string {
  return getRandomProfile().ua;
}

// ─── Stealth Headers ───
export function getStealthHeaders(referer?: string): Record<string, string> {
  const profile = getRandomProfile();
  return {
    'User-Agent': profile.ua,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Sec-Ch-Ua': profile.secChUa,
    'Sec-Ch-Ua-Mobile': profile.mobile,
    'Sec-Ch-Ua-Platform': profile.platform,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    ...(referer ? { Referer: referer } : {}),
  };
}

// ─── ID Hashing ───
/**
 * Generates a deterministic hash-based ID from a string input.
 * @param input - Source string (usually URL or title)
 * @param prefix - Portal prefix (e.g. 'olx', 'pracuj', 'indeed')
 */
export function hashId(input: string, prefix: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h &= h;
  }
  return `${prefix}_${Math.abs(h).toString(36)}`;
}

// ─── HTML Entity Decoding & Sanitization ───
const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&oacute;': 'ó',
  '&Oacute;': 'Ó',
  '&plusmn;': '±',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&bull;': '•',
  '&euro;': '€',
  '&zwnj;': '',
  '&zwj;': '',
  '&trade;': '™',
  '&copy;': '©',
  '&reg;': '®',
  '&frac12;': '½',
  '&frac14;': '¼',
  '&frac34;': '¾',
  '&deg;': '°',
  '&sup2;': '²',
  '&sup3;': '³',
};

/**
 * Robust HTML entity decoder supporting named entities, decimal, and hex codepoints.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  let decoded = text;

  // Named entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replaceAll(entity, replacement);
  }

  // Decimal entities: &#243; -> ó
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return '';
    }
  });

  // Hex entities: &#x105; -> ą
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  return decoded;
}

/**
 * Strips HTML tags, decodes all entities, and normalizes whitespace.
 */
export function cleanHtml(raw: string): string {
  if (!raw) return '';
  return decodeHtmlEntities(
    raw
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<li[^>]*>/gi, ' • ')
      .replace(/<\/li>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\.css-[a-zA-Z0-9_-]+\{[^}]*\}/gi, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Light-weight text cleaner: strips HTML tags, style/script blocks, decodes entities, and normalizes whitespace.
 */
export function cleanText(raw: string): string {
  if (!raw) return '';
  return decodeHtmlEntities(
    raw
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\.css-[a-zA-Z0-9_-]+\{[^}]*\}/gi, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Category Inference ───
import type { JobCategory } from './types';

/**
 * Infers job category from title and description text using comprehensive Polish keyword matching.
 */
export function inferCategory(title: string, desc: string): JobCategory {
  const t = `${title} ${desc}`.toLowerCase();

  // Instalacje
  if (
    /elektryk|elektro|hydraulik|instalac|klimatyz|wentylac|gaz\b|sanitarn|wod-kan|wod\.-kan\.|fotowolta|pomp[ay] ciepła|c\.?o\.?\b|rekuper|chłodnictw|teletechnik|automatyk|alarm|monitoring|sieci\s+zewn/i.test(
      t
    )
  ) {
    return 'instalacje';
  }

  // Wykończenia
  if (
    /malarz|glazur|płytk|kafelk|gładz|szpachl|regips|płyty\s+g-?k|tynkar|posadzk|wykończ|tapet|panele|podłog|parkiet|stolarz|montaż\s+drzwi|montaż\s+okien|sufity\s+podwieszan|zabudow/i.test(
      t
    )
  ) {
    return 'wykończenia';
  }

  // Budowa (default / heavy construction)
  return 'budowa';
}

// ─── Resilient Fetch with Exponential Backoff & Jitter ───
/**
 * Fetch with stealth headers, adaptive jittered retry, and HTTP 429 / 5xx handling.
 */
export async function fetchWithStealthRetry(
  url: string,
  options: {
    referer?: string;
    timeoutMs?: number;
    retries?: number;
    headers?: Record<string, string>;
    delayMs?: number;
  } = {}
): Promise<Response> {
  const { referer, timeoutMs = 7000, retries = 3, headers: extraHeaders, delayMs = 300 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...getStealthHeaders(referer), ...extraHeaders },
        signal: AbortSignal.timeout(timeoutMs),
        dispatcher: stealthDispatcher,
      } as RequestInit & { dispatcher: Agent });

      // Handle 429 Too Many Requests
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('retry-after');
        const retrySec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : (attempt + 1) * 2;
        const wait = Math.min(retrySec * 1000, 5000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      // Retry on 5xx server errors
      if (res.status >= 500) {
        const jitter = Math.floor(Math.random() * 200);
        const backoff = delayMs * Math.pow(2, attempt) + jitter;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      return res;
    } catch (e) {
      lastError = e as Error;
      if (attempt === retries - 1) break;
      const jitter = Math.floor(Math.random() * 200);
      const backoff = delayMs * Math.pow(2, attempt) + jitter;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  throw lastError || new Error(`Stealth fetch failed for ${url}`);
}
