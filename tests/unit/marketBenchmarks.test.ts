import { describe, it, expect } from 'vitest';
import { evaluateMarketSalary } from '@/lib/stats/marketBenchmarks';

describe('Szczecin Market Salary Benchmark Engine', () => {
  it('evaluates high salary offer as above market average', () => {
    const res = evaluateMarketSalary('Elektryk budowlany', '11000 zł/mies.');
    expect(res.badgeColor).toBe('emerald');
    expect(res.percentageDiff).toBeGreaterThan(10);
    expect(res.badgeLabel).toContain('Powyżej średniej');
  });

  it('evaluates standard hourly salary as market average', () => {
    const res = evaluateMarketSalary('Murarz-Zbrojarz', '42 zł/h');
    expect(res.badgeColor).toBe('blue');
    expect(res.badgeLabel).toContain('Rynkowa');
  });
});
