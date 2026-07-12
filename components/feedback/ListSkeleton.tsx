'use client';

/**
 * ListSkeleton - Loading skeleton placeholder for the announcement list.
 * Renders 5 skeleton cards matching the card layout dimensions:
 * - Title line (60% width, 18px height)
 * - Location line (40% width, 14px height)
 * - Price block (25% width, 16px height)
 *
 * Uses CSS pulsing animation and respects prefers-reduced-motion.
 *
 * Validates: Requirements 12.1
 */

const SKELETON_CARD_COUNT = 5;

export default function ListSkeleton() {
  return (
    <div className="list-skeleton" role="status" aria-label="Loading announcements">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div key={index} className="list-skeleton__card">
          <div className="list-skeleton__title" />
          <div className="list-skeleton__location" />
          <div className="list-skeleton__price" />
        </div>
      ))}

      <style>{`
        .list-skeleton {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-3, 12px);
          padding: var(--spacing-4, 16px);
        }

        .list-skeleton__card {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-3, 12px);
          padding: var(--spacing-4, 16px);
          border-radius: var(--radius-lg, 12px);
          background: var(--color-surface, #ffffff);
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
        }

        .list-skeleton__title,
        .list-skeleton__location,
        .list-skeleton__price {
          border-radius: var(--radius-sm, 4px);
          background: var(--color-gray-200, #e5e7eb);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        .list-skeleton__title {
          width: 60%;
          height: 18px;
        }

        .list-skeleton__location {
          width: 40%;
          height: 14px;
        }

        .list-skeleton__price {
          width: 25%;
          height: 16px;
        }

        @keyframes skeleton-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .list-skeleton__title,
          .list-skeleton__location,
          .list-skeleton__price {
            animation: none;
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
