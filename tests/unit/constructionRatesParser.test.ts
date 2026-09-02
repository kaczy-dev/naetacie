import { describe, it, expect } from 'vitest';
import { parseConstructionRate } from '@/lib/calculator/constructionRatesParser';

describe('Construction Rates & Units Parser', () => {
  it('parses square meter (m²) trade rates correctly', () => {
    const res1 = parseConstructionRate('Gładzie gipsowe 45 zł/m2');
    expect(res1).not.toBeNull();
    expect(res1?.salaryRange.type).toBe('m2');
    expect(res1?.salaryRange.min).toBe(45);
    expect(res1?.salaryRange.max).toBe(45);
    expect(res1?.priceText).toContain('45 zł/m²');

    const res2 = parseConstructionRate('Układanie glazury i gresu 120-160 zł/m² netto');
    expect(res2).not.toBeNull();
    expect(res2?.salaryRange.type).toBe('m2');
    expect(res2?.salaryRange.min).toBe(120);
    expect(res2?.salaryRange.max).toBe(160);
    expect(res2?.salaryRange.rateMode).toBe('netto');
    expect(res2?.salaryRange.isGross).toBe(false);
  });

  it('parses linear meter (mb) trade rates correctly', () => {
    const res = parseConstructionRate('Montaż cokołów 25 zł/mb');
    expect(res).not.toBeNull();
    expect(res?.salaryRange.type).toBe('mb');
    expect(res?.salaryRange.min).toBe(25);
    expect(res?.priceText).toContain('25 zł/mb');
  });

  it('parses installation points (punkt/pkt) trade rates correctly', () => {
    const res = parseConstructionRate('Wymiana instalacji elektrycznej 80 zł za punkt');
    expect(res).not.toBeNull();
    expect(res?.salaryRange.type).toBe('point');
    expect(res?.salaryRange.min).toBe(80);
    expect(res?.priceText).toContain('80 zł/punkt');
  });

  it('parses daily wages (dniówka) and estimates monthly income', () => {
    const res = parseConstructionRate('Pomocnik budowlany - dniówka 300 zł na rękę');
    expect(res).not.toBeNull();
    expect(res?.salaryRange.type).toBe('daily');
    expect(res?.salaryRange.min).toBe(300);
    expect(res?.salaryRange.rateMode).toBe('na_reke');
    // 300 zł * 21 dni = 6300 zł
    expect(res?.salaryRange.estimatedMonthlyEquivalent).toBe(6300);
  });

  it('parses hourly rates with monthly equivalent calculation', () => {
    const res = parseConstructionRate('Murarz 35-40 zł/h brutto');
    expect(res).not.toBeNull();
    expect(res?.salaryRange.type).toBe('hourly');
    expect(res?.salaryRange.min).toBe(35);
    expect(res?.salaryRange.max).toBe(40);
    expect(res?.salaryRange.isGross).toBe(true);
    expect(res?.salaryRange.rateMode).toBe('brutto');
    // 37.5 * 168h = 6300 zł
    expect(res?.salaryRange.estimatedMonthlyEquivalent).toBe(6300);
  });

  it('detects B2B and invoice (+VAT) modes', () => {
    const res = parseConstructionRate('Zlecenie B2B: montaż stolarki 5000 zł + VAT');
    expect(res).not.toBeNull();
    expect(res?.salaryRange.rateMode).toBe('b2b_netto');
    expect(res?.salaryRange.isGross).toBe(false);
  });

  it('returns null gracefully for invalid or empty inputs', () => {
    expect(parseConstructionRate('')).toBeNull();
    expect(parseConstructionRate('Brak stawki w ogłoszeniu')).toBeNull();
    expect(parseConstructionRate(null)).toBeNull();
  });
});
