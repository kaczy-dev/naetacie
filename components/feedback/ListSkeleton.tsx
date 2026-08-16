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
    <div className="list-skeleton" role="status" aria-label="Ładowanie ogłoszeń">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div key={index} className="list-skeleton__card">
          <div className="list-skeleton__header">
            <div className="list-skeleton__badge" />
            <div className="list-skeleton__bookmark" />
          </div>
          <div className="list-skeleton__title" />
          <div className="list-skeleton__company" />
          <div className="list-skeleton__tags">
            <div className="list-skeleton__tag" />
            <div className="list-skeleton__tag" />
            <div className="list-skeleton__tag" />
          </div>
          <div className="list-skeleton__footer">
            <div className="list-skeleton__price" />
            <div className="list-skeleton__action" />
          </div>
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
          gap: 10px;
          padding: 16px;
          border-radius: 16px;
          background: var(--color-card, #ffffff);
          border: 1px solid var(--color-border, #e2e8f0);
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.03);
          position: relative;
          overflow: hidden;
        }

        .list-skeleton__card::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.4) 20%,
            rgba(255, 255, 255, 0.7) 60%,
            rgba(255, 255, 255, 0)
          );
          animation: shimmer-swipe 2s infinite;
        }

        .dark .list-skeleton__card::after {
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.04) 20%,
            rgba(255, 255, 255, 0.08) 60%,
            rgba(255, 255, 255, 0)
          );
        }

        .list-skeleton__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .list-skeleton__badge {
          width: 90px;
          height: 22px;
          border-radius: 9999px;
          background: var(--color-muted, #f1f5f9);
        }

        .list-skeleton__bookmark {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-muted, #f1f5f9);
        }

        .list-skeleton__title {
          width: 75%;
          height: 20px;
          border-radius: 6px;
          background: var(--color-muted, #f1f5f9);
        }

        .list-skeleton__company {
          width: 45%;
          height: 14px;
          border-radius: 4px;
          background: var(--color-muted, #f1f5f9);
        }

        .list-skeleton__tags {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .list-skeleton__tag {
          width: 60px;
          height: 20px;
          border-radius: 6px;
          background: var(--color-muted, #f1f5f9);
        }

        .list-skeleton__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--color-border, #f1f5f9);
        }

        .list-skeleton__price {
          width: 110px;
          height: 24px;
          border-radius: 6px;
          background: var(--color-muted, #e2e8f0);
        }

        .list-skeleton__action {
          width: 85px;
          height: 32px;
          border-radius: 8px;
          background: var(--color-muted, #e2e8f0);
        }

        @keyframes shimmer-swipe {
          100% {
            transform: translateX(100%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .list-skeleton__card::after {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
