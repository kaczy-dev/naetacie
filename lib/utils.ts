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

export function ensureAbsoluteUrl(url: string | null | undefined, portalHint?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

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

  // Relative paths (e.g. /d/oferta/123.html or /announcements/1)
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
  if (p === 'indeed') {
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
 * Resolves the target external URL for an announcement.
 * Always returns a valid, clickable absolute URL pointing to the portal's offer page
 * or a targeted portal search page if the specific offer URL is missing or masked.
 */
export function getAnnouncementExternalUrl(ad?: {
  source_url?: string | null;
  source_portal?: string | null;
  title?: string | null;
  id?: string;
} | null): string {
  if (!ad) return 'https://www.olx.pl/praca/szczecin/';

  // 1. Check if we have a valid direct absolute URL to an exact offer
  if (ad.source_url) {
    let abs = ensureAbsoluteUrl(ad.source_url, ad.source_portal);
    if (abs) {
      if (abs.includes('olx.pl/oferta/')) {
        abs = abs.replace('olx.pl/oferta/', 'olx.pl/d/oferta/');
      }
      
      // Check if URL is a specific offer (contains ID, .html, ,oferta,, viewjob, jk=, or digits)
      const isSpecificOfferUrl =
        abs.includes('-ID') ||
        abs.endsWith('.html') ||
        abs.includes(',oferta,') ||
        abs.includes('viewjob') ||
        abs.includes('jk=') ||
        abs.includes('search%5Bq%5D') ||
        abs.includes('query') ||
        /\d{3,}/.test(abs);

      if (isSpecificOfferUrl) {
        return abs;
      }
    }
  }

  // 2. Check if ad.id contains a numeric OLX ID or offer ID (e.g. olx_12345678 or 12345678)
  if (ad.id) {
    const numericMatch = ad.id.match(/\d+/);
    if (numericMatch && numericMatch[0].length >= 5) {
      const portal = (ad.source_portal || 'olx').toLowerCase();
      if (portal === 'olx') {
        return `https://www.olx.pl/d/oferta/-ID${numericMatch[0]}.html`;
      }
    }
  }

  // 3. Build targeted portal search link using clean, unaccented ASCII keywords
  const portal = (ad.source_portal || 'olx').toLowerCase();
  
  const asciiTitle = removePolishDiacritics(ad.title || '');
  const keywords = asciiTitle
    ? asciiTitle
        .replace(/[^\w\s]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !['dla', 'oraz', 'szczecin', 'praca', 'darmowe', 'szukam'].includes(w.toLowerCase()))
        .slice(0, 4)
        .join(' ')
    : 'budowlana';

  const queryText = keywords || 'budowlana';

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

  // OLX targeted search query fallback (never redirects to home, opens matching live offers on OLX in Szczecin)
  return `https://www.olx.pl/praca/szczecin/?search%5Bq%5D=${encodeURIComponent(queryText)}`;
}


