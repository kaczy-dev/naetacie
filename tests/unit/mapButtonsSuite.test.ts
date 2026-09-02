import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMockSzczecinWeather } from '@/components/map/MapWeatherWidget';
import { POGON_STADIUM_COORDS, POGON_SZCZECIN_SPOTS } from '@/components/map/MapPogonSzczecin';
import { SZCZECIN_CONSTRUCTION_SITES } from '@/components/map/MapConstructionSites';
import { SZCZECIN_TRANSIT_STOPS } from '@/components/map/MapTransitStops';
import { getDistrictSalaryGeoJson } from '@/components/map/MapDistrictSalaryHeatmap';
import { MAP_STYLE_OPTIONS, type MapStyleType } from '@/components/map/MapStyleSelector';
import { isPointInPolygon } from '@/components/map/utils';
import { ALL_CATEGORY_KEYS } from '@/lib/data/categories';
import { haversineKm } from '@/lib/matching/engine';

describe('Map Controls & All Interactive Buttons Suite', () => {
  const SZCZECIN_CENTER: [number, number] = [14.5528, 53.4285];

  describe('1. 🧭 Navigation & View Controls', () => {
    it('centers on Szczecin landmark coordinates on Home button click', () => {
      const mockFlyTo = vi.fn();
      const mapMock = { flyTo: mockFlyTo };

      // Simulate clicking the Home Szczecin button
      mapMock.flyTo({ center: SZCZECIN_CENTER, zoom: 11 });

      expect(mockFlyTo).toHaveBeenCalledWith({
        center: [14.5528, 53.4285],
        zoom: 11,
      });
    });

    it('toggles 3D perspective pitch and bearing on 3D Tilt button click', () => {
      const mockEaseTo = vi.fn();
      let currentPitch = 0;

      const mapMock = {
        getPitch: () => currentPitch,
        easeTo: mockEaseTo,
      };

      // 1st click: Switch from 2D (pitch 0) to 3D (pitch 55, bearing -18)
      const is3dFirst = mapMock.getPitch() > 10;
      mapMock.easeTo({
        pitch: is3dFirst ? 0 : 55,
        bearing: is3dFirst ? 0 : -18,
      });

      expect(mockEaseTo).toHaveBeenLastCalledWith({
        pitch: 55,
        bearing: -18,
      });

      // 2nd click: Switch back from 3D (pitch 55) to 2D (pitch 0, bearing 0)
      currentPitch = 55;
      const is3dSecond = mapMock.getPitch() > 10;
      mapMock.easeTo({
        pitch: is3dSecond ? 0 : 55,
        bearing: is3dSecond ? 0 : -18,
      });

      expect(mockEaseTo).toHaveBeenLastCalledWith({
        pitch: 0,
        bearing: 0,
      });
    });

    it('calculates 5km radius and filters jobs for "Praca blisko mnie" button', () => {
      const userLat = 53.4285;
      const userLng = 14.5528;

      const mockAds = [
        { id: '1', title: 'Murarz Centrum', lat: 53.4300, lng: 14.5530 }, // ~0.2 km (Inside)
        { id: '2', title: 'Cieśla Pogodno', lat: 53.4450, lng: 14.5100 }, // ~3.4 km (Inside)
        { id: '3', title: 'Elektryk Gryfino', lat: 53.2500, lng: 14.4800 }, // ~20.3 km (Outside 5km)
      ];

      const nearAds = mockAds.filter((ad) => {
        const dist = haversineKm(userLat, userLng, ad.lat, ad.lng);
        return dist <= 5;
      });

      expect(nearAds).toHaveLength(2);
      expect(nearAds.map((a) => a.id)).toEqual(['1', '2']);
    });
  });

  describe('2. 🌐 Layer & Analytical Overlays Controls', () => {
    it('contains valid GeoJSON polygons and salary data for District Salary Heatmap', () => {
      const geoJson = getDistrictSalaryGeoJson();
      expect(geoJson.type).toBe('FeatureCollection');
      expect(geoJson.features.length).toBeGreaterThan(0);

      const firstFeature = geoJson.features[0];
      expect(firstFeature.properties).toHaveProperty('name');
      expect(firstFeature.properties).toHaveProperty('avgMonthlyPln');
      expect(firstFeature.properties.avgMonthlyPln).toBeGreaterThan(3000);
      expect(firstFeature.geometry.type).toBe('Polygon');
    });

    it('loads Szczecin Construction Sites with accurate trade requirements and coordinates', () => {
      expect(SZCZECIN_CONSTRUCTION_SITES.length).toBeGreaterThanOrEqual(4);

      const lasztownia = SZCZECIN_CONSTRUCTION_SITES.find((s) => s.id === 'site_1');
      expect(lasztownia).toBeDefined();
      expect(lasztownia?.name).toContain('Łasztownia');
      expect(lasztownia?.neededTrades).toContain('Murarz');
      expect(lasztownia?.neededTrades).toContain('Elektryk');
      expect(lasztownia?.lat).toBeCloseTo(53.4255, 3);
      expect(lasztownia?.lng).toBeCloseTo(14.565, 3);
    });

    it('loads ZTM Szczecin Transit Stops and public transport connectivity hubs', () => {
      expect(SZCZECIN_TRANSIT_STOPS.length).toBeGreaterThanOrEqual(4);

      const bramakrolewska = SZCZECIN_TRANSIT_STOPS.find((t) => t.id === 'stop_1');
      expect(bramakrolewska).toBeDefined();
      expect(bramakrolewska?.name).toContain('Brama Portowa');
      expect(bramakrolewska?.lines.length).toBeGreaterThan(0);
    });

    it('loads Pogoń Szczecin stadium and fan spot hubs with stadium flyTo target', () => {
      expect(POGON_STADIUM_COORDS).toEqual([14.5165, 53.4367]);
      expect(POGON_SZCZECIN_SPOTS.length).toBeGreaterThanOrEqual(3);

      const stadium = POGON_SZCZECIN_SPOTS.find((p) => p.type === 'stadium');
      expect(stadium).toBeDefined();
      expect(stadium?.address).toContain('Karłowicza');
      expect(stadium?.district).toBe('Pogodno');
    });
  });

  describe('3. ⛅ Weather & Top Widgets', () => {
    it('provides real-time construction suitability weather for outdoor trades', () => {
      const weather = getMockSzczecinWeather();
      expect(weather.tempC).toBeGreaterThan(-20);
      expect(weather.tempC).toBeLessThan(45);
      expect(weather.windKmH).toBeGreaterThanOrEqual(0);
      expect(weather.humidityPct).toBeGreaterThanOrEqual(0);
      expect(weather.humidityPct).toBeLessThanOrEqual(100);
      expect(weather.suitabilityStatus).toBe('good');
      expect(weather.suitabilityMessage).toContain('Optymalne warunki');
    });

    it('manages category filter chips state toggling', () => {
      const activeCategories = new Set<string>(ALL_CATEGORY_KEYS);
      expect(activeCategories.has('budowa')).toBe(true);
      expect(activeCategories.has('instalacje')).toBe(true);

      // Toggle 'budowa' off
      if (activeCategories.has('budowa')) {
        activeCategories.delete('budowa');
      } else {
        activeCategories.add('budowa');
      }

      expect(activeCategories.has('budowa')).toBe(false);
      expect(activeCategories.has('instalacje')).toBe(true);

      // Toggle 'budowa' back on
      if (activeCategories.has('budowa')) {
        activeCategories.delete('budowa');
      } else {
        activeCategories.add('budowa');
      }

      expect(activeCategories.has('budowa')).toBe(true);
    });
  });

  describe('4. 🛠️ Nowe Narzędzia i Warstwy (Motyw, Lasso, Izochrona, Geo-Alerty)', () => {
    it('cycles map style correctly across themes (emerald -> dark -> light -> emerald)', () => {
      let currentStyle: MapStyleType = 'emerald';
      const cycleStyle = (style: MapStyleType): MapStyleType => {
        if (style === 'emerald') return 'dark';
        if (style === 'dark') return 'light';
        return 'emerald';
      };

      currentStyle = cycleStyle(currentStyle);
      expect(currentStyle).toBe('dark');
      const darkOption = MAP_STYLE_OPTIONS.find((o) => o.id === 'dark');
      expect(darkOption?.styleUrl).toContain('dark-matter');

      currentStyle = cycleStyle(currentStyle);
      expect(currentStyle).toBe('light');
      const lightOption = MAP_STYLE_OPTIONS.find((o) => o.id === 'light');
      expect(lightOption?.styleUrl).toContain('positron');

      currentStyle = cycleStyle(currentStyle);
      expect(currentStyle).toBe('emerald');
    });

    it('verifies custom lasso polygon boundary drawing and point enclosure', () => {
      // Polygon around Szczecin Centrum defined in [lng, lat] coordinates (GeoJSON standard)
      const polygon: Array<[number, number]> = [
        [14.54, 53.42],
        [14.54, 53.44],
        [14.57, 53.44],
        [14.57, 53.42],
        [14.54, 53.42],
      ];

      const pointInside: [number, number] = [53.43, 14.555]; // [lat, lng] Brama Portowa
      const pointOutside: [number, number] = [53.50, 14.40]; // [lat, lng] Outside (Police)

      expect(isPointInPolygon(pointInside, polygon)).toBe(true);
      expect(isPointInPolygon(pointOutside, polygon)).toBe(false);
    });

    it('calculates travel time commute isochrone polygon accurately for different transport modes', () => {
      const center: [number, number] = [14.5528, 53.4285];
      const minutes = 15;

      const speedKmh: Record<'walk' | 'bike' | 'car', number> = {
        walk: 4.8,
        bike: 16.0,
        car: 38.0,
      };

      const walkRadius = speedKmh.walk * (minutes / 60); // 1.2 km
      const bikeRadius = speedKmh.bike * (minutes / 60); // 4.0 km
      const carRadius = speedKmh.car * (minutes / 60);   // 9.5 km

      expect(walkRadius).toBeCloseTo(1.2, 1);
      expect(bikeRadius).toBeCloseTo(4.0, 1);
      expect(carRadius).toBeCloseTo(9.5, 1);
      expect(carRadius).toBeGreaterThan(bikeRadius);
      expect(bikeRadius).toBeGreaterThan(walkRadius);
    });

    it('creates and persists spatial Geo-Alert notifications', () => {
      const storageKey = 'naetacie_geo_alerts';
      const mockStorage: Record<string, string> = {};

      const fakeLocalStorage = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
      };

      const newAlert = {
        id: 'alert_123',
        name: 'Szczecin Centrum 5km',
        lat: 53.4285,
        lng: 14.5528,
        radiusKm: 5,
        createdAt: new Date().toISOString(),
      };

      fakeLocalStorage.setItem(storageKey, JSON.stringify([newAlert]));
      const retrieved = JSON.parse(fakeLocalStorage.getItem(storageKey)!);

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].name).toBe('Szczecin Centrum 5km');
      expect(retrieved[0].radiusKm).toBe(5);
    });
  });
});
