import { describe, it, expect } from 'vitest';
import { validateQueryParams } from './validate';

describe('validateQueryParams', () => {
  describe('defaults', () => {
    it('returns defaults when no params provided', () => {
      const result = validateQueryParams({});
      expect(result).toEqual({
        valid: true,
        parsed: { page: 1, limit: 20 },
      });
    });

    it('returns defaults for empty string values', () => {
      const result = validateQueryParams({ page: '', limit: '' });
      expect(result).toEqual({
        valid: true,
        parsed: { page: 1, limit: 20 },
      });
    });
  });

  describe('page validation', () => {
    it('accepts valid page number', () => {
      const result = validateQueryParams({ page: '3' });
      expect(result).toEqual({ valid: true, parsed: { page: 3, limit: 20 } });
    });

    it('rejects page < 1', () => {
      const result = validateQueryParams({ page: '0' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: page must be an integer >= 1',
      });
    });

    it('rejects negative page', () => {
      const result = validateQueryParams({ page: '-1' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: page must be an integer >= 1',
      });
    });

    it('rejects non-integer page', () => {
      const result = validateQueryParams({ page: '1.5' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: page must be an integer >= 1',
      });
    });

    it('rejects non-numeric page', () => {
      const result = validateQueryParams({ page: 'abc' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: page must be an integer >= 1',
      });
    });
  });

  describe('limit validation', () => {
    it('accepts valid limit', () => {
      const result = validateQueryParams({ limit: '50' });
      expect(result).toEqual({ valid: true, parsed: { page: 1, limit: 50 } });
    });

    it('accepts limit of 1', () => {
      const result = validateQueryParams({ limit: '1' });
      expect(result).toEqual({ valid: true, parsed: { page: 1, limit: 1 } });
    });

    it('accepts limit of 100', () => {
      const result = validateQueryParams({ limit: '100' });
      expect(result).toEqual({ valid: true, parsed: { page: 1, limit: 100 } });
    });

    it('rejects limit < 1', () => {
      const result = validateQueryParams({ limit: '0' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: limit must be an integer between 1 and 100',
      });
    });

    it('rejects limit > 100', () => {
      const result = validateQueryParams({ limit: '101' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: limit must be an integer between 1 and 100',
      });
    });

    it('rejects non-integer limit', () => {
      const result = validateQueryParams({ limit: '20.5' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: limit must be an integer between 1 and 100',
      });
    });
  });

  describe('source_portal validation', () => {
    it('accepts olx', () => {
      const result = validateQueryParams({ source_portal: 'olx' });
      expect(result).toEqual({
        valid: true,
        parsed: { page: 1, limit: 20, source_portal: 'olx' },
      });
    });

    it('accepts oferteo', () => {
      const result = validateQueryParams({ source_portal: 'oferteo' });
      expect(result).toEqual({
        valid: true,
        parsed: { page: 1, limit: 20, source_portal: 'oferteo' },
      });
    });

    it('accepts fixly', () => {
      const result = validateQueryParams({ source_portal: 'fixly' });
      expect(result).toEqual({
        valid: true,
        parsed: { page: 1, limit: 20, source_portal: 'fixly' },
      });
    });

    it('rejects invalid portal', () => {
      const result = validateQueryParams({ source_portal: 'unknown' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: source_portal must be one of olx, oferteo, fixly',
      });
    });

    it('ignores empty source_portal', () => {
      const result = validateQueryParams({ source_portal: '' });
      expect(result).toEqual({ valid: true, parsed: { page: 1, limit: 20 } });
    });
  });

  describe('bounding_box validation', () => {
    it('accepts valid bounding box', () => {
      const result = validateQueryParams({ bounding_box: '53.0,14.0,54.0,15.0' });
      expect(result).toEqual({
        valid: true,
        parsed: {
          page: 1,
          limit: 20,
          bounding_box: { south_lat: 53.0, west_lng: 14.0, north_lat: 54.0, east_lng: 15.0 },
        },
      });
    });

    it('accepts bounding box with negative values', () => {
      const result = validateQueryParams({ bounding_box: '-10.5,-20.3,10.5,20.3' });
      expect(result).toEqual({
        valid: true,
        parsed: {
          page: 1,
          limit: 20,
          bounding_box: { south_lat: -10.5, west_lng: -20.3, north_lat: 10.5, east_lng: 20.3 },
        },
      });
    });

    it('accepts bounding box with spaces around commas', () => {
      const result = validateQueryParams({ bounding_box: '53.0, 14.0, 54.0, 15.0' });
      expect(result).toEqual({
        valid: true,
        parsed: {
          page: 1,
          limit: 20,
          bounding_box: { south_lat: 53.0, west_lng: 14.0, north_lat: 54.0, east_lng: 15.0 },
        },
      });
    });

    it('rejects bounding box with fewer than 4 values', () => {
      const result = validateQueryParams({ bounding_box: '53.0,14.0,54.0' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: bounding_box must be exactly 4 comma-separated decimal values',
      });
    });

    it('rejects bounding box with more than 4 values', () => {
      const result = validateQueryParams({ bounding_box: '53.0,14.0,54.0,15.0,16.0' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: bounding_box must be exactly 4 comma-separated decimal values',
      });
    });

    it('rejects bounding box with non-numeric values', () => {
      const result = validateQueryParams({ bounding_box: '53.0,abc,54.0,15.0' });
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: bounding_box must contain only numeric values',
      });
    });

    it('ignores empty bounding_box', () => {
      const result = validateQueryParams({ bounding_box: '' });
      expect(result).toEqual({ valid: true, parsed: { page: 1, limit: 20 } });
    });
  });

  describe('combined parameters', () => {
    it('parses all valid params together', () => {
      const result = validateQueryParams({
        page: '2',
        limit: '50',
        source_portal: 'olx',
        bounding_box: '53.0,14.0,54.0,15.0',
      });
      expect(result).toEqual({
        valid: true,
        parsed: {
          page: 2,
          limit: 50,
          source_portal: 'olx',
          bounding_box: { south_lat: 53.0, west_lng: 14.0, north_lat: 54.0, east_lng: 15.0 },
        },
      });
    });

    it('returns first validation error encountered', () => {
      const result = validateQueryParams({
        page: '0',
        limit: '200',
      });
      // page is validated first
      expect(result).toEqual({
        valid: false,
        error: 'Invalid parameter: page must be an integer >= 1',
      });
    });
  });
});
