'use client';

import type { MaskedAnnouncement } from '@/lib/types/announcement';

export interface AnnouncementDetailProps {
  announcement: MaskedAnnouncement | null;
  tier: 'free' | 'premium';
  onUpgradeClick?: () => void;
}

/**
 * Format price for display.
 * Returns "Price not listed" when price is null.
 */
function formatPrice(price: number | null): string {
  if (price === null) {
    return 'Price not listed';
  }
  return `${price.toLocaleString('pl-PL')} PLN`;
}

/**
 * Format a date for display.
 */
function formatDate(date: Date | string | null): string {
  if (date === null) {
    return '—';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get display label for source portal.
 */
function getPortalLabel(portal: string): string {
  switch (portal) {
    case 'olx':
      return 'OLX';
    case 'oferteo':
      return 'Oferteo';
    case 'fixly':
      return 'Fixly';
    default:
      return portal;
  }
}

/**
 * AnnouncementDetail component showing all accessible fields per user tier.
 *
 * - For premium users: shows all fields including source_url and contact_info.
 * - For free users: masked fields (source_url, contact_info) display a lock icon
 *   with a tappable prompt to upgrade to Premium.
 * - For null announcement: displays an empty-state message.
 */
export default function AnnouncementDetail({
  announcement,
  tier,
  onUpgradeClick,
}: AnnouncementDetailProps) {
  if (!announcement) {
    return (
      <div className="announcement-detail__empty" role="status">
        No announcement to display
      </div>
    );
  }

  const isFree = tier === 'free';

  return (
    <article className="announcement-detail" aria-label={`Details for ${announcement.title}`}>
      <header className="announcement-detail__header">
        <h2 className="announcement-detail__title">{announcement.title}</h2>
        <span className="announcement-detail__portal">
          {getPortalLabel(announcement.source_portal)}
        </span>
      </header>

      <section className="announcement-detail__section">
        <h3 className="announcement-detail__section-title">Description</h3>
        <p className="announcement-detail__description">{announcement.description}</p>
      </section>

      <section className="announcement-detail__section">
        <h3 className="announcement-detail__section-title">Details</h3>
        <dl className="announcement-detail__fields">
          <div className="announcement-detail__field">
            <dt>Location</dt>
            <dd>{announcement.location_text}</dd>
          </div>

          <div className="announcement-detail__field">
            <dt>Category</dt>
            <dd>{announcement.category}</dd>
          </div>

          <div className="announcement-detail__field">
            <dt>Price</dt>
            <dd>{formatPrice(announcement.price)}</dd>
          </div>

          <div className="announcement-detail__field">
            <dt>Scraped at</dt>
            <dd>
              <time
                dateTime={
                  typeof announcement.scraped_at === 'string'
                    ? announcement.scraped_at
                    : announcement.scraped_at.toISOString()
                }
              >
                {formatDate(announcement.scraped_at)}
              </time>
            </dd>
          </div>

          <div className="announcement-detail__field">
            <dt>Published at</dt>
            <dd>{formatDate(announcement.published_at)}</dd>
          </div>

          {/* Source URL - masked for free tier */}
          <div className="announcement-detail__field">
            <dt>Source URL</dt>
            <dd>
              {isFree || announcement.source_url === undefined ? (
                <span className="announcement-detail__locked">
                  <span aria-hidden="true">🔒</span>
                  <button
                    type="button"
                    className="announcement-detail__upgrade-btn"
                    onClick={onUpgradeClick}
                    aria-label="Upgrade to Premium to view source URL"
                  >
                    Upgrade to Premium
                  </button>
                </span>
              ) : (
                <a
                  href={announcement.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="announcement-detail__link"
                >
                  {announcement.source_url}
                </a>
              )}
            </dd>
          </div>

          {/* Contact info - masked for free tier */}
          <div className="announcement-detail__field">
            <dt>Contact</dt>
            <dd>
              {isFree || announcement.contact_info === undefined ? (
                <span className="announcement-detail__locked">
                  <span aria-hidden="true">🔒</span>
                  <button
                    type="button"
                    className="announcement-detail__upgrade-btn"
                    onClick={onUpgradeClick}
                    aria-label="Upgrade to Premium to view contact info"
                  >
                    Upgrade to Premium
                  </button>
                </span>
              ) : announcement.contact_info !== null ? (
                <span>{announcement.contact_info}</span>
              ) : (
                <span>Not provided</span>
              )}
            </dd>
          </div>
        </dl>
      </section>
    </article>
  );
}
