import { describe, it, expect } from 'vitest';
import {
  getMarketCyclePhase,
  getAdaptiveScheduleStatus,
} from '@/lib/scraper/adaptiveScheduler';

describe('Smart Adaptive Scraper Scheduler', () => {
  it('detects morning peak hours correctly (e.g. 08:00)', () => {
    // 08:00 UTC+1 / Warsaw
    const morningDate = new Date('2026-09-03T08:00:00+02:00');
    const phase = getMarketCyclePhase(morningDate);
    expect(phase).toBe('MORNING_PEAK');

    const status = getAdaptiveScheduleStatus(null, morningDate);
    expect(status.intervalMinutes).toBe(10);
    expect(status.isPeakHour).toBe(true);
    expect(status.recommendedBatchLimit).toBeGreaterThanOrEqual(80);
  });

  it('detects afternoon peak hours correctly (e.g. 17:30)', () => {
    const afternoonDate = new Date('2026-09-03T17:30:00+02:00');
    const phase = getMarketCyclePhase(afternoonDate);
    expect(phase).toBe('AFTERNOON_PEAK');

    const status = getAdaptiveScheduleStatus(null, afternoonDate);
    expect(status.intervalMinutes).toBe(15);
    expect(status.isPeakHour).toBe(true);
  });

  it('detects dormant night hours correctly (e.g. 03:00)', () => {
    const nightDate = new Date('2026-09-03T03:00:00+02:00');
    const phase = getMarketCyclePhase(nightDate);
    expect(phase).toBe('NIGHT_DORMANT');

    const status = getAdaptiveScheduleStatus(null, nightDate);
    expect(status.intervalMinutes).toBe(120);
    expect(status.isPeakHour).toBe(false);
  });

  it('correctly decides shouldRunNow based on elapsed time since last run', () => {
    const now = new Date('2026-09-03T08:00:00+02:00'); // 10-minute interval

    // Ran 5 minutes ago -> should NOT run now
    const recentRun = new Date('2026-09-03T07:55:00+02:00');
    const statusTooSoon = getAdaptiveScheduleStatus(recentRun, now);
    expect(statusTooSoon.shouldRunNow).toBe(false);
    expect(statusTooSoon.nextRunInMinutes).toBeGreaterThanOrEqual(4);

    // Ran 15 minutes ago -> SHOULD run now
    const oldRun = new Date('2026-09-03T07:45:00+02:00');
    const statusReady = getAdaptiveScheduleStatus(oldRun, now);
    expect(statusReady.shouldRunNow).toBe(true);
    expect(statusReady.nextRunInMinutes).toBe(0);
  });
});
