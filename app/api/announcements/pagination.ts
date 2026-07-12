import type { PaginatedResponse } from '@/lib/types/api';

/**
 * Calculates pagination metadata for a paginated API response.
 *
 * @param totalCount - Total number of items matching the query
 * @param page - Current page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Pagination metadata object
 */
export function calculatePagination(
  totalCount: number,
  page: number,
  pageSize: number
): PaginatedResponse<never>['metadata'] {
  const total_pages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  return {
    total_count: totalCount,
    current_page: page,
    page_size: pageSize,
    total_pages,
  };
}
