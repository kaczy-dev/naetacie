/**
 * Stagger animation delay utilities for list item entrance animations.
 *
 * Each card in a list gets a progressively larger entrance animation delay
 * to create a staggered appearance effect (Requirement 14.3).
 */

/** Default stagger delay between consecutive items in milliseconds */
export const STAGGER_DELAY_MS = 50;

/**
 * Compute the entrance animation delay for a card at a given index.
 *
 * @param index - Zero-based index of the card in the list (non-negative integer)
 * @returns Delay in milliseconds (index * 50ms)
 */
export function getStaggerDelay(index: number): number {
  return index * STAGGER_DELAY_MS;
}
