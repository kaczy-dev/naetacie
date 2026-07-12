import { describe, it, expect } from 'vitest';
import { normalizeLocationText } from './normalize';

describe('normalizeLocationText', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeLocationText('  hello  ')).toBe('hello');
  });

  it('collapses consecutive whitespace to single space', () => {
    expect(normalizeLocationText('hello   world')).toBe('hello world');
    expect(normalizeLocationText('a\t\tb\n\nc')).toBe('a b c');
  });

  it('converts to lowercase', () => {
    expect(normalizeLocationText('Hello World')).toBe('hello world');
    expect(normalizeLocationText('SZCZECIN')).toBe('szczecin');
  });

  it('handles empty string', () => {
    expect(normalizeLocationText('')).toBe('');
  });

  it('handles whitespace-only string', () => {
    expect(normalizeLocationText('   ')).toBe('');
    expect(normalizeLocationText('\t\n  ')).toBe('');
  });

  it('is idempotent', () => {
    const inputs = [
      'Hello World',
      '  Szczecin   ul. Długa  15  ',
      'UPPERCASE text WITH   spaces',
      'a'.repeat(2000),
    ];

    for (const input of inputs) {
      const once = normalizeLocationText(input);
      const twice = normalizeLocationText(once);
      expect(twice).toBe(once);
    }
  });

  it('is case-insensitive', () => {
    expect(normalizeLocationText('Szczecin')).toBe(normalizeLocationText('szczecin'));
    expect(normalizeLocationText('HELLO')).toBe(normalizeLocationText('hello'));
    expect(normalizeLocationText('MiXeD CaSe')).toBe(normalizeLocationText('mixed case'));
  });

  it('truncates to at most 1500 bytes', () => {
    const encoder = new TextEncoder();

    // ASCII string longer than 1500 chars
    const longAscii = 'a'.repeat(2000);
    const result = normalizeLocationText(longAscii);
    expect(encoder.encode(result).length).toBeLessThanOrEqual(1500);

    // Multi-byte unicode string
    const longUnicode = 'ą'.repeat(1000); // ą is 2 bytes in UTF-8
    const unicodeResult = normalizeLocationText(longUnicode);
    expect(encoder.encode(unicodeResult).length).toBeLessThanOrEqual(1500);
  });

  it('does not split multi-byte characters when truncating', () => {
    const encoder = new TextEncoder();

    // Create a string that would split a multi-byte char at exactly 1500 bytes
    // 'ą' is 2 bytes in UTF-8, so 750 of them = 1500 bytes exactly
    const exactFit = 'ą'.repeat(750);
    const result = normalizeLocationText(exactFit);
    expect(encoder.encode(result).length).toBeLessThanOrEqual(1500);

    // 751 'ą' chars = 1502 bytes, should truncate cleanly
    const overfit = 'ą'.repeat(751);
    const overfitResult = normalizeLocationText(overfit);
    expect(encoder.encode(overfitResult).length).toBeLessThanOrEqual(1500);
    // Should not contain replacement character
    expect(overfitResult).not.toContain('\uFFFD');
  });

  it('handles mixed unicode and ASCII', () => {
    const input = '  Szczecin,  ul. Świętego  Ducha  ';
    expect(normalizeLocationText(input)).toBe('szczecin, ul. świętego ducha');
  });

  it('handles 3-byte and 4-byte unicode characters', () => {
    const encoder = new TextEncoder();

    // Chinese characters (3 bytes each in UTF-8)
    const chinese = '北'.repeat(600); // 1800 bytes
    const result = normalizeLocationText(chinese);
    expect(encoder.encode(result).length).toBeLessThanOrEqual(1500);
    expect(result).not.toContain('\uFFFD');

    // Emoji (4 bytes each in UTF-8)
    const emoji = '😀'.repeat(400); // 1600 bytes
    const emojiResult = normalizeLocationText(emoji);
    expect(encoder.encode(emojiResult).length).toBeLessThanOrEqual(1500);
    expect(emojiResult).not.toContain('\uFFFD');
  });
});
