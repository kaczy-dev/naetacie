import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildNominatimQuery, NominatimRateLimiter } from './nominatim';

describe('buildNominatimQuery', () => {
  it('appends ", Szczecin, Poland" to the input text', () => {
    expect(buildNominatimQuery('ul. Mickiewicza 5')).toBe(
      'ul. Mickiewicza 5, Szczecin, Poland'
    );
  });

  it('works with single word input', () => {
    expect(buildNominatimQuery('Dąbie')).toBe('Dąbie, Szczecin, Poland');
  });

  it('preserves the input text exactly', () => {
    const input = 'Some Location With Spaces';
    expect(buildNominatimQuery(input)).toBe(`${input}, Szczecin, Poland`);
  });
});

describe('NominatimRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('waitForSlot', () => {
    it('does not wait on first call', async () => {
      const limiter = new NominatimRateLimiter(1000);
      const start = Date.now();

      const waitPromise = limiter.waitForSlot();
      await vi.runAllTimersAsync();
      await waitPromise;

      // No delay on first call since lastRequestTime is 0
      expect(Date.now() - start).toBeLessThan(1000);
    });
  });

  describe('query', () => {
    it('returns lat/lng on successful response', async () => {
      const mockResponse = [{ lat: '53.4285', lon: '14.5528' }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const limiter = new NominatimRateLimiter(1000);
      const result = await limiter.query('ul. Mickiewicza 5');

      expect(result).toEqual({ lat: 53.4285, lng: 14.5528 });
    });

    it('returns null when response is empty array', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const limiter = new NominatimRateLimiter(1000);
      const result = await limiter.query('nonexistent place');

      expect(result).toBeNull();
    });

    it('returns null on HTTP error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const limiter = new NominatimRateLimiter(1000);
      const result = await limiter.query('some place');

      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const limiter = new NominatimRateLimiter(1000);
      const result = await limiter.query('some place');

      expect(result).toBeNull();
    });

    it('returns null when lat/lon are not parseable', async () => {
      const mockResponse = [{ lat: 'invalid', lon: 'invalid' }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const limiter = new NominatimRateLimiter(1000);
      const result = await limiter.query('some place');

      expect(result).toBeNull();
    });

    it('calls Nominatim with correct URL and query format', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: '53.0', lon: '14.0' }],
      });

      const limiter = new NominatimRateLimiter(1000);
      await limiter.query('Dąbie');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent('Dąbie, Szczecin, Poland')}&format=json&limit=1`
        ),
        expect.objectContaining({
          headers: { 'User-Agent': 'ConstructionAdsAggregator/1.0' },
        })
      );
    });

    it('respects rate limiting between consecutive requests', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => [{ lat: '53.0', lon: '14.0' }],
      });

      const limiter = new NominatimRateLimiter(1000);

      // First request - should go through immediately
      await limiter.query('place 1');

      // Second request - should be delayed
      const queryPromise = limiter.query('place 2');

      // Advance timers to let the rate limiter wait
      await vi.advanceTimersByTimeAsync(1000);
      await queryPromise;

      // Both calls should have been made
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
