import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Triggers mobile Taptic / Vibration haptic feedback if supported by browser.
 */
export function triggerHaptic(pattern: number | number[] = 10) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore if restricted by browser security policy */
    }
  }
}

/**
 * Formats salary / price into compact short badge text (e.g. 14k zł, 8.5k zł, Zdalnie).
 */
export function formatShortPrice(price: string | number | null): string {
  if (price === null || price === undefined) return 'Ogłoszenie';
  if (typeof price === 'number') {
    if (price >= 1000) {
      const kValue = (price / 1000).toFixed(price % 1000 === 0 ? 0 : 1);
      return `${kValue}k zł`;
    }
    return `${price} zł`;
  }
  const str = String(price).trim();
  if (!str) return 'Ogłoszenie';
  return str.length > 12 ? `${str.slice(0, 10)}...` : str;
}

/**
 * Exports user's tracked applications / announcements to a downloadable UTF-8 CSV file.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportApplicationsToCSV(ads: Array<Record<string, any>>, getStatusText: (id: string) => string) {
  if (typeof window === 'undefined' || ads.length === 0) return;

  const headers = ['Tytuł', 'Firma', 'Lokalizacja', 'Portal', 'Wynagrodzenie', 'Status', 'Link'];
  const rows = ads.map((ad) => [
    `"${(String(ad.title || '')).replace(/"/g, '""')}"`,
    `"${(String(ad.company || '')).replace(/"/g, '""')}"`,
    `"${(String(ad.location_text || '')).replace(/"/g, '""')}"`,
    `"${(String(ad.source_portal || '')).replace(/"/g, '""')}"`,
    `"${typeof ad.price === 'number' ? ad.price + ' zł' : String(ad.price || '')}"`,
    `"${getStatusText(String(ad.id || ''))}"`,
    `"${String(ad.source_url || '')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `naetacie_aplikacje_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

import { resolveOlxLink, extractOlxNativeId, normalizeOlxUrl } from '@/lib/olx/olxLinkResolver';

export function ensureAbsoluteUrl(url: string | null | undefined, portalHint?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  // Unescape &amp;
  trimmed = trimmed.replace(/&amp;/g, '&');

  // Protocol relative links like //www.olx.pl/...
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // Already a valid absolute HTTP/HTTPS URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Domain strings missing protocol (e.g. www.olx.pl/oferta/123 or olx.pl/oferta/123)
  if (/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // Relative paths (e.g. /d/oferta/123.html or /announcements/1 or d/oferta/...)
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const p = (portalHint || '').toLowerCase();

  if (p === 'olx' || path.startsWith('/d/oferta/') || path.startsWith('/oferta/')) {
    return `https://www.olx.pl${path}`;
  }
  if (p === 'pracuj' || path.startsWith('/praca/')) {
    return `https://www.pracuj.pl${path}`;
  }
  if (p === 'oferteo') {
    return `https://www.oferteo.pl${path}`;
  }
  if (p === 'fixly') {
    return `https://fixly.pl${path}`;
  }
  if (p === 'indeed' || path.startsWith('/viewjob')) {
    return `https://pl.indeed.com${path}`;
  }

  // Default fallback for relative path
  if (trimmed.startsWith('/')) {
    return `https://www.olx.pl${path}`;
  }

  return `https://${trimmed}`;
}

/**
 * Removes Polish diacritics and converts accented letters to plain ASCII.
 */
export function removePolishDiacritics(str: string): string {
  const map: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (m) => map[m] || m);
}

/**
 * Extracts a concise, accurate trade keyword from a full job title sentence
 * (e.g. "Firma Onesto zatrudni dekarza z doświadczeniem" -> "dekarz").
 */
