import { describe, it, expect } from 'vitest';
import { generateVoiceSummaryText, VoiceSpeechService } from '@/lib/voice/speechAssistant';

describe('Voice Speech Assistant Suite', () => {
  it('generates concise Polish voice script', () => {
    const script = generateVoiceSummaryText({
      title: 'Elektryk SEP Szczecin',
      location: 'Szczecin, Pogodno',
      price: '45 zł/h',
      phone: '501-234-567',
    }, 'pl');

    expect(script).toContain('Zlecenie: Elektryk SEP Szczecin');
    expect(script).toContain('Lokalizacja: Szczecin, Pogodno');
    expect(script).toContain('Wynagrodzenie: 45 zł/h');
    expect(script).toContain('Kontakt: 501 234 567');
  });

  it('generates concise Ukrainian voice script', () => {
    const script = generateVoiceSummaryText({
      title: 'Glazurnik płytkarz',
      location: 'Szczecin Gumieńce',
      price: 6000,
      phone: '501000222',
    }, 'uk');

    expect(script).toContain('Вакансія: Glazurnik płytkarz');
    expect(script).toContain('Локація: Szczecin Gumieńce');
    expect(script).toContain('Оплата: 6000 złotych');
  });

  it('checks Web Speech API support safely without throwing in node', () => {
    expect(typeof VoiceSpeechService.isSupported()).toBe('boolean');
  });
});
