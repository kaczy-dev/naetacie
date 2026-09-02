import { describe, it, expect } from 'vitest';
import { evaluateEmployerTrust } from '@/lib/safety/employerTrustEvaluator';

describe('Employer Trust Evaluator Suite', () => {
  it('assigns high score to verified business with phone and detailed description', () => {
    const report = evaluateEmployerTrust({
      company: 'Budimex S.A.',
      phone: '501234567',
      sourcePortal: 'pracuj',
      hasBusinessAccount: true,
      descriptionLength: 300,
    });

    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.level).toBe('VERIFIED_BUSINESS');
    expect(report.isLowRisk).toBe(true);
    expect(report.badgeLabel).toBe('Zweryfikowana firma');
  });

  it('provides safety checklist and material cash advance warning for private individuals', () => {
    const report = evaluateEmployerTrust({
      company: null,
      phone: '501000111',
      sourcePortal: 'olx',
      hasBusinessAccount: false,
      descriptionLength: 100,
    });

    expect(report.badgeLabel).toBe('Zaufany zleceniodawca');
    expect(report.recommendations.some((r) => r.includes('zaliczkę'))).toBe(true);
  });
});
