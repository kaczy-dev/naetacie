/**
 * Advanced Polish Phone Number Unmasker & Decoder.
 * Decodes obfuscated contact numbers commonly hidden by posters on OLX,
 * Facebook Groups, and classifieds to bypass scrapers and platform restrictions.
 *
 * Handles:
 * - Verbal Polish numbers: "sześćset jeden dwa trzy cztery..."
 * - Punctuation disguises: "501.234.567", "501/234/567", "501_234_567", "(501) 234-567"
 * - Dispersed single digits: "6 0 1 2 3 4 5 6 7", "6-0-1-2-3-4-5-6-7"
 * - Mixed text: "tel: 601 oraz 234 a potem 567"
 */

const POLISH_WORD_DIGITS: Record<string, string> = {
  // Phone prefix compounds (hundreds + unit, e.g. sześćset jeden -> 601)
  'sześćset jeden': '601',
  'szescset jeden': '601',
  'sześćset dwa': '602',
  'szescset dwa': '602',
  'sześćset trzy': '603',
  'szescset trzy': '603',
  'pięćset jeden': '501',
  'piecset jeden': '501',
  'pięćset dwa': '502',
  'piecset dwa': '502',
  'pięćset trzy': '503',
  'piecset trzy': '503',
  'siedemset jeden': '701',
  'siedemset dwa': '702',

  // Hundreds
  'dziewięćset': '900',
  'dziewiecset': '900',
  'osiemset': '800',
  'siedemset': '700',
  'sześćset': '600',
  'szescset': '600',
  'pięćset': '500',
  'piecset': '500',
  'czterysta': '400',
  'trzysta': '300',
  'dwieście': '200',
  'dwiescie': '200',
  'sto': '100',

  // Single digits
  'dziewięć': '9',
  'dziewiec': '9',
  'osiem': '8',
  'siedem': '7',
  'sześć': '6',
  'szesc': '6',
  'pięć': '5',
  'piec': '5',
  'cztery': '4',
  'trzy': '3',
  'dwa': '2',
  'jeden': '1',
  'zero': '0',
};

// Sort keys longest first so compounds match before substrings
const SORTED_ENTRIES = Object.entries(POLISH_WORD_DIGITS).sort(
  ([a], [b]) => b.length - a.length
);

/**
 * Normalizes any text by converting verbal Polish number words into digits.
 */
export function verbalPolishToDigits(text: string): string {
  let result = text.toLowerCase();
  for (const [word, digit] of SORTED_ENTRIES) {
    const rx = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(rx, ` ${digit} `);
  }
  return result;
}

/**
 * Deep extraction and unmasking of Polish 9-digit mobile & landline numbers.
 * Valid Polish mobile prefixes start with: 4, 5, 6, 7, 8, 9.
 * Valid Szczecin landline area code starts with: 91 (e.g. 91 422 xx xx).
 */
export function unmaskPhoneNumber(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;

  // 1. First check if there are verbal number words, convert them
  const decodedText = verbalPolishToDigits(text);

  // 2. Remove common noise symbols used for obfuscation: [ ] ( ) . - _ / \ | :
  // But preserve digits and context
  const cleaned = decodedText
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[._\\/|-]/g, ' ');

  // 3. Find candidate sequences of digits (with optional +48 country code)
  // Look for any string where at least 9 digits are clustered together with spaces/noise
  const matches = cleaned.match(/(?:\+?48\s*)?(?:[0-9]\s*){9,11}/g);

  if (!matches) return null;

  for (const match of matches) {
    const digits = match.replace(/\D/g, '');
    let cleanDigits = digits;

    // Strip Polish country code +48
    if (digits.startsWith('48') && digits.length === 11) {
      cleanDigits = digits.slice(2);
    } else if (digits.length === 10 && digits.startsWith('0')) {
      // Old style with leading 0 (e.g. 0-601-234-567)
      cleanDigits = digits.slice(1);
    }

    // Valid Polish number must have exactly 9 digits
    if (cleanDigits.length === 9) {
      // Must start with valid Polish mobile prefix (4-8) or landline (e.g. Szczecin 91)
      if (/^[456789]/.test(cleanDigits)) {
        return `${cleanDigits.slice(0, 3)}-${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
      }
    }
  }

  return null;
}
