/**
 * Normalizes location text for use as a geo_cache document ID in Firestore.
 *
 * Steps:
 * 1. Trim leading/trailing whitespace
 * 2. Collapse consecutive whitespace to a single space
 * 3. Convert to lowercase
 * 4. Truncate to 1500 bytes (UTF-8 safe)
 *
 * Properties:
 * - Idempotent: normalizeLocationText(normalizeLocationText(s)) === normalizeLocationText(s)
 * - Case-insensitive: strings differing only in case produce the same output
 * - Output is always ≤ 1500 bytes
 */
export function normalizeLocationText(text: string): string {
  // Step 1: Trim
  let result = text.trim();

  // Step 2: Collapse consecutive whitespace to single space
  result = result.replace(/\s+/g, ' ');

  // Step 3: Lowercase
  result = result.toLowerCase();

  // Step 4: Truncate to 1500 bytes (UTF-8 safe - don't split multi-byte characters)
  result = truncateToBytes(result, 1500);

  return result;
}

/**
 * Truncates a string to fit within the specified byte limit (UTF-8 encoding).
 * Ensures multi-byte characters are not split mid-sequence.
 */
function truncateToBytes(str: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);

  if (encoded.length <= maxBytes) {
    return str;
  }

  // Truncate the byte array and decode back to string
  // TextDecoder with fatal: false will replace incomplete sequences
  // We need to find the last valid character boundary
  const truncated = encoded.slice(0, maxBytes);
  const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
  let decoded = decoder.decode(truncated);

  // If the last character is the replacement character (U+FFFD) and the original
  // string at that position wasn't U+FFFD, we split a multi-byte character.
  // Remove trailing replacement characters that resulted from truncation.
  if (decoded.endsWith('\uFFFD') && !str.startsWith(decoded)) {
    // Walk backwards to find the clean cut point
    let byteLen = maxBytes;
    while (byteLen > 0) {
      byteLen--;
      const attempt = decoder.decode(encoded.slice(0, byteLen));
      if (!attempt.endsWith('\uFFFD') || str.startsWith(attempt)) {
        decoded = attempt;
        break;
      }
    }
  }

  return decoded;
}
