'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import { ChevronDown, Menu, X, Sparkles } from 'lucide-react';
import BottomNav, { BOTTOM_NAV_HEIGHT, type TabId } from './BottomNav';
import { OfflineStatusIndicator } from '@/components/offline/OfflineStatusIndicator';

export interface ResponsiveLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

interface NavTabConfig {
  id: TabId;
  label: string;
}

const NAV_TABS: NavTabConfig[] = [
  { id: 'list', label: 'Lista Ofert' },
  { id: 'map', label: 'Mapa 3D' },
  { id: 'favorites', label: 'Ulubione' },
  { id: 'settings', label: 'Ustawienia' },
];

const TAB_ORDER: TabId[] = ['list', 'map', 'favorites', 'settings'];

const SWIPE_VELOCITY_THRESHOLD = 300;
const SWIPE_DISTANCE_THRESHOLD = 80;

function getSwipeDirection(info: PanInfo): 'left' | 'right' | null {
  const { offset, velocity } = info;

  if (Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD) {
    return velocity.x > 0 ? 'right' : 'left';
  }

  if (Math.abs(offset.x) > SWIPE_DISTANCE_THRESHOLD) {
    return offset.x > 0 ? 'right' : 'left';
  }

  return null;
}

const contentSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.8,
};

export default function ResponsiveLayout({
  activeTab,
  onTabChange,
  children,
}: ResponsiveLayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const previousTabIndexRef = useRef(TAB_ORDER.indexOf(activeTab));
  const currentTabIndex = TAB_ORDER.indexOf(activeTab);

  const direction = currentTabIndex > previousTabIndexRef.current ? 1 : -1;
  previousTabIndexRef.current = currentTabIndex;

  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    [activeTab, onTabChange]
  );

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
    <div className="responsive-layout flex flex-col min-h-screen max-w-full overflow-x-hidden">
      {/* Top Header with Rozwijane Menu (Dropdown Menu) instead of side nav */}
      <header className="sticky top-0 z-40 w-full bg-card/85 backdrop-blur-lg border-b border-border/50 h-13 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Na Etacie</span>
        </div>

        {/* Dropdown Menu Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            {dropdownOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            <span>Rozwijane Menu</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 p-1.5 bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95">
              {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onTabChange(tab.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Main content area */}
      <main className="responsive-layout__content flex-1 min-w-0">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeTab}
            custom={direction}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0 } : contentSpring}
            className="responsive-layout__content-inner"
            style={{ width: '100%', minHeight: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom navigation for mobile */}
      <div className="responsive-layout__bottom-nav md:hidden">
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      {/* Offline Status & PWA Network Sync Notification */}
      <OfflineStatusIndicator />
    </div>
  );
}
