import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Project Setup', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2);
  });

  it('fast-check is available', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      })
    );
  });
});
