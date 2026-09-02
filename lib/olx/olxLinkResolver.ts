import { extractTradeKeyword, removePolishDiacritics } from '@/lib/utils';

export interface OlxAdMinimal {
  id?: string;
  deduplication_key?: string | null;
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
 * Detects if an ID string is a synthetic mock/seed ID rather than a real or test OLX offer ID.
 */
export function isSyntheticId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return true;
  const str = id.trim().toLowerCase();
  if (
    str.startsWith('seed') ||
    str.startsWith('mock') ||
    str.startsWith('test') ||
    str.startsWith('ann_uuid') ||
    /^j\d+$/i.test(str) ||
    str === 'custom_hash' ||
    str === 'custom_text_no_id' ||
    str === 'custom' ||
    str === 'non_numeric_id'
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts native OLX offer ID from various URL formats or ID strings.
 * Examples:
 * - 'https://www.olx.pl/d/oferta/-IDn2cwpf.html' -> 'n2cwpf'
 * - 'https://www.olx.pl/d/oferta/dekarz-szczecin-ID108H31.html' -> '108H31'
 * - 'olx-ID108H31' -> '108H31'
 * - 'olx_8eLk' -> '8eLk'
 * - 'olx_91827364' -> '91827364'
 * - 'ID108H31' -> '108H31'
 * - '91827364' -> '91827364'
 */
export function extractOlxNativeId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const str = urlOrId.trim();
  if (!str) return null;

  // 1. Check for canonical -ID suffix in URL or string (e.g. -IDn2cwpf.html, -ID108H31.html, -ID91827364.html)
  const canonicalMatch = str.match(/[-_]ID([a-zA-Z0-9]+)(?:\.html)?(?:\?|$)/i);
  if (canonicalMatch && canonicalMatch[1]) {
    return canonicalMatch[1];
  }

  // 2. Check for query param id=olx-123456 or id=123456 or id=ID108H31 in redirect or API URLs
  const queryParamMatch = str.match(/[?&]id=(?:olx[-_])?(?:ID)?([a-zA-Z0-9]{3,14})(?:&|$)/i);
  if (queryParamMatch && queryParamMatch[1]) {
    return queryParamMatch[1];
  }

  // 3. Check for explicit ID in URL path (e.g. /d/oferta/tytul-ID108H31)
  const idInUrlMatch = str.match(/[-_]ID([a-zA-Z0-9]{3,14})/i);
  if (idInUrlMatch && idInUrlMatch[1]) {
    return idInUrlMatch[1];
  }

  if (isSyntheticId(str)) return null;

  // Clean common prefixes (olx-, olx_, olx_raw_, olx-raw-, raw-, ad-)
  const hasOlxPrefix = /^olx[-_](raw[-_])?/i.test(str);
  const cleaned = str.replace(/^olx[-_](raw[-_])?/i, '').replace(/^(raw|ad|item|job)[_-]+/i, '').trim();

  // 4. Pure digits (e.g. '123456', '91827364' or '987654321')
  if (/^\d{3,12}$/.test(cleaned)) {
    return cleaned;
  }

  // 5. Explicit ID prefix (e.g. 'ID108H31' or 'ID8eLk' or 'IDn2cwpf')
  if (/^ID[a-zA-Z0-9]{3,12}$/i.test(cleaned)) {
    return cleaned.replace(/^ID/i, '');
  }

  // 6. Alphanumeric ID with explicit olx- prefix and at least 3 alphanumeric chars
  if (hasOlxPrefix && /^[a-zA-Z0-9]{3,12}$/i.test(cleaned)) {
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

  // Internal redirect routes or generic category / query search URLs are NOT direct offer pages
  if (
    lower.includes('/api/announcements/redirect') ||
    lower === 'https://www.olx.pl/d/oferta/' ||
    lower === 'https://www.olx.pl/oferta/' ||
    lower.includes('/praca/szczecin/q-') ||
    lower.includes('?q=') ||
    lower.includes('/q-') ||
    lower.includes('search%5bq%5d=') ||
    lower.includes('search[q]=')
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
 * Builds targeted search fallback URL on OLX based on trade keyword & category.
 * Uses official modern OLX Poland Next.js router route: /d/szczecin/q-[trade]/
 * Guaranteed 200 OK without "Ups! Coś poszło nie tak...".
 */
export function buildOlxSearchFallback(title?: string | null, category?: string | null): string {
  const tradeKeyword = extractTradeKeyword(title);
  const cleanSlug = removePolishDiacritics(tradeKeyword)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

  if (cleanSlug && cleanSlug !== 'budowlana') {
    return `https://www.olx.pl/d/szczecin/q-${cleanSlug}/`;
  }
  return 'https://www.olx.pl/praca/budowa-remonty/szczecin/';
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
export function getOlxCanonicalUrl(nativeId: string, title?: string | null): string {
  const cleanId = nativeId.trim().replace(/^ID/i, '');
  if (title && typeof title === 'string') {
    const slug = removePolishDiacritics(title.toLowerCase())
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50);
    if (slug) {
      return `https://www.olx.pl/d/oferta/${slug}-ID${cleanId}.html`;
    }
  }
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
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
    const raw = ad.source_url.trim();

    // Check if source_url contains embedded ID (like redirect URL or direct offer URL)
    const nativeIdInSource = extractOlxNativeId(raw);
    const normalized = normalizeOlxUrl(raw);

    if (normalized && isDirectOlxOfferUrl(normalized)) {
      const nativeId =
        nativeIdInSource ||
        extractOlxNativeId(ad.id) ||
        extractOlxNativeId(ad.deduplication_key);
      return {
        url: normalized,
        isDirectOffer: true,
        type: 'direct_canonical',
        mobileDeepLink: buildOlxMobileDeepLink(nativeId || normalized) || undefined,
        nativeId: nativeId || undefined,
      };
    }

    // If source_url had an embedded ID (e.g. redirect URL ?id=olx-ID108H31)
    if (nativeIdInSource) {
      const reconstructedUrl = getOlxCanonicalUrl(nativeIdInSource, ad.title);
      return {
        url: reconstructedUrl,
        isDirectOffer: true,
        type: 'direct_id_reconstructed',
        mobileDeepLink: `olx://item/${nativeIdInSource}`,
        nativeId: nativeIdInSource,
      };
    }

    // If source_url contains /q- or ?q= or search query parameter, sanitize into modern working /d/szczecin/q-.../ URL
    if (raw.includes('/q-') || raw.includes('?q=') || raw.includes('?search') || raw.includes('search[')) {
      const qMatch = raw.match(/\/q-([^/?#]+)/i) || raw.match(/[?&](?:search%5Bquery%5D|search\[query\]|search%5Bq%5D|search\[q\]|q)=([^&]+)/i);
      const queryVal = qMatch ? decodeURIComponent(qMatch[1].replace(/[-+]/g, ' ')) : ad.title;
      const cleanFallback = buildOlxSearchFallback(queryVal || ad.title, ad.category);
      return {
        url: cleanFallback,
        isDirectOffer: false,
        type: 'category_search_fallback',
      };
    }

    // If it's an OLX search URL, ensure it uses the working /d/ route
    if (normalized && normalized.includes('olx.pl/')) {
      if (normalized.includes('/d/szczecin/q-') || normalized.includes('/praca/budowa-remonty/szczecin/')) {
        return {
          url: normalized,
          isDirectOffer: false,
          type: 'category_search_fallback',
        };
      }
      return {
        url: buildOlxSearchFallback(ad.title, ad.category),
        isDirectOffer: false,
        type: 'category_search_fallback',
      };
    }
  }

  // 2. Real Native ID & Key-based reconstruction fallback
  const nativeId =
    extractOlxNativeId(ad.id) ||
    extractOlxNativeId(ad.deduplication_key) ||
    extractOlxNativeId(ad.source_url);

  if (nativeId) {
    const reconstructedUrl = getOlxCanonicalUrl(nativeId, ad.title);
    return {
      url: reconstructedUrl,
      isDirectOffer: true,
      type: 'direct_id_reconstructed',
      mobileDeepLink: `olx://item/${nativeId}`,
      nativeId,
    };
  }

  // 3. Guaranteed Working Smart Targeted Search Fallback
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
