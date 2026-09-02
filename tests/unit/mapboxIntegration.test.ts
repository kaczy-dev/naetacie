import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MapboxClient, defaultMapboxClient, SZCZECIN_BBOX } from '@/lib/geo/mapboxClient';
import { GET as geocodeHandler } from '@/app/api/geo/geocode/route';
import { GET as isochroneHandler } from '@/app/api/geo/isochrone/route';

describe('Mapbox Geospatial & MCP Integration Layer', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('MapboxClient', () => {
    it('verifies configuration token correctly', () => {
      const emptyClient = new MapboxClient('');
      expect(emptyClient.isConfigured()).toBe(false);

      const invalidClient = new MapboxClient('sk.secret-token');
      expect(invalidClient.isConfigured()).toBe(false);

      const validClient = new MapboxClient('pk.eyJ1IjoibXktdXNlciJ9.12345');
      expect(validClient.isConfigured()).toBe(true);
    });

    it('performs forward geocoding with Szczecin bounding box and Polish language', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [
            {
              center: [14.5123, 53.4391],
              place_name_pl: 'ul. Karłowicza 28, Szczecin, Polska',
              text: 'Karłowicza',
              address: '28',
              relevance: 0.99,
              context: [
                { id: 'neighborhood.1', text: 'Pogodno' },
                { id: 'postcode.1', text: '71-102' },
              ],
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const client = new MapboxClient('pk.valid-token');
      const results = await client.forwardGeocode('Karłowicza 28 Szczecin');

      expect(results).toHaveLength(1);
      const res = results[0];
      expect(res.lng).toBe(14.5123);
      expect(res.lat).toBe(53.4391);
      expect(res.district).toBe('Pogodno');
      expect(res.street).toBe('Karłowicza');
      expect(res.postcode).toBe('71-102');

      const [calledUrl] = mockFetch.mock.calls[0];
      expect(calledUrl).toContain('bbox=' + encodeURIComponent(SZCZECIN_BBOX.join(',')));
      expect(calledUrl).toContain('country=pl');
      expect(calledUrl).toContain('language=pl');
    });

    it('performs reverse geocoding to human readable address', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [
            {
              place_name_pl: 'Brama Portowa 1, Szczecin',
              text: 'Brama Portowa',
              address: '1',
              relevance: 1.0,
              context: [{ id: 'locality.1', text: 'Centrum' }],
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const client = new MapboxClient('pk.valid-token');
      const rev = await client.reverseGeocode(14.5528, 53.4285);

      expect(rev).not.toBeNull();
      expect(rev?.placeName).toContain('Brama Portowa');
      expect(rev?.district).toBe('Centrum');
    });

    it('fetches travel-time isochrones with accurate parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { contour: 15 },
              geometry: { type: 'Polygon', coordinates: [] },
            },
            {
              type: 'Feature',
              properties: { contour: 30 },
              geometry: { type: 'Polygon', coordinates: [] },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const client = new MapboxClient('pk.valid-token');
      const isochrone = await client.getIsochrone([14.5528, 53.4285], {
        contoursMinutes: [15, 30],
        profile: 'driving',
      });

      expect(isochrone.type).toBe('FeatureCollection');
      expect(isochrone.features).toHaveLength(2);

      const [calledUrl] = mockFetch.mock.calls[0];
      expect(calledUrl).toContain('/isochrone/v1/mapbox/driving/14.5528,53.4285');
      expect(calledUrl).toContain('contours_minutes=15%2C30');
    });

    it('calculates route distance and duration using Directions API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 8500, // 8.5 km
              duration: 720,  // 12 min
              geometry: { type: 'LineString', coordinates: [] },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const client = new MapboxClient('pk.valid-token');
      const route = await client.getRoute([14.50, 53.40], [14.60, 53.45]);

      expect(route).not.toBeNull();
      expect(route?.distanceKm).toBe(8.5);
      expect(route?.durationMinutes).toBe(12);
    });

    it('provides known construction stores in Szczecin (Castorama, Leroy Merlin, hurtownie)', async () => {
      const client = new MapboxClient('');
      const suppliers = await client.searchBuildingSuppliers();

      expect(suppliers.length).toBeGreaterThanOrEqual(5);
      const casto = suppliers.find((s) => s.brand === 'Castorama');
      const leroy = suppliers.find((s) => s.brand === 'Leroy Merlin');
      expect(casto).toBeDefined();
      expect(leroy).toBeDefined();
    });
  });

  describe('Geocoding API Route (/api/geo/geocode)', () => {
    it('returns 400 when missing query parameter q', async () => {
      const req = new Request('http://localhost:3000/api/geo/geocode');
      const res = await geocodeHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('returns geocoded coordinates for valid query', async () => {
      const req = new Request('http://localhost:3000/api/geo/geocode?q=Gumience');
      const res = await geocodeHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0]).toHaveProperty('lat');
      expect(json.data[0]).toHaveProperty('lng');
    });
  });

  describe('Isochrone API Route (/api/geo/isochrone)', () => {
    it('returns commute isochrone polygon GeoJSON', async () => {
      const req = new Request('http://localhost:3000/api/geo/isochrone?lng=14.5528&lat=53.4285&minutes=15,30');
      const res = await isochroneHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('type', 'FeatureCollection');
      expect(json.data.features.length).toBeGreaterThan(0);
    });
  });
});
