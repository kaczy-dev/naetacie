import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('System Healthcheck API Endpoint', () => {
  it('returns healthy status with system telemetry', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('healthy');
    expect(json.version).toBe('3.0.0');
    expect(json.services.api).toBe('operational');
    expect(json.services.scraperSubsystem.supportedPortals).toContain('olx');
    expect(json.services.geoEngine.officialDistrictsCount).toBe(37);
    expect(json.services.geoEngine.megaProjectsCount).toBeGreaterThanOrEqual(8);
  });
});
