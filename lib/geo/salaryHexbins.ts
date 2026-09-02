/**
 * 3D Salary & Demand Hexbins for Szczecin Districts.
 * 
 * Aggregates spatial earnings benchmarks for 3D extrusion columns.
 * Column Height = Average Monthly Salary / Rate in PLN
 * Column Color = Job demand density index (0.0 to 1.0)
 */

export interface SalaryPillarGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      district: string;
      avgMonthlyPLN: number;
      avgHourlyPLN: number;
      jobCount: number;
      demandIndex: number;
      topTrade: string;
      color: string;
      extrusionHeight: number; // in meters for 3D fill-extrusion
    };
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
  }>;
}

export const SZCZECIN_DISTRICT_SALARY_PILLARS = [
  {
    district: 'Warszewo & Osów',
    center: [14.545, 53.465] as [number, number],
    avgMonthlyPLN: 9200,
    avgHourlyPLN: 52,
    jobCount: 42,
    demandIndex: 0.95,
    topTrade: 'Wykończenia wnętrz & Glazura',
    color: '#10b981', // Emerald high
    radiusKm: 1.2,
  },
  {
    district: 'Pogodno & Krzekowo',
    center: [14.521, 53.437] as [number, number],
    avgMonthlyPLN: 8800,
    avgHourlyPLN: 48,
    jobCount: 38,
    demandIndex: 0.88,
    topTrade: 'Elektryka & Inteligentne domy',
    color: '#059669',
    radiusKm: 1.1,
  },
  {
    district: 'Śródmieście & Turzyn',
    center: [14.5385, 53.4285] as [number, number],
    avgMonthlyPLN: 7600,
    avgHourlyPLN: 44,
    jobCount: 75,
    demandIndex: 0.92,
    topTrade: 'Remonty kamienic & Hydraulika',
    color: '#3b82f6',
    radiusKm: 1.3,
  },
  {
    district: 'Gumieńce & Mierzyn',
    center: [14.495, 53.402] as [number, number],
    avgMonthlyPLN: 8400,
    avgHourlyPLN: 46,
    jobCount: 31,
    demandIndex: 0.82,
    topTrade: 'Docieplenia & Elewacje',
    color: '#10b981',
    radiusKm: 1.2,
  },
  {
    district: 'Prawobrzeże (Dąbie, Słoneczne, Majowe)',
    center: [14.642, 53.385] as [number, number],
    avgMonthlyPLN: 7900,
    avgHourlyPLN: 45,
    jobCount: 54,
    demandIndex: 0.85,
    topTrade: 'Prace ogólnobudowlane & Murarstwo',
    color: '#f59e0b',
    radiusKm: 1.6,
  },
  {
    district: 'Police & Skolwin',
    center: [14.5692, 53.5413] as [number, number],
    avgMonthlyPLN: 8600,
    avgHourlyPLN: 49,
    jobCount: 28,
    demandIndex: 0.8,
    topTrade: 'Spawanie & Rurociągi przemysłowe',
    color: '#059669',
    radiusKm: 1.4,
  },
];

export function generateSalaryHexbinsGeoJSON(): SalaryPillarGeoJSON {
  const features = SZCZECIN_DISTRICT_SALARY_PILLARS.map((p) => {
    // Generate hexagonal geometry around center
    const points: number[][] = [];
    const hexSides = 6;
    const latRadius = p.radiusKm / 111.0;
    const lngRadius = p.radiusKm / 66.0;

    for (let i = 0; i <= hexSides; i++) {
      const angle = (i / hexSides) * 2 * Math.PI + Math.PI / 6;
      const lng = p.center[0] + lngRadius * Math.cos(angle);
      const lat = p.center[1] + latRadius * Math.sin(angle);
      points.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
    }

    // Extrusion height in meters (e.g. 9200 PLN -> 460m height column)
    const extrusionHeight = Math.round(p.avgMonthlyPLN * 0.06);

    return {
      type: 'Feature' as const,
      properties: {
        district: p.district,
        avgMonthlyPLN: p.avgMonthlyPLN,
        avgHourlyPLN: p.avgHourlyPLN,
        jobCount: p.jobCount,
        demandIndex: p.demandIndex,
        topTrade: p.topTrade,
        color: p.color,
        extrusionHeight,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [points],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
