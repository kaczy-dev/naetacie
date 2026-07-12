'use client';

/**
 * MapSkeleton - Loading skeleton placeholder for the map view.
 * Renders a full-width, fixed-height skeleton matching the map container
 * dimensions (height: calc(100vh - 64px)) with pulsing animation.
 *
 * Uses CSS pulsing animation and respects prefers-reduced-motion.
 *
 * Validates: Requirements 12.2
 */

export default function MapSkeleton() {
  return (
    <div className="map-skeleton" role="status" aria-label="Loading map">
      <div className="map-skeleton__surface">
        <div className="map-skeleton__icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
              fill="currentColor"
              opacity="0.3"
            />
          </svg>
        </div>
      </div>

      <style>{`
        .map-skeleton {
          width: 100%;
          height: calc(100vh - 64px);
          position: relative;
        }

        .map-skeleton__surface {
          width: 100%;
          height: 100%;
          background: var(--color-gray-200, #e5e7eb);
          border-radius: var(--radius-md, 8px);
          animation: map-skeleton-pulse 1.5s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-skeleton__icon {
          color: var(--color-gray-400, #9ca3af);
        }

        @keyframes map-skeleton-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .map-skeleton__surface {
            animation: none;
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
