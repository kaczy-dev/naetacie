import { describe, it, expect, vi } from 'vitest';
import { extractEnrichedJobData } from '@/lib/ai/twoTierExtractor';

describe('Two-Tier Hybrid AI Job Extraction Engine', () => {
  it('uses Tier 1 (Fast-Path Regex) for standard, structured offers (0ms)', async () => {
    const title = 'Elektryk budowlany Szczecin';
    const description = 'Poszukujemy elektryka z uprawnieniami SEP G1 oraz prawem jazdy kat. B. Stawka 40 zł / h. Tel. 501 234 567.';

    const mockLlm = vi.fn();

    const result = await extractEnrichedJobData(title, description, '40 zł / h', mockLlm);

    expect(result.tierUsed).toBe('tier1_fast_regex');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.75);
    expect(result.salaryParsed?.unit).toBe('hourly');
    expect(result.salaryParsed?.min).toBe(40);
    expect(result.certifications).toContain('Uprawnienia SEP');
    expect(mockLlm).not.toHaveBeenCalled();
  });

  it('triggers Tier 2 (LLM Fallback) when text contains construction slang or informal rate descriptions', async () => {
    const title = 'Fucha na regipsy od zaraz';
    const description = 'Daje 5 dyszek na czysto do łapy jak ogarniasz szpachle i masz vana.';

    const mockLlm = vi.fn().mockResolvedValue({
      salaryMin: 50,
      salaryMax: 50,
      salaryUnit: 'hourly',
      employmentType: 'B2B / Zlecenie',
      benefits: ['Wypłata do ręki'],
      certifications: ['Doświadczenie g-k'],
    });

    const result = await extractEnrichedJobData(title, description, null, mockLlm);

    expect(mockLlm).toHaveBeenCalledTimes(1);
    expect(result.tierUsed).toBe('tier2_structured_llm');
    expect(result.salaryParsed?.min).toBe(50);
    expect(result.confidenceScore).toBe(0.95);
  });
});
