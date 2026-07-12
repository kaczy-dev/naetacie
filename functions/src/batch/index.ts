/**
 * Batch write splitting utility for Firestore batch commits.
 * Firestore limits batch commits to 500 operations, so documents
 * must be split into groups of at most 500.
 */

const DEFAULT_MAX_BATCH_SIZE = 500;

/**
 * Splits an array of documents into batches of at most maxBatchSize items.
 * Preserves document order across batches.
 *
 * @param documents - Array of documents to split
 * @param maxBatchSize - Maximum number of documents per batch (default: 500)
 * @returns Array of batches, where each batch is an array of documents
 */
export function splitIntoBatches<T>(
  documents: T[],
  maxBatchSize: number = DEFAULT_MAX_BATCH_SIZE
): T[][] {
  if (documents.length === 0) {
    return [];
  }

  if (maxBatchSize < 1) {
    throw new Error('maxBatchSize must be at least 1');
  }

  const batches: T[][] = [];

  for (let i = 0; i < documents.length; i += maxBatchSize) {
    batches.push(documents.slice(i, i + maxBatchSize));
  }

  return batches;
}
