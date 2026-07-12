'use client';

import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  tabIndicatorTransition,
  TAB_ICON_SCALE_ACTIVE,
  TAB_ICON_SCALE_INACTIVE,
  buttonTapAnimation,
} from '@/lib/animations/microInteractions';

/**
 * Height of the bottom navigation bar in pixels.
 * Export for parent layout components to reserve bottom spacing.
 */
export const BOTTOM_NAV_HEIGHT = 64;

export type TabId = 'map' | 'list' | 'notifications' | 'profile';

export interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface TabConfig {
  id: TabId;
  label: string;
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function NotificationsIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const TABS: TabConfig[] = [
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'profile', label: 'Profile' },
];

const TAB_ICONS: Record<TabId, (active: boolean) => React.ReactNode> = {
  map: (active) => <MapIcon active={active} />,
  list: (active) => <ListIcon active={active} />,
  notifications: (active) => <NotificationsIcon active={active} />,
  profile: (active) => <ProfileIcon active={active} />,
};

const navStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: `${BOTTOM_NAV_HEIGHT}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  backgroundColor: '#ffffff',
  borderTop: '1px solid #e5e7eb',
  boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)',
  zIndex: 1000,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};

const tabBaseStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '44px',
  minHeight: '44px',
  padding: '6px 12px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '11px',
  lineHeight: '1.2',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  transition: 'color 250ms ease',
};

const iconContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  marginBottom: '2px',
};

/**
 * Bottom navigation bar for mobile-first layout.
 * Fixed at the bottom of the viewport with 4 tabs.
 * Touch targets are at least 44x44 CSS pixels.
 * Active tab is visually distinguished with color and font weight.
 * Entrance animation: slides up from below viewport on mount.
 * Respects prefers-reduced-motion for accessibility.
 */
export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const prefersReducedMotion = useReducedMotion();

  // Slide-up entrance animation for the bottom nav bar
  const navVariants: Variants = {
    hidden: { y: BOTTOM_NAV_HEIGHT + 20 },
    visible: {
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        mass: 0.8,
      },
    },
  };

  return (
    <motion.nav
      style={navStyle}
      role="navigation"
      aria-label="Main navigation"
      initial={prefersReducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      variants={navVariants}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        const tabStyle: React.CSSProperties = {
          ...tabBaseStyle,
          color: isActive ? '#2563eb' : '#6b7280',
          fontWeight: isActive ? 600 : 400,
        };

        return (
          <motion.button
            key={tab.id}
            type="button"
            style={tabStyle}
            onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            whileTap={prefersReducedMotion ? undefined : buttonTapAnimation}
          >
            <motion.span
              style={iconContainerStyle}
              animate={
                prefersReducedMotion
                  ? { scale: 1, color: isActive ? '#2563eb' : '#6b7280' }
                  : {
                      scale: isActive ? TAB_ICON_SCALE_ACTIVE : TAB_ICON_SCALE_INACTIVE,
                      color: isActive ? '#2563eb' : '#6b7280',
                    }
              }
              transition={prefersReducedMotion ? { duration: 0 } : tabIndicatorTransition}
            >
              {TAB_ICONS[tab.id](isActive)}
            </motion.span>
            <span>{tab.label}</span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
