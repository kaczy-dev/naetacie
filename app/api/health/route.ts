import { NextResponse } from 'next/server';
import { SZCZECIN_OSIEDLA } from '@/lib/geo/szczecinMicroDistricts';
import { SZCZECIN_MEGA_PROJECTS } from '@/lib/geo/szczecinMegaProjects';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const now = new Date();
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: now.toISOString(),
    localTimePl: now.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }),
    version: '3.0.0',
    services: {
      api: 'operational',
      scraperSubsystem: {
        status: 'operational',
        supportedPortals: [
          'olx',
          'pracuj',
          'indeed',
          'jooble',
          'gowork',
          'oferteo',
          'fixly',
          'bip_szczecin',
        ],
      },
      geoEngine: {
        status: 'operational',
        officialDistrictsCount: SZCZECIN_OSIEDLA.length,
        megaProjectsCount: SZCZECIN_MEGA_PROJECTS.length,
      },
    },
  });
}
