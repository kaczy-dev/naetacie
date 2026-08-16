/**
 * Shared Scraper Network Utilities & Anti-Bot Stealth Layer.
 * Single source of truth for user-agent rotation, stealth headers,
 * HTML sanitization, category inference, and resilient fetch.
 */

import { Agent } from 'undici';

// ─── Stealth Dispatcher ───
export const stealthDispatcher = new Agent({
  connect: { rejectUnauthorized: process.env.NODE_ENV === 'production', timeout: 8000 },
  connections: 20,
  pipelining: 1,
  keepAliveTimeout: 15_000,
});

// ─── User-Agent Rotation ───
const MODERN_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

export function getRandomUserAgent(): string {
  return MODERN_USER_AGENTS[Math.floor(Math.random() * MODERN_USER_AGENTS.length)];
}

// ─── Stealth Headers ───
export function getStealthHeaders(referer?: string): Record<string, string> {
  const ua = getRandomUserAgent();
  return {
    'User-Agent': ua,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="129", "Google Chrome";v="129"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
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

// ─── HTML Sanitization ───
/**
 * Strips HTML tags, decodes entities, and normalizes whitespace.
 * Handles <p>, <br>, &nbsp;, &amp;, &quot;, &#39; entities.
 */
export function cleanHtml(raw: string): string {
  return raw
    .replace(/<\/p>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Light-weight text cleaner: strips HTML tags and normalizes whitespace.
 */
export function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Category Inference ───
import type { JobCategory } from './types';

/**
 * Infers job category from title and description text using Polish keyword matching.
 */
export function inferCategory(title: string, desc: string): JobCategory {
  const t = `${title} ${desc}`.toLowerCase();
  if (/elektryk|hydraulik|instalac|klimatyz|gaz\b|sanitarn|wod-kan|fotowolta|pomp[ay] ciepła|c\.?o\.?\b/.test(t)) {
    return 'instalacje';
  }
  if (/malarz|glazur|płytk|gładz|regips|tynkar|posadzk|wykończ|tapet|panele|podłog/.test(t)) {
    return 'wykończenia';
  }
  return 'budowa';
}

// ─── Resilient Fetch ───
/**
 * Fetch with stealth headers and automatic retry on 5xx errors.
 */
export async function fetchWithStealthRetry(
  url: string,
  options: { referer?: string; timeoutMs?: number; retries?: number; headers?: Record<string, string> } = {}
): Promise<Response> {
  const { referer, timeoutMs = 6000, retries = 2, headers: extraHeaders } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...getStealthHeaders(referer), ...extraHeaders },
        signal: AbortSignal.timeout(timeoutMs),
        dispatcher: stealthDispatcher,
      } as RequestInit & { dispatcher: Agent });

      if (res.status >= 500) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`Stealth fetch failed for ${url}`);
}
