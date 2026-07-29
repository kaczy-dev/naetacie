import { describe, it, expect } from 'vitest';
import { extractJobTraits } from '@/lib/ai/freeJobExtractor';

describe('Zero-Cost Local AI/NLP Job Extractor', () => {
  it('extracts certifications, benefits, and experience level', () => {
    const title = 'Elektryk Budowlany z uprawnieniami SEP G1';
    const description = `
      Poszukujemy elektryka do wykonywania instalacji w budynkach mieszkalnych.
      Wymagane uprawnienia SEP oraz prawo jazdy kat. B. Praca na wysokości powyżej 3m.
      Oferujemy zakwaterowanie gratis, bus służbowy oraz płatne nadgodziny.
      Wypłata co tydzień (tygodniówka). Stawka 45 zł/h netto.
    `;

    const traits = extractJobTraits(title, description);

    expect(traits.certifications).toContain('Uprawnienia SEP');
    expect(traits.certifications).toContain('Prawo jazdy kat. B');
    expect(traits.certifications).toContain('Praca na wysokości');
    expect(traits.benefits).toContain('Zakwaterowanie gratis');
    expect(traits.benefits).toContain('Darmowy transport');
    expect(traits.benefits).toContain('Płatne nadgodziny');
    expect(traits.benefits).toContain('Tygodniowe wypłaty');
    expect(traits.accommodation_provided).toBe(true);
    expect(traits.transport_provided).toBe(true);
    expect(traits.salary_parsed).toEqual({
      min: 45,
      max: 45,
      currency: 'PLN',
      unit: 'hourly',
    });
  });

  it('detects no-experience requirements and B2B contracts', () => {
    const title = 'Pomocnik budowlany - przyuczymy, bez doświadczenia';
    const description = 'Praca przy pracach ogólnobudowlanych. Rozliczenie B2B lub umowa zlecenie.';

    const traits = extractJobTraits(title, description);

    expect(traits.experience_level).toBe('Brak doświadczenia');
    expect(traits.employment_type_normalized).toBe('B2B');
  });
});
