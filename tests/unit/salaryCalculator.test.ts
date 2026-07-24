import { describe, it, expect } from 'vitest';
import { calculateNetSalary } from '@/lib/salary/calculator';

describe('Salary Net Calculator (Unit Tests)', () => {
  it('calculates net salary breakdown for a given gross amount', () => {
    const res = calculateNetSalary(8000);

    expect(res.gross).toBe(8000);
    expect(res.uopNet).toBeGreaterThan(5000);
    expect(res.uopNet).toBeLessThan(8000);
    expect(res.uzNet).toBeGreaterThan(5000);
    expect(res.uzStudentNet).toBe(8000);
    expect(res.b2bNet).toBeGreaterThan(5000);
    expect(res.b2bRyczalt12Net).toBeGreaterThan(5000);
  });

  it('calculates correct percentages for student vs standard contracts', () => {
    const res = calculateNetSalary(10000);

    expect(res.uzStudentNet).toBe(10000); // 100% for students
    expect(res.uopNet).toBe(7270);        // ~72.7% for UoP
    expect(res.uzNet).toBe(7350);         // ~73.5% for UZ
  });

  it('handles 0 gross gracefully', () => {
    const res = calculateNetSalary(0);
    expect(res.gross).toBe(0);
    expect(res.uopNet).toBe(0);
    expect(res.b2bNet).toBe(0);
  });
});
