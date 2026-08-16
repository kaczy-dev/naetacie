/**
 * Scraper Run Logger — Health Dashboard Data Collection.
 * Records metadata about each scraper execution for monitoring,
 * debugging, and the SystemHealthBadge component.
 */

import { adminFirestore } from '@/lib/firebase/admin';

export interface PortalRunResult {
  portal: string;
  adsFound: number;
  adsNew: number;
  adsDuplicated: number;
  adsFilteredFraud: number;
  errors: string[];
  responseTimeMs: number;
}

export interface ScraperRunLog {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  trigger: 'on-demand' | 'cron' | 'manual';
  portalResults: PortalRunResult[];
  totalFirestoreWrites: number;
  totalAdsScraped: number;
  totalNewAds: number;
  queries: string[];
}

/**
 * Generates a unique run ID based on timestamp.
 */
export function generateRunId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).substring(2, 6);
  return `run-${ts}-${rand}`;
}

/**
 * Logs a scraper run summary to Firestore `scraper_runs` collection.
 * Best-effort write — failures are logged but don't propagate.
 */
export async function logScraperRun(run: ScraperRunLog): Promise<void> {
  try {
    const docRef = adminFirestore.collection('scraper_runs').doc(run.runId);
    await Promise.race([
      docRef.set({
        ...run,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        durationMs: run.completedAt.getTime() - run.startedAt.getTime(),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('scraper-run-log-timeout')), 3000)
      ),
    ]);
  } catch (e) {
    console.warn('Failed to log scraper run (non-fatal):', (e as Error).message);
  }
}

/**
 * Retrieves the last N scraper run logs, newest first.
 */
export async function getRecentRuns(limit = 10): Promise<ScraperRunLog[]> {
  try {
    const snapshot = await adminFirestore
      .collection('scraper_runs')
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as ScraperRunLog);
  } catch {
    return [];
  }
}
