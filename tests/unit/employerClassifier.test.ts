import { describe, it, expect } from 'vitest';
import { classifyEmployer } from '@/lib/ai/employerClassifier';

describe('Construction Employer Classifier', () => {
  it('classifies employment agencies and recruiters correctly', () => {
    const res1 = classifyEmployer(
      'Cieśla szalunkowy Niemcy / Szczecin',
      'Agencja zatrudnienia KRAZ 12345 poszukuje pracowników dla naszego klienta.',
      'Work Service Poland'
    );
    expect(res1.type).toBe('agency');
    expect(res1.isDirect).toBe(false);
    expect(res1.confidence).toBeGreaterThanOrEqual(0.9);

    const res2 = classifyEmployer(
      'Pomocnik budowlany od zaraz',
      'Praca tymczasowa z możliwością stałego zatrudnienia',
      'Adecco Poland'
    );
    expect(res2.type).toBe('agency');
    expect(res2.isDirect).toBe(false);
  });

  it('classifies direct private homeowners / investors correctly', () => {
    const res = classifyEmployer(
      'Remont łazienki w bloku Szczecin Pogodno',
      'Szukam fachowca lub ekipy do remontu mojego mieszkania. Do położenia 25m2 płytek i instalacja podtynkowa. Prywatnie, płatne po robocie.',
      null
    );
    expect(res.type).toBe('direct_investor');
    expect(res.isDirect).toBe(true);
    expect(res.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('classifies construction contractors and firms correctly', () => {
    const res = classifyEmployer(
      'Zatrudnimy murarzy i zbrojarzy - stan deweloperski',
      'Generalny wykonawca osiedla mieszkaniowego w Szczecinie zatrudni brygady murarskie do budowy bloków.',
      'Budimex S.A.'
    );
    expect(res.type).toBe('contractor');
    expect(res.isDirect).toBe(true);
    expect(res.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
