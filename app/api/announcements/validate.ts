import type { AnnouncementQueryParams } from '@/lib/types/api';
import type { SourcePortal } from '@/lib/types/announcement';

const VALID_SOURCE_PORTALS: SourcePortal[] = ['olx', 'oferteo', 'fixly'];

/**
 * Validates and parses query parameters for the announcements API endpoint.
 * Returns parsed params on success or an error description on failure.
 */
export function validateQueryParams(
  params: Record<string, string>
):
  | { valid: true; parsed: AnnouncementQueryParams }
  | { valid: false; error: string } {
  // Parse page (default: 1)
  let page = 1;
  if (params.page !== undefined && params.page !== '') {
    const parsed = Number(params.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { valid: false, error: 'Invalid parameter: page must be an integer >= 1' };
    }
    page = parsed;
  }

  // Parse limit (default: 20)
  let limit = 20;
  if (params.limit !== undefined && params.limit !== '') {
    const parsed = Number(params.limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      return {
        valid: false,
        error: 'Invalid parameter: limit must be an integer between 1 and 100',
      };
    }
    limit = parsed;
  }

  // Parse source_portal (optional)
  let source_portal: SourcePortal | undefined;
  if (params.source_portal !== undefined && params.source_portal !== '') {
    if (!VALID_SOURCE_PORTALS.includes(params.source_portal as SourcePortal)) {
      return {
        valid: false,
        error: 'Invalid parameter: source_portal must be one of olx, oferteo, fixly',
      };
    }
    source_portal = params.source_portal as SourcePortal;
  }

  // Parse bounding_box (optional, format: "south_lat,west_lng,north_lat,east_lng")
  let bounding_box: AnnouncementQueryParams['bounding_box'];
  if (params.bounding_box !== undefined && params.bounding_box !== '') {
    const parts = params.bounding_box.split(',');
    if (parts.length !== 4) {
      return {
        valid: false,
        error: 'Invalid parameter: bounding_box must be exactly 4 comma-separated decimal values',
      };
    }

    const numbers = parts.map((p) => Number(p.trim()));
    if (numbers.some((n) => isNaN(n))) {
      return {
        valid: false,
        error: 'Invalid parameter: bounding_box must contain only numeric values',
      };
    }

    const [south_lat, west_lng, north_lat, east_lng] = numbers;
    bounding_box = { south_lat, west_lng, north_lat, east_lng };
  }

  const parsed: AnnouncementQueryParams = { page, limit };
  if (source_portal !== undefined) {
    parsed.source_portal = source_portal;
  }
  if (bounding_box !== undefined) {
    parsed.bounding_box = bounding_box;
  }

  return { valid: true, parsed };
}
