/**
 * Canonical URL Cleaner & Job Portal ID Normalizer.
 * Strips tracking parameters, affiliate tokens, session IDs, and hashes
 * to guarantee robust cross-run deduplication and clean database storage.
 */

const STRIP_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'ref',
  'source',
  'sender',
  'action',
  'isPreviewActive',
  'sliderIndex',
  'search_reason',
  'view_type',
  'from',
]);

export function cleanCanonicalUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  try {
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return trimmed;
    }

    const urlObj = new URL(trimmed);

    // Force https
    urlObj.protocol = 'https:';

    // Normalize mobile subdomains (m.olx.pl -> www.olx.pl)
    if (urlObj.hostname === 'm.olx.pl') {
      urlObj.hostname = 'www.olx.pl';
    }

    // Remove tracking and session params
    const keysToDelete: string[] = [];
    urlObj.searchParams.forEach((_, key) => {
      if (STRIP_QUERY_PARAMS.has(key) || key.startsWith('utm_') || key.startsWith('spm_')) {
        keysToDelete.push(key);
      }
    });

    for (const k of keysToDelete) {
      urlObj.searchParams.delete(k);
    }

    // Strip hash fragments (e.g. #gallery, #contact)
    urlObj.hash = '';

    // If query string is now empty, ensure no trailing '?'
    let clean = urlObj.toString();
    if (clean.endsWith('?')) {
      clean = clean.slice(0, -1);
    }

    return clean;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Extracts pure canonical native ID from an announcement URL across all supported portals.
 */
export function extractPortalOfferId(url: string): string | null {
  if (!url) return null;

  // OLX ID (e.g. ID9xYz.html or CID4-ID9xYz)
  const olxMatch = url.match(/-ID([a-zA-Z0-9]+)\.html/i);
  if (olxMatch) return `olx_${olxMatch[1]}`;

  // Pracuj.pl ID (e.g. ,oferta,12345678)
  const pracujMatch = url.match(/,oferta,(\d+)/i) || url.match(/\/praca\/[a-z0-9-]+,oferta,(\d+)/i);
  if (pracujMatch) return `pracuj_${pracujMatch[1]}`;

  // Indeed ID (e.g. jk=1234567890abcdef)
  const indeedMatch = url.match(/jk=([a-f0-9]+)/i);
  if (indeedMatch) return `indeed_${indeedMatch[1]}`;

  // Oferteo ID (e.g. /zlecenia/123456)
  const oferteoMatch = url.match(/\/zlecenia\/(\d+)/i) || url.match(/\/zapytanie\/(\d+)/i);
  if (oferteoMatch) return `oferteo_${oferteoMatch[1]}`;

  // Fixly ID (e.g. /zlecenie/123456)
  const fixlyMatch = url.match(/\/zlecenie\/(\d+)/i);
  if (fixlyMatch) return `fixly_${fixlyMatch[1]}`;

  return null;
}