export function extractTradeKeyword(title?: string | null): string {
  if (!title) return 'budowlana';
  const ascii = removePolishDiacritics(title).toLowerCase();

  // Match core trade keywords first
  const tradeMatch = ascii.match(/\b(dekarz|dekarza|murarz|murarza|elektryk|elektryka|hydraulik|hydraulika|brukarz|brukarza|ciesla|ciesle|malarz|malarza|tynkarz|tynkarza|stolarz|stolarza|spawacz|spawacza|posadzkarz|posadzkarza|glazurnik|glazurnika|kierownik|kierownika|operator|operatora|pomocnik|pomocnika|monter|montera|zbrojarz|zbrojarza|inzynier|inzyniera)\b/i);

  if (tradeMatch && tradeMatch[1]) {
    let word = tradeMatch[1].toLowerCase();
    if (word.endsWith('a') && word.length > 4) {
      word = word.slice(0, -1);
    }
    return word;
  }

  // Filter out sentence stop-words
  const stopWords = new Set([
    'firma', 'zatrudni', 'zatrudnimy', 'poszukuje', 'poszukujemy', 'doswiadczeniem',
    'doswiadczenia', 'zaraz', 'praca', 'pracy', 'szukam', 'dla', 'oraz', 'szczecin',
    'dobra', 'stawka', 'umowa', 'pilnie', 'ogolnobudowlany', 'ogolnobudowlane', 'osiedla',
    'budowie', 'prace', 'nowych', 'budynkach', 'remont', 'remonty'
  ]);

  const words = ascii
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  return words[0] || 'budowlana';
}

/**
 * Resolves the target external URL for an announcement.
 * Always returns a valid, clickable absolute URL pointing to the portal's offer page
 * or a targeted portal search page if the specific offer URL is missing or masked.
 */
export function getAnnouncementExternalUrl(ad?: {
  source_url?: string | null;
  source_portal?: string | null;
  title?: string | null;
  id?: string;
  category?: string | null;
} | null): string {
  if (!ad) return 'https://www.olx.pl/praca/szczecin/';

  const portal = (ad.source_portal || 'olx').toLowerCase();

  // 1. Non-OLX Portals: Check direct source URL first
  if (portal !== 'olx' && ad.source_url && typeof ad.source_url === 'string' && ad.source_url.trim()) {
    let abs = ensureAbsoluteUrl(ad.source_url.trim(), portal);
    if (abs) {
      if (abs.includes('indeed.com')) {
        const jkMatch = abs.match(/[?&](?:jk|vjk)=([a-zA-Z0-9_-]+)/i);
        if (jkMatch) {
          abs = `https://pl.indeed.com/viewjob?jk=${jkMatch[1]}`;
        }
      }
      return abs;
    }
  }

  // 2. Delegate to OLX Link Resolver for OLX or default portal
  if (portal === 'olx' || !ad.source_portal || (ad.source_url && ad.source_url.includes('olx'))) {
    const resolved = resolveOlxLink({
      source_url: ad.source_url,
      source_portal: ad.source_portal,
      title: ad.title,
      id: ad.id,
      category: ad.category,
    });
    return resolved.url;
  }

  // 2. Non-OLX Portals: Check direct source URL
  if (ad.source_url) {
    let abs = ensureAbsoluteUrl(ad.source_url, ad.source_portal);
    if (abs) {
      if (abs.includes('indeed.com')) {
        const jkMatch = abs.match(/[?&](?:jk|vjk)=([a-zA-Z0-9_-]+)/i);
        if (jkMatch) {
          abs = `https://pl.indeed.com/viewjob?jk=${jkMatch[1]}`;
        }
      }
      return abs;
    }
  }

  // 3. Fallback for non-OLX portals
  const queryText = extractTradeKeyword(ad.title);
  if (portal === 'pracuj') {
    return `https://www.pracuj.pl/praca/${encodeURIComponent(queryText)};kw/szczecin;wp`;
  }
  if (portal === 'oferteo') {
    return `https://www.oferteo.pl/remont-i-wykonczenie-mieszkan/szczecin`;
  }
  if (portal === 'fixly') {
    return `https://fixly.pl/uslugi/budowa-remont`;
  }
  if (portal === 'indeed') {
    return `https://pl.indeed.com/jobs?q=${encodeURIComponent(queryText)}&l=Szczecin`;
  }

  return `https://www.olx.pl/praca/szczecin/q-${encodeURIComponent(queryText)}/`;
}


