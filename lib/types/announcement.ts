/**
 * Source portal identifiers for scraped advertisements.
 */
export type SourcePortal = 'olx' | 'oferteo' | 'fixly' | 'pracuj' | 'indeed' | 'gowork' | 'jooble';

/**
 * Full announcement record stored in Firestore.
 * The document ID is the deduplication_key.
 */
export interface Announcement {
  id?: string;
  deduplication_key: string;
  title: string;
  description: string;
  source_url: string;
  source_portal: SourcePortal;
  category: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  contact_info: string | null;
  scraped_at: Date;
  published_at: Date | null;
  company?: string | null;
  employment_type?: string | null;
  posted_days_ago?: number | null;
  traits?: import('@/lib/ai/freeJobExtractor').ExtractedJobTraits;
}

/**
 * Announcement with tier-based masking applied.
 * For free tier: source_url and contact_info are omitted,
 * descriptions over 100 chars are truncated.
 * For premium tier: all fields are present.
 */
export interface MaskedAnnouncement {
  id?: string;
  deduplication_key: string;
  title: string;
  description: string;
  source_portal: SourcePortal;
  category: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  scraped_at: Date;
  published_at: Date | null;
  source_url?: string;
  contact_info?: string | null;
  company?: string | null;
  employment_type?: string | null;
  posted_days_ago?: number | null;
  traits?: import('@/lib/ai/freeJobExtractor').ExtractedJobTraits;
}

/**
 * Raw ad data extracted from a source portal before deduplication and geocoding.
 */
export interface ScrapedAd {
  nativeId: string | null;
  title: string;
  description: string;
  sourceUrl: string;
  sourcePortal: SourcePortal;
  category: string;
  locationText: string;
  price: number | null;
  contactInfo: string | null;
  publishedAt: Date | null;
  company?: string | null;
}
