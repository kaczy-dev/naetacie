'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { List, Map as MapIcon, Heart, Settings } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export const BOTTOM_NAV_HEIGHT = 64;

export type TabId = 'list' | 'map' | 'favorites' | 'settings';

export interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'list', label: 'Oferty', icon: List },
  { id: 'map', label: 'Mapa 3D', icon: MapIcon },
  { id: 'favorites', label: 'Ulubione', icon: Heart },
  { id: 'settings', label: 'Opcje', icon: Settings },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleTabClick = (id: TabId) => {
    triggerHaptic(12);
    onTabChange(id);
  };

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-card/85 backdrop-blur-2xl border-t border-border/80 shadow-2xl flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)]"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-3 py-1.5 rounded-2xl transition-all cursor-pointer select-none touch-manipulation active:scale-95 ${
              isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground font-medium'
            }`}
          >
            {/* Active Pill Indicator */}
            {isActive && (
              <motion.div
                layoutId="bottomNavActivePill"
                className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20 shadow-xs"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 450, damping: 32 }
                }
              />
            )}

            <motion.div
              animate={
                prefersReducedMotion
                  ? {}
                  : { scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }
              }
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative z-10"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-primary fill-primary/15' : 'text-muted-foreground'
                }`}
              />
            </motion.div>

            <span className="relative z-10 text-[10.5px] leading-tight tracking-tight mt-0.5">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
