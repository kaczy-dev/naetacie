/**
 * Canonical announcement shape used across the map and the list views.
 *
 * Different data sources (static seed data, the on-demand scraper, the
 * Firestore realtime listener) each have slightly different field names.
 * Normalizing everything into this one shape as early as possible is what
 * lets the map and the list share the exact same filtering/selection logic.
 */
export interface DisplayAnnouncement {
  id: string;
  title: string;
  description: string;
  source_url: string;
  source_portal: string;
  category: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  price: string | number | null;
  phone: string | null;
  scraped_at: Date;
  published_at: Date | null;
  company?: string | null;
  employment_type?: string | null;
  posted_days_ago?: number | null;
}
