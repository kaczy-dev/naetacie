'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';

export interface PullToRefreshProps {
  /** Callback triggered when the user releases past the 60px threshold */
  onRefresh: () => Promise<void>;
  /** Content to wrap with pull-to-refresh behavior */
  children: ReactNode;
}

/** Threshold in pixels the user must pull past to trigger refresh */
const PULL_THRESHOLD = 60;

/** Maximum pull distance for visual capping */
const MAX_PULL = 120;

/**
 * PullToRefresh wraps scrollable content and provides a pull-down gesture
 * to trigger a data reload on mobile (touch devices only).
 *
 * Requirement 12.3: Display pull indicator at the top of the list and reload
 * data from the API upon release past a 60px threshold.
 */
export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isRefreshing) return;

      // Only activate pull-to-refresh when scrolled to the top
      const container = containerRef.current;
      if (container && container.scrollTop > 0) return;

      touchStartY.current = e.touches[0].clientY;
      isPulling.current = false;
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isRefreshing || touchStartY.current === null) return;

      const container = containerRef.current;
      if (container && container.scrollTop > 0) {
        // User has scrolled down, reset
        touchStartY.current = null;
        setPullDistance(0);
        isPulling.current = false;
        return;
      }

      const currentY = e.touches[0].clientY;
      const delta = currentY - touchStartY.current;

      // Only trigger on downward pull
      if (delta <= 0) {
        if (isPulling.current) {
          setPullDistance(0);
          isPulling.current = false;
        }
        return;
      }

      isPulling.current = true;

      // Apply resistance: pull distance decays as it grows
      const resistance = Math.min(delta * 0.5, MAX_PULL);
      setPullDistance(resistance);

      // Prevent scroll while pulling
      if (resistance > 0) {
        e.preventDefault();
      }
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || isRefreshing) {
      touchStartY.current = null;
      return;
    }

    touchStartY.current = null;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      // Past threshold — trigger refresh
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.6); // Hold at a smaller position during refresh

      try {
        await onRefresh();
      } finally {
        setIsTransitioning(true);
        setPullDistance(0);
        setIsRefreshing(false);

        // Allow transition to complete before removing transition class
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      }
    } else {
      // Below threshold — spring back
      setIsTransitioning(true);
      setPullDistance(0);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="pull-to-refresh"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', overflowY: 'auto', height: '100%' }}
    >
      {/* Pull indicator */}
      <div
        className={`pull-to-refresh__indicator ${isTransitioning ? 'pull-to-refresh__indicator--transitioning' : ''}`}
        style={{
          height: `${pullDistance}px`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isTransitioning ? 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
        aria-hidden={pullDistance === 0 && !isRefreshing}
      >
        {isRefreshing ? (
          <div
            className="pull-to-refresh__spinner"
            aria-label="Refreshing"
            role="status"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                animation: 'pull-to-refresh-spin 0.8s linear infinite',
              }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="50 20"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ) : (
          <div
            className="pull-to-refresh__arrow"
            style={{
              opacity: progress,
              transform: `rotate(${progress * 180}deg)`,
              transition: isTransitioning ? 'opacity 0.3s, transform 0.3s' : 'none',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      {children}

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes pull-to-refresh-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .pull-to-refresh__indicator {
          color: var(--color-primary, #2563eb);
        }

        .pull-to-refresh__arrow,
        .pull-to-refresh__spinner {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
