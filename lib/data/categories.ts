/**
 * Shared category metadata used by both the map (marker colors/icons)
 * and the announcement list (badges/filter chips).
 *
 * Having a single source of truth here is what makes the map and the
 * list feel like one integrated feature instead of two separate views:
 * the same color, the same icon, and the same filter state everywhere.
 */

export type CategoryKey = 'budowa' | 'remont' | 'instalacje' | 'wykończenia';

export interface CategoryMeta {
  color: string;
  icon: string;
  label: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  budowa: { color: '#dc2626', icon: '🏗️', label: 'Budowa' },
  remont: { color: '#2563eb', icon: '🔨', label: 'Remont' },
  instalacje: { color: '#16a34a', icon: '⚡', label: 'Instalacje' },
  'wykończenia': { color: '#9333ea', icon: '🎨', label: 'Wykończenia' },
};

export const ALL_CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

/**
 * Normalizes raw category strings coming from different data sources
 * (seed data, scraper output, Firestore) into one of the canonical keys.
 */
export function normalizeCategory(raw: string | undefined | null): CategoryKey {
  if (!raw) return 'remont';
  if (raw === 'budowa-remont') return 'remont';
  if (raw in CATEGORIES) return raw as CategoryKey;
  return 'remont';
}

export function getCategoryMeta(raw: string | undefined | null): CategoryMeta {
  return CATEGORIES[normalizeCategory(raw)];
}
