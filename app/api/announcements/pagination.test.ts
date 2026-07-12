import { describe, it, expect } from 'vitest';
import { calculatePagination } from './pagination';

describe('calculatePagination', () => {
  it('calculates total_pages using Math.ceil', () => {
    const result = calculatePagination(101, 1, 20);
    expect(result.total_pages).toBe(6);
  });

  it('returns total_pages = 0 when totalCount is 0', () => {
    const result = calculatePagination(0, 1, 20);
    expect(result.total_pages).toBe(0);
    expect(result.total_count).toBe(0);
  });

  it('passes through current_page and page_size', () => {
    const result = calculatePagination(50, 3, 10);
    expect(result.current_page).toBe(3);
    expect(result.page_size).toBe(10);
  });

  it('handles exact division with no remainder', () => {
    const result = calculatePagination(100, 2, 20);
    expect(result.total_pages).toBe(5);
  });

  it('handles totalCount less than pageSize', () => {
    const result = calculatePagination(5, 1, 20);
    expect(result.total_pages).toBe(1);
  });

  it('handles pageSize of 1', () => {
    const result = calculatePagination(7, 4, 1);
    expect(result.total_pages).toBe(7);
    expect(result.current_page).toBe(4);
    expect(result.page_size).toBe(1);
  });

  it('handles totalCount equal to pageSize', () => {
    const result = calculatePagination(20, 1, 20);
    expect(result.total_pages).toBe(1);
  });

  it('returns all metadata fields correctly', () => {
    const result = calculatePagination(55, 2, 15);
    expect(result).toEqual({
      total_count: 55,
      current_page: 2,
      page_size: 15,
      total_pages: 4,
    });
  });
});
