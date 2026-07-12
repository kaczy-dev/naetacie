import { describe, it, expect } from 'vitest';
import { jitteredPosition } from './jitter';

describe('jitteredPosition', () => {
  const lat = 53.4285;
  const lng = 14.5528;

  it('returns a different position than the input', () => {
    const [jLat, jLng] = jitteredPosition(lat, lng, 'test-id-123');
    expect(jLat).not.toBe(lat);
    expect(jLng).not.toBe(lng);
  });

  it('is deterministic — same ID always produces the same offset', () => {
    const a = jitteredPosition(lat, lng, 'abc');
    const b = jitteredPosition(lat, lng, 'abc');
    expect(a[0]).toBe(b[0]);
    expect(a[1]).toBe(b[1]);
  });

  it('different IDs produce different offsets', () => {
    const a = jitteredPosition(lat, lng, 'id-1');
    const b = jitteredPosition(lat, lng, 'id-2');
    expect(a[0]).not.toBe(b[0]);
  });

  it('stays within ~200m of the original (less than 0.002 degrees at 53°N)', () => {
    for (let i = 0; i < 50; i++) {
      const [jLat, jLng] = jitteredPosition(lat, lng, `offer-${i}`);
      expect(Math.abs(jLat - lat)).toBeLessThan(0.002);
      expect(Math.abs(jLng - lng)).toBeLessThan(0.003);
    }
  });
});
