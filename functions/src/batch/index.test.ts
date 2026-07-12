import { describe, it, expect } from 'vitest';
import { splitIntoBatches } from './index';

describe('splitIntoBatches', () => {
  it('returns empty array for empty input', () => {
    expect(splitIntoBatches([])).toEqual([]);
  });

  it('returns single batch when documents fit within maxBatchSize', () => {
    const docs = [1, 2, 3, 4, 5];
    const result = splitIntoBatches(docs, 500);
    expect(result).toEqual([[1, 2, 3, 4, 5]]);
  });

  it('splits into multiple batches when documents exceed maxBatchSize', () => {
    const docs = Array.from({ length: 1200 }, (_, i) => i);
    const result = splitIntoBatches(docs, 500);
    expect(result.length).toBe(3);
    expect(result[0].length).toBe(500);
    expect(result[1].length).toBe(500);
    expect(result[2].length).toBe(200);
  });

  it('uses default maxBatchSize of 500', () => {
    const docs = Array.from({ length: 501 }, (_, i) => i);
    const result = splitIntoBatches(docs);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(500);
    expect(result[1].length).toBe(1);
  });

  it('preserves document order across batches', () => {
    const docs = Array.from({ length: 10 }, (_, i) => i);
    const result = splitIntoBatches(docs, 3);
    const flattened = result.flat();
    expect(flattened).toEqual(docs);
  });

  it('handles exact multiple of maxBatchSize', () => {
    const docs = Array.from({ length: 1000 }, (_, i) => i);
    const result = splitIntoBatches(docs, 500);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(500);
    expect(result[1].length).toBe(500);
  });

  it('handles single document', () => {
    const result = splitIntoBatches(['a'], 500);
    expect(result).toEqual([['a']]);
  });

  it('throws error for maxBatchSize less than 1', () => {
    expect(() => splitIntoBatches([1, 2, 3], 0)).toThrow('maxBatchSize must be at least 1');
    expect(() => splitIntoBatches([1, 2, 3], -1)).toThrow('maxBatchSize must be at least 1');
  });

  it('works with generic types', () => {
    const docs = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }];
    const result = splitIntoBatches(docs, 2);
    expect(result).toEqual([
      [{ id: 1, name: 'a' }, { id: 2, name: 'b' }],
      [{ id: 3, name: 'c' }],
    ]);
  });
});
