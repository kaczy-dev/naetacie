import type { BoundingBox } from './geo';
import type { SourcePortal } from './announcement';

/**
 * Validated query parameters for the announcements API endpoint.
 */
export interface AnnouncementQueryParams {
  /** Page number, minimum 1. */
  page: number;
  /** Items per page, 1-100, default 20. */
  limit: number;
  /** Optional filter by source portal. */
  source_portal?: SourcePortal;
  /** Optional spatial filter. */
  bounding_box?: BoundingBox;
}

/**
 * Generic paginated response wrapper for API endpoints.
 */
export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    total_count: number;
    current_page: number;
    page_size: number;
    total_pages: number;
  };
}
