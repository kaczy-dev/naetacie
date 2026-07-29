/**
 * Szczecin District Salary Heatmap Overlay Data.
 * GeoJSON polygon zones with average monthly construction salaries per district.
 */

export interface DistrictSalaryZone {
  id: string;
  name: string;
  avgMonthlyPln: number;
  color: string;
  coordinates: [number, number][];
}

export const SZCZECIN_DISTRICT_ZONES: DistrictSalaryZone[] = [
  {
    id: 'gumience',
    name: 'Gumieńce',
    avgMonthlyPln: 7800,
    color: '#10b981',
    coordinates: [
      [14.48, 53.38],
      [14.52, 53.38],
      [14.52, 53.41],
      [14.48, 53.41],
      [14.48, 53.38],
    ],
  },
  {
    id: 'prawobrzeze',
    name: 'Prawobrzeże / Dąbie',
    avgMonthlyPln: 8400,
    color: '#059669',
    coordinates: [
      [14.58, 53.38],
      [14.66, 53.38],
      [14.66, 53.45],
      [14.58, 53.45],
      [14.58, 53.38],
    ],
  },
  {
    id: 'centrum',
    name: 'Centrum / Śródmieście',
    avgMonthlyPln: 7500,
    color: '#3b82f6',
    coordinates: [
      [14.53, 53.41],
      [14.57, 53.41],
      [14.57, 53.44],
      [14.53, 53.44],
      [14.53, 53.41],
    ],
  },
  {
    id: 'police',
    name: 'Police / Północ',
    avgMonthlyPln: 7200,
    color: '#f59e0b',
    coordinates: [
      [14.52, 53.51],
      [14.60, 53.51],
      [14.60, 53.58],
      [14.52, 53.58],
      [14.52, 53.51],
    ],
  },
  {
    id: 'goleniow',
    name: 'Strefa Goleniów',
    avgMonthlyPln: 9100,
    color: '#10b981',
    coordinates: [
      [14.78, 53.52],
      [14.88, 53.52],
      [14.88, 53.60],
      [14.78, 53.60],
      [14.78, 53.52],
    ],
  },
];

export function getDistrictSalaryGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: SZCZECIN_DISTRICT_ZONES.map((z) => ({
      type: 'Feature',
      properties: {
        id: z.id,
        name: z.name,
        avgMonthlyPln: z.avgMonthlyPln,
        color: z.color,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [z.coordinates],
      },
    })),
  };
}
