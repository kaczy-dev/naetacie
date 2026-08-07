import { describe, it, expect } from 'vitest';
import { analyzeJobFraud } from '@/lib/ai/fraudDetector';
import { extractEquipment } from '@/lib/ai/equipmentDetector';
import { extractJobTraits } from '@/lib/ai/freeJobExtractor';

describe('Anti-Spam & Fraud Detection Engine', () => {
  it('identifies legitimate job postings with low score', () => {
    const result = analyzeJobFraud({
      title: 'Zatrudnię murarza do pracy na budowie',
      description: 'Wymagane doświadczenie min 2 lata. Wynagrodzenie 7000 zł brutto. Praca w Szczecinie.',
      price: 7000,
      phone: '501-234-567',
    });

    expect(result.isSuspicious).toBe(false);
    expect(result.score).toBeLessThan(0.4);
    expect(result.reasons).toHaveLength(0);
  });

  it('detects upfront fee scams and SMS premium numbers', () => {
    const result = analyzeJobFraud({
      title: 'Darmowe szkolenie, wpłać zaliczkę rekrutacyjną',
      description: 'Wysłanie dowodu osobistego wymagane. Wyślij SMS pod numer 700123456.',
      price: 45000,
      phone: '700-123-456',
    });

    expect(result.isSuspicious).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.7);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe('Equipment & Tool Detection Engine', () => {
  it('extracts power tools, machinery, and vehicles from description', () => {
    const tools = extractEquipment(
      'Tynkarz maszynowy - PFT G5, Hilti',
      'Praca na budowie osiedla. Szalunki Doka, bus służbowy, elektronarzędzia Hilti i Bosch.'
    );

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('Auto służbowe / Bus');
    expect(toolNames).toContain('Elektronarzędzia zawodowe');
    expect(toolNames).toContain('Agregat tynkarski / malarski');
    expect(toolNames).toContain('Szalunki Doka / Peri');
  });
});

describe('Integrated Job Traits Extraction', () => {
  it('combines equipment detection and fraud score into traits object', () => {
    const traits = extractJobTraits(
      'Elektryk budowlany - sep g1',
      'Zapewniamy auto służbowe, wiertarki Makita, stawka 40 zł/h netto.',
      '8000 zł',
      '600-111-222'
    );

    expect(traits.certifications).toContain('Uprawnienia SEP');
    expect(traits.equipment_detected.length).toBeGreaterThan(0);
    expect(traits.fraud_analysis.isSuspicious).toBe(false);
  });
});
