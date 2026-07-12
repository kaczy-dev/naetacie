/**
 * Predefined User-Agent strings for rotation during scraping.
 * At least 5 entries are required per ScraperConfig contract.
 */
export const USER_AGENTS: string[] = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

/**
 * Index tracking the last returned User-Agent for round-robin rotation.
 * Ensures a different UA is selected on each call.
 */
let currentIndex = 0;

/**
 * Returns the next User-Agent string in a round-robin fashion,
 * guaranteeing a different value on each consecutive call.
 */
export function getNextUserAgent(agents: string[] = USER_AGENTS): string {
  if (agents.length === 0) {
    throw new Error('User-Agent list must not be empty');
  }
  const agent = agents[currentIndex % agents.length];
  currentIndex = (currentIndex + 1) % agents.length;
  return agent;
}

/**
 * Resets the rotation index. Useful for testing.
 */
export function resetUserAgentRotation(): void {
  currentIndex = 0;
}
