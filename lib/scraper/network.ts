/**
 * Resilient Anti-Bot Headers & Stealth Network Dispatcher.
 * Provides user-agent rotation, modern browser Sec-CH-UA headers,
 * and fetch retry mechanisms.
 */

import { Agent } from 'undici';

export const stealthDispatcher = new Agent({
  connect: { rejectUnauthorized: false, timeout: 8000 },
  connections: 20,
  pipelining: 1,
  keepAliveTimeout: 15_000,
});

const MODERN_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
];

export function getStealthHeaders(referer?: string): Record<string, string> {
  const ua = MODERN_USER_AGENTS[Math.floor(Math.random() * MODERN_USER_AGENTS.length)];
  return {
    'User-Agent': ua,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="127", "Google Chrome";v="127"',
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

export async function fetchWithStealthRetry(
  url: string,
  options: { referer?: string; timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
  const { referer, timeoutMs = 6000, retries = 2 } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: getStealthHeaders(referer),
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
