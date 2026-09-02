import { describe, it, expect } from 'vitest';
import { unmaskPhoneNumber, verbalPolishToDigits } from '@/lib/scraper/phoneUnmasker';

describe('Polish Phone Number Unmasker & Verbal Decoder', () => {
  it('converts verbal Polish digit words into numbers', () => {
    const text = 'telefon: sześćset jeden dwa trzy cztery pięć sześć siedem';
    const converted = verbalPolishToDigits(text);
    expect(converted).toContain('601');
    expect(converted).toContain('2');
    expect(converted).toContain('3');
  });

  it('unmasks verbal disguised phone numbers', () => {
    const text = 'Zadzwoń do mnie: sześćset jeden 234 567';
    const phone = unmaskPhoneNumber(text);
    expect(phone).toBe('601-234-567');
  });

  it('unmasks punctuated disguised phone numbers', () => {
    expect(unmaskPhoneNumber('kontakt: 501.234.567')).toBe('501-234-567');
    expect(unmaskPhoneNumber('tel: 501_234_567')).toBe('501-234-567');
    expect(unmaskPhoneNumber('tel: 501/234/567')).toBe('501-234-567');
    expect(unmaskPhoneNumber('tel: (501) 234-567')).toBe('501-234-567');
  });

  it('unmasks dispersed single digits with spaces or hyphens', () => {
    expect(unmaskPhoneNumber('tel: 6 0 1 2 3 4 5 6 7')).toBe('601-234-567');
    expect(unmaskPhoneNumber('tel: 6-0-1-2-3-4-5-6-7')).toBe('601-234-567');
  });

  it('handles Polish country code +48 prefixes', () => {
    expect(unmaskPhoneNumber('+48 601 234 567')).toBe('601-234-567');
    expect(unmaskPhoneNumber('48601234567')).toBe('601-234-567');
  });

  it('unmasks Szczecin landline numbers (prefix 91)', () => {
    expect(unmaskPhoneNumber('biuro Szczecin: 91 422 11 22')).toBe('914-221-122');
  });

  it('returns null for invalid numbers or text without contact', () => {
    expect(unmaskPhoneNumber(null)).toBeNull();
    expect(unmaskPhoneNumber('Tylko kontakt przez formularz OLX')).toBeNull();
    expect(unmaskPhoneNumber('kod pocztowy 70-123')).toBeNull();
  });
});
