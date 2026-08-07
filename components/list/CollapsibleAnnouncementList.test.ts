import { describe, it, expect } from 'vitest';
import { computeAverageSalary } from './CollapsibleAnnouncementList';

describe('computeAverageSalary utility', () => {
  it('should return null for empty array', () => {
    expect(computeAverageSalary([])).toBeNull();
  });

  it('should return null when no item has a numeric price', () => {
    const items = [
      { id: '1', price: null },
      { id: '2', price: 'Negotiable' },
      { id: '3', price: 0 },
    ];
    expect(computeAverageSalary(items)).toBeNull();
  });

  it('should compute average for numeric prices correctly', () => {
    const items = [
      { id: '1', price: 6000 },
      { id: '2', price: 8000 },
      { id: '3', price: 10000 },
    ];
    expect(computeAverageSalary(items)).toBe(8000);
  });

  it('should round the average to nearest integer', () => {
    const items = [
      { id: '1', price: 5000 },
      { id: '2', price: 6000 },
    ];
    expect(computeAverageSalary(items)).toBe(5500);
  });

  it('should ignore non-numeric or non-positive prices', () => {
    const items = [
      { id: '1', price: 7000 },
      { id: '2', price: null },
      { id: '3', price: -100 },
      { id: '4', price: 9000 },
    ];
    expect(computeAverageSalary(items)).toBe(8000);
  });
});
