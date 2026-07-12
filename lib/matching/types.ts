/**
 * Types for the job matching engine.
 *
 * The matcher scores each announcement against a user's preferences and
 * returns a 0-100 relevance score plus the reasons behind it, so the UI
 * can show "Dopasowanie 87% — pasuje: lokalizacja, wynagrodzenie".
 */

import type { CategoryKey } from '@/lib/data/categories';

/** User-defined job search preferences (persisted in localStorage). */
export interface JobPreferences {
  /** Categories the user is interested in (empty = all) */
  categories: CategoryKey[];
  /** Free-text keywords/skills, e.g. ["spawacz", "mig", "uprawnienia"] */
  keywords: string[];
  /** Minimum acceptable monthly salary in PLN (null = no minimum) */
  minSalary: number | null;
  /** Preferred employment types, e.g. ["Umowa o pracę"] (empty = any) */
  employmentTypes: string[];
  /** Home location used for distance scoring */
  homeLat: number | null;
  homeLng: number | null;
  /** Maximum acceptable commute distance in km (null = any) */
  maxDistanceKm: number | null;
}

/** A single reason contributing to (or against) a match. */
export interface MatchReason {
  label: string;
  positive: boolean;
  /** Points this reason contributed to the total score */
  weight: number;
}

/** Result of scoring one announcement against preferences. */
export interface MatchResult {
  /** 0-100 relevance score */
  score: number;
  reasons: MatchReason[];
  distanceKm: number | null;
}

export const DEFAULT_PREFERENCES: JobPreferences = {
  categories: [],
  keywords: [],
  minSalary: null,
  employmentTypes: [],
  homeLat: null,
  homeLng: null,
  maxDistanceKm: null,
};
