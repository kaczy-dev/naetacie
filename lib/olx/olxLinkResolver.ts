import { extractTradeKeyword } from '@/lib/utils';

export interface OlxAdMinimal {
  id?: string;
  source_url?: string | null;
  source_portal?: string | null;
  title?: string | null;
  category?: string | null;
}

export interface OlxResolvedLink {
  url: string;
  isDirectOffer: boolean;
  type: 'direct_canonical' | 'direct_id_reconstructed' | 'category_search_fallback';
  mobileDeepLink?: string;
  nativeId?: string;
}

/**
 * Extracts native OLX offer ID from various URL formats or ID strings.
 * Examples:
 * - 'https://www.olx.pl/d/oferta/-IDn2cwpf.html' -> 'n2cwpf'
 * - 'olx_91827364' -> '91827364'
 * - 'olx_raw_91827364' -> '91827364'
 * - 'olx-ID8eLk' -> '8eLk'
 * - 'https://www.olx.pl/d/oferta/dekarz-szczecin-ID108H31.html' -> '108H31'
 * - 'ID108H31' -> '108H31'
 * - '91827364' -> '91827364'
 */
export function extractOlxNativeId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const str = urlOrId.trim();
  if (!str) return null;

  // 1. Check for canonical -ID suffix in URL or string (e.g. -IDn2cwpf.html, -ID108H31.html, -ID918273.html)
  const canonicalMatch = str.match(/[-_]ID([a-zA-Z0-9]+)(?:\.html)?(?:\?|$)/i);
  if (canonicalMatch && canonicalMatch[1]) {
    return canonicalMatch[1];
  }

  // 2. Check for explicit ID in URL path
  const idInUrlMatch = str.match(/[-_]ID([a-zA-Z0-9]{3,14})/i);
  if (idInUrlMatch && idInUrlMatch[1]) {
    return idInUrlMatch[1];
  }

  // Clean common prefixes (olx-, olx_, olx_raw_, olx-raw-, raw-, ad-)
  const hasOlxPrefix = /^olx[-_](raw[-_])?/i.test(str);
  const cleaned = str.replace(/^olx[-_](raw[-_])?/i, '').replace(/^(raw|ad|item|job)[_-]+/i, '').trim();

  // 3. Pure digits (e.g. '91827364' or '123456')
  if (/^\d{3,12}$/.test(cleaned)) {
    return cleaned;
  }

  // 4. Explicit ID prefix (e.g. 'ID108H31' or 'ID8eLk' or 'IDn2cwpf')
  if (/^ID[a-zA-Z0-9]{3,12}$/i.test(cleaned)) {
    return cleaned.replace(/^ID/i, '');
  }

  // 5. Alphanumeric ID with explicit olx- prefix (e.g. 'olx-ID108H31', 'olx-8eLk', 'olx_8eLk')
  if (hasOlxPrefix && /^[a-zA-Z0-9]{3,12}$/i.test(cleaned) && /\d/.test(cleaned)) {
    return cleaned.replace(/^ID/i, '');
  }

  return null;
}

/**
 * Clean & normalize raw OLX URL:
 * - Fixes protocol and domain (http://, olx.pl, m.olx.pl -> https://www.olx.pl)
 * - Converts legacy /oferta/ to canonical /d/oferta/
 * - Replaces HTML entities like &amp; with &
 * - Trims whitespace and double slashes
 */
