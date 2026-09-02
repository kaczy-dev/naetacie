/**
 * Scraper Selector Drift & Health Telemetry Engine.
 * Detects when source portals (OLX, Oferteo, Fixly) alter their DOM or CSS classes.
 */

export interface ScrapedAdTelemetryItem {
  title?: string | null;
  price?: number | null;
  locationText?: string | null;
  sourceUrl?: string | null;
}

export interface SelectorHealthReport {
  portal: string;
  totalCards: number;
  validCards: number;
  emptyTitleRate: number; // 0.0 to 1.0
  emptyLocationRate: number;
  isDriftDetected: boolean;
  alertMessage?: string;
}

const DRIFT_FAILURE_THRESHOLD = 0.15; // 15% failure rate signals DOM drift

/**
 * Analyzes scraper batch metrics to detect selector breakage or DOM changes.
 */
export function analyzeSelectorHealth(
  portal: string,
  items: ScrapedAdTelemetryItem[]
): SelectorHealthReport {
  if (items.length === 0) {
    return {
      portal,
      totalCards: 0,
      validCards: 0,
      emptyTitleRate: 1.0,
      emptyLocationRate: 1.0,
      isDriftDetected: true,
      alertMessage: `Portal ${portal} returned 0 cards — possible selector breakdown or IP block.`,
    };
  }

  let emptyTitles = 0;
  let emptyLocations = 0;
  let validCount = 0;

  for (const item of items) {
    const hasTitle = Boolean(item.title && item.title.trim().length > 0);
    const hasLocation = Boolean(item.locationText && item.locationText.trim().length > 0);

    if (!hasTitle) emptyTitles++;
    if (!hasLocation) emptyLocations++;
    if (hasTitle && hasLocation) validCount++;
  }

  const emptyTitleRate = emptyTitles / items.length;
  const emptyLocationRate = emptyLocations / items.length;

  const isDrift =
    emptyTitleRate > DRIFT_FAILURE_THRESHOLD ||
    emptyLocationRate > DRIFT_FAILURE_THRESHOLD;

  let alertMessage: string | undefined;
  if (isDrift) {
    alertMessage = `CRITICAL: Selector drift detected on portal ${portal}. Empty titles: ${(
      emptyTitleRate * 100
    ).toFixed(1)}%, Empty locations: ${(emptyLocationRate * 100).toFixed(1)}%. Inspect CSS selectors.`;
  }

  return {
    portal,
    totalCards: items.length,
    validCards: validCount,
    emptyTitleRate,
    emptyLocationRate,
    isDriftDetected: isDrift,
    alertMessage,
  };
}
