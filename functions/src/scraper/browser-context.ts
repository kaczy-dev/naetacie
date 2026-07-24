/**
 * Stealth Browser Context Factory & Resource Router.
 *
 * Creates isolated Browser Contexts with matched User-Agent & Client Hints,
 * and sets up network routing to block heavy media, fonts, images, and trackers
 * to optimize Cloud Function execution speed and memory usage.
 */

export interface BrowserContextOptions {
  userAgent: string;
  viewport?: { width: number; height: number };
  locale?: string;
  blockResources?: boolean;
}

/** Domains to block during scraping (analytics, trackers, ad servers) */
export const BLOCKED_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.net',
  'facebook.com/tr',
  'hotjar.com',
  'doubleclick.net',
  'clarity.ms',
  'criteo.com',
  'scorecardresearch.com',
];

/** Resource types to block to save CPU and bandwidth */
export const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet', 'other']);

/**
 * Configure request interception on a Playwright page or context.
 */
export async function configureResourceBlocking(pageOrContext: {
  route(url: string | RegExp, handler: (route: { abort(): Promise<void>; continue(): Promise<void> }, request: { resourceType(): string; url(): string }) => void): Promise<void>;
}): Promise<void> {
  await pageOrContext.route('**/*', (route, request) => {
    const resourceType = request.resourceType();
    const url = request.url().toLowerCase();

    // Block non-essential heavy resources
    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      route.abort().catch(() => {});
      return;
    }

    // Block tracking & ad domains
    if (BLOCKED_DOMAINS.some((domain) => url.includes(domain))) {
      route.abort().catch(() => {});
      return;
    }

    route.continue().catch(() => {});
  });
}