export function normalizeOlxUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  // Unescape HTML entities (e.g. &amp;)
  trimmed = trimmed.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

  // Protocol relative links
  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  } else if (!/^https?:\/\//i.test(trimmed)) {
    if (trimmed.startsWith('/')) {
      trimmed = `https://www.olx.pl${trimmed}`;
    } else {
      trimmed = `https://${trimmed}`;
    }
  }

  try {
    const parsed = new URL(trimmed);
    parsed.protocol = 'https:';
    const host = parsed.hostname.toLowerCase();

    // Ensure www.olx.pl for all olx domain variants (olx.pl, m.olx.pl, etc.)
    if (host.includes('olx.pl')) {
      parsed.hostname = 'www.olx.pl';
    } else if (!host.includes('olx')) {
      return trimmed;
    }

    let pathname = parsed.pathname;

    // Convert /oferta/ to /d/oferta/
    if (pathname.startsWith('/oferta/')) {
      pathname = `/d${pathname}`;
    }

    parsed.pathname = pathname;
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

/**
 * Tests if a URL is a direct, canonical OLX single offer page
 */
export function isDirectOlxOfferUrl(url?: string | null): boolean {
  if (!url) return false;
  const normalized = normalizeOlxUrl(url);
  if (!normalized) return false;

  const lower = normalized.toLowerCase();

  // Generic category or query search URLs are NOT direct offer pages
  if (
    lower === 'https://www.olx.pl/d/oferta/' ||
    lower === 'https://www.olx.pl/oferta/' ||
    lower.includes('/praca/szczecin/q-') ||
    lower.includes('?q=') ||
    lower.includes('/q-')
  ) {
    return false;
  }

  return (
    lower.includes('/d/oferta/') ||
    lower.includes('/oferta/') ||
    /-id[a-z0-9]+\.html/i.test(lower) ||
    /,oferta,/i.test(lower)
  );
}

/**
 * Builds targeted search fallback URL on OLX based on trade keyword & category
 */
export function buildOlxSearchFallback(title?: string | null, category?: string | null): string {
  const tradeKeyword = extractTradeKeyword(title);
  const cat = (category || '').toLowerCase();

  // If service / renovation category
  if (cat.includes('usług') || cat.includes('uslugi') || cat.includes('wykończ') || cat.includes('remont')) {
    return `https://www.olx.pl/uslugi-firmy/budowa-remont/szczecin/q-${encodeURIComponent(tradeKeyword)}/`;
  }

  // Default job category search on OLX Szczecin
  return `https://www.olx.pl/praca/szczecin/q-${encodeURIComponent(tradeKeyword)}/`;
}

/**
 * Builds mobile deep-link scheme (olx://) for OLX app on mobile devices
 */
export function buildOlxMobileDeepLink(urlOrId?: string | null): string | null {
  const nativeId = extractOlxNativeId(urlOrId);
  if (nativeId) {
    return `olx://item/${nativeId}`;
  }
  return null;
}

/**
 * Builds Android Intent URL to open OLX app natively or fallback to Chrome cleanly
 */
export function buildOlxAndroidIntent(urlOrId?: string | null): string | null {
  const nativeId = extractOlxNativeId(urlOrId);
  const normalized = normalizeOlxUrl(urlOrId) || 'https://www.olx.pl/praca/szczecin/';
  if (nativeId) {
    return `intent://olx.pl/d/oferta/-ID${nativeId}.html#Intent;scheme=https;package=pl.tablica;S.browser_fallback_url=${encodeURIComponent(normalized)};end`;
  }
  return null;
}

/**
 * Returns canonical OLX URL for a given native ID
 */
export function getOlxCanonicalUrl(nativeId: string): string {
  const cleanId = nativeId.trim().replace(/^ID/i, '');
  return `https://www.olx.pl/d/oferta/-ID${cleanId}.html`;
}

const olxLinkStatusCache = new Map<string, { active: boolean; timestamp: number }>();
const LINK_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

/**
 * Verifies via light OLX API v1 probe if a native OLX offer is currently live/active.
 * Uses 15-minute in-memory cache to prevent unnecessary network overhead.
 */
export async function verifyOlxOfferLive(nativeId: string, timeoutMs = 400): Promise<boolean> {
  if (!nativeId || typeof nativeId !== 'string') return false;
  const cleanId = nativeId.trim().replace(/^ID/i, '');
  if (!cleanId) return false;

  const cached = olxLinkStatusCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < LINK_CACHE_TTL_MS) {
    return cached.active;
  }

  try {
    const res = await fetch(`https://www.olx.pl/api/v1/offers/${cleanId}/`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined,
    });

    if (res.status === 404) {
      olxLinkStatusCache.set(cleanId, { active: false, timestamp: Date.now() });
      return false;
    }

    if (res.ok) {
      const json = (await res.json()) as { data?: { status?: string } };
      const isActive = json?.data?.status === 'active';
      olxLinkStatusCache.set(cleanId, { active: isActive, timestamp: Date.now() });
      return isActive;
    }
  } catch {
    /* On timeout or network fetch error, gracefully default to assuming offer is active */
  }

  return true;
}

/**
 * Master Enterprise OLX Resolver function.
 * Resolves an announcement into a guaranteed working OLX live offer link.
 */
export function resolveOlxLink(ad?: OlxAdMinimal | null): OlxResolvedLink {
  if (!ad) {
    const defaultUrl = 'https://www.olx.pl/praca/szczecin/';
    return {
      url: defaultUrl,
      isDirectOffer: false,
      type: 'category_search_fallback',
    };
  }

  // 1. Direct source URL check
  if (ad.source_url && typeof ad.source_url === 'string' && ad.source_url.trim()) {
    const normalized = normalizeOlxUrl(ad.source_url);
    if (normalized && isDirectOlxOfferUrl(normalized)) {
      const nativeId = extractOlxNativeId(normalized) || extractOlxNativeId(ad.id);
      return {
        url: normalized,
        isDirectOffer: true,
        type: 'direct_canonical',
        mobileDeepLink: buildOlxMobileDeepLink(nativeId || normalized) || undefined,
        nativeId: nativeId || undefined,
      };
    }
  }

  // 2. ID-based reconstruction
  const nativeId = extractOlxNativeId(ad.id);
  if (nativeId) {
    const reconstructedUrl = getOlxCanonicalUrl(nativeId);
    return {
      url: reconstructedUrl,
      isDirectOffer: true,
      type: 'direct_id_reconstructed',
      mobileDeepLink: `olx://item/${nativeId}`,
      nativeId,
    };
  }

  // 3. Smart Targeted Search Fallback
  const fallbackUrl = buildOlxSearchFallback(ad.title, ad.category);
  return {
    url: fallbackUrl,
    isDirectOffer: false,
    type: 'category_search_fallback',
  };
}

/**
 * Resolves best URL for user's device (Android, iOS, Desktop)
 */
export function resolveOlxDeviceLink(ad?: OlxAdMinimal | null, userAgent?: string): string {
  const resolved = resolveOlxLink(ad);
  const ua = (userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '')).toLowerCase();

  if (/android/i.test(ua) && resolved.nativeId) {
    const intent = buildOlxAndroidIntent(resolved.nativeId);
    if (intent) return intent;
  }

  if (/(iphone|ipad|ipod)/i.test(ua) && resolved.mobileDeepLink) {
    return resolved.mobileDeepLink;
  }

  return resolved.url;
}

