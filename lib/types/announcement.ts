/**
 * Source portal identifiers for scraped advertisements.
 */
export type SourcePortal = 'olx' | 'oferteo' | 'fixly';

/**
 * Full announcement record stored in Firestore.
 * The document ID is the deduplication_key.
 */
export interface Announcement {
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
}

/**
 * Announcement with tier-based masking applied.
 * For free tier: source_url and contact_info are omitted,
 * descriptions over 100 chars are truncated.
 * For premium tier: all fields are present.
 */
export interface MaskedAnnouncement {
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
}
