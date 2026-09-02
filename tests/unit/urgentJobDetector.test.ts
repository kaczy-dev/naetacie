import { describe, it, expect } from 'vitest';
import { detectJobUrgency } from '@/lib/urgent/urgentJobDetector';

describe('Urgent Job Detector Suite', () => {
  it('detects emergency / na cito callouts with bonus rate', () => {
    const title = 'Awaria hydrauliczna na cito Szczecin';
    const desc = 'Pęknięta rura w lokalu użytkowym. Potrzebny hydraulik w tej chwili!';

    const res = detectJobUrgency(title, desc);
    expect(res.isUrgent).toBe(true);
    expect(res.level).toBe('EMERGENCY_CITO');
    expect(res.estimatedBountyBonusPercent).toBeGreaterThanOrEqual(40);
    expect(res.badgeLabel).toContain('NA CITO');
  });

  it('detects "od zaraz" and "na jutro" jobs', () => {
    const title = 'Dekarz od zaraz - budowa domów jednorodzinnych';
    const desc = 'Start od jutra rano. Zapewniamy narzędzia i dojazd z Gumieniec.';

    const res = detectJobUrgency(title, desc);
    expect(res.isUrgent).toBe(true);
    expect(res.level).toBe('URGENT_TODAY');
    expect(res.reasons.length).toBeGreaterThan(0);
  });

  it('returns NORMAL for standard non-urgent jobs', () => {
    const title = 'Monter stolarki okiennej';
    const desc = 'Stabilna praca w zespole monterskim. Umowa o pracę, poniedziałek-piątek.';

    const res = detectJobUrgency(title, desc);
    expect(res.isUrgent).toBe(false);
    expect(res.level).toBe('NORMAL');
  });
});
