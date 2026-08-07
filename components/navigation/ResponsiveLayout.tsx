'use client';

import React, { useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import BottomNav, { BOTTOM_NAV_HEIGHT, type TabId } from './BottomNav';

export interface ResponsiveLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

interface SideNavTabConfig {
  id: TabId;
  label: string;
}

const SIDE_NAV_TABS: SideNavTabConfig[] = [
  { id: 'list', label: 'Lista Ofert' },
  { id: 'map', label: 'Mapa 3D' },
  { id: 'favorites', label: 'Ulubione' },
  { id: 'settings', label: 'Ustawienia' },
];

const TAB_ORDER: TabId[] = ['list', 'map', 'favorites', 'settings'];

const SIDE_NAV_WIDTH = 240;

/** Minimum velocity (px/s) for swipe to complete tab navigation */
const SWIPE_VELOCITY_THRESHOLD = 300;
/** Minimum drag distance (px) to trigger tab change without sufficient velocity */
const SWIPE_DISTANCE_THRESHOLD = 80;

/**
 * Determines swipe direction based on drag info from Framer Motion.
 * Uses velocity-based completion: if velocity exceeds threshold, navigate.
 * Otherwise, falls back to distance-based threshold.
 */
function getSwipeDirection(info: PanInfo): 'left' | 'right' | null {
  const { offset, velocity } = info;

  // Velocity-based: fast swipe completes regardless of distance
  if (Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD) {
    return velocity.x > 0 ? 'right' : 'left';
  }

  // Distance-based fallback
  if (Math.abs(offset.x) > SWIPE_DISTANCE_THRESHOLD) {
    return offset.x > 0 ? 'right' : 'left';
  }

  return null;
}

/**
 * Spring transition config for content transitions.
 * Duration 250-350ms with slight overshoot for natural feel.
 */
const contentSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.8,
};

/**
 * Responsive layout that adapts navigation based on viewport width:
 * - At viewport ≤ 768px: renders BottomNav fixed at bottom, content with bottom padding
 * - At viewport > 768px: renders side navigation panel on the left, content fills remaining width
 *
 * Features:
 * - Content transition: horizontal slide with spring physics (250-350ms, slight overshoot)
 * - Swipe gesture support on mobile for tab navigation with velocity-based completion
 * - Respects prefers-reduced-motion for accessibility
 * - Ensures no horizontal scrolling for viewports 320px–1440px
 */
export default function ResponsiveLayout({
  activeTab,
  onTabChange,
  children,
}: ResponsiveLayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const previousTabIndexRef = useRef(TAB_ORDER.indexOf(activeTab));
  const currentTabIndex = TAB_ORDER.indexOf(activeTab);

  // Track direction for slide animation
  const direction = currentTabIndex > previousTabIndexRef.current ? 1 : -1;
  previousTabIndexRef.current = currentTabIndex;

  const handleSwipe = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const swipeDir = getSwipeDirection(info);
      if (!swipeDir) return;

      const currentIndex = TAB_ORDER.indexOf(activeTab);

      if (swipeDir === 'left' && currentIndex < TAB_ORDER.length - 1) {
        onTabChange(TAB_ORDER[currentIndex + 1]);
      } else if (swipeDir === 'right' && currentIndex > 0) {
        onTabChange(TAB_ORDER[currentIndex - 1]);
      }
    },
    [activeTab, onTabChange],
  );

  // Animation variants for content transitions
  const contentVariants = prefersReducedMotion
    ? {
        enter: { opacity: 1, x: 0 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 1, x: 0 },
      }
    : {
        enter: (dir: number) => ({
          x: dir > 0 ? '30%' : '-30%',
          opacity: 0,
        }),
        center: {
          x: 0,
          opacity: 1,
        },
        exit: (dir: number) => ({
          x: dir < 0 ? '30%' : '-30%',
          opacity: 0,
        }),
      };

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="responsive-layout">
        {/* Side navigation for desktop (>768px) */}
        <nav
          className="responsive-layout__side-nav"
          role="navigation"
          aria-label="Main navigation"
        >
          <ul className="responsive-layout__side-nav-list">
            {SIDE_NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    className={`responsive-layout__side-nav-item${isActive ? ' responsive-layout__side-nav-item--active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content area with animated transitions */}
        <main className="responsive-layout__content">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={activeTab}
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={prefersReducedMotion ? { duration: 0 } : contentSpring}
              drag={prefersReducedMotion ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleSwipe}
              className="responsive-layout__content-inner"
              style={{ width: '100%', minHeight: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom navigation for mobile (≤768px) */}
        <div className="responsive-layout__bottom-nav">
          <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
        </div>
      </div>
    </>
  );
}

const responsiveStyles = `
  .responsive-layout {
    display: flex;
    min-height: 100vh;
    max-width: 100vw;
    overflow-x: hidden;
  }

  /* Side navigation - hidden on mobile, visible on desktop */
  .responsive-layout__side-nav {
    display: none;
  }

  /* Bottom navigation - visible on mobile, hidden on desktop */
  .responsive-layout__bottom-nav {
    display: block;
  }

  /* Content area - full width on mobile with bottom padding for nav */
  .responsive-layout__content {
    flex: 1;
    min-width: 0;
    width: 100%;
    padding-bottom: ${BOTTOM_NAV_HEIGHT}px;
    overflow-x: hidden;
    position: relative;
  }

  .responsive-layout__content-inner {
    touch-action: pan-y;
  }

  /* Desktop layout: viewport > 768px */
  @media (min-width: 769px) {
    .responsive-layout__side-nav {
      display: flex;
      flex-direction: column;
      width: ${SIDE_NAV_WIDTH}px;
      min-width: ${SIDE_NAV_WIDTH}px;
      height: 100vh;
      position: sticky;
      top: 0;
      background-color: #ffffff;
      border-right: 1px solid #e5e7eb;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
      z-index: 100;
    }

    .responsive-layout__side-nav-list {
      list-style: none;
      margin: 0;
      padding: 16px 0;
    }

    .responsive-layout__side-nav-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 12px 24px;
      border: none;
      background: transparent;
      font-size: 15px;
      font-weight: 400;
      color: #6b7280;
      cursor: pointer;
      text-align: left;
      transition: background-color 250ms ease, color 250ms ease, border-left-color 250ms ease;
      border-left: 3px solid transparent;
    }

    .responsive-layout__side-nav-item:hover {
      background-color: #f3f4f6;
      color: #374151;
    }

    .responsive-layout__side-nav-item--active {
      color: #2563eb;
      font-weight: 600;
      background-color: #eff6ff;
      border-left-color: #2563eb;
    }

    .responsive-layout__bottom-nav {
      display: none;
    }

    .responsive-layout__content {
      padding-bottom: 0;
    }

    /* Disable drag/swipe on desktop */
    .responsive-layout__content-inner {
      touch-action: auto;
    }
  }

  /* Respect prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    .responsive-layout__side-nav-item {
      transition: none;
    }

    .responsive-layout__content-inner {
      touch-action: auto;
    }
  }
`;
