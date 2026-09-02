'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { List, Map as MapIcon } from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';

export interface MobileViewSwitcherProps {
  activeTab: 'list' | 'map';
  onSwitchTab: (tab: 'list' | 'map') => void;
  offersCount?: number;
}

/**
 * MobileViewSwitcher - Thumb-Zone Floating Pill Switcher
 * Anchored dynamically above the Mobile Bottom Navigation (bottom-[84px]).
 */
export function MobileViewSwitcher({
  activeTab,
  onSwitchTab,
  offersCount,
}: MobileViewSwitcherProps) {
  return (
    <div className="fixed bottom-[120px] left-1/2 -translate-x-1/2 z-35 flex md:hidden items-center select-none pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING_PRESETS.snappy}
        className="flex items-center p-1.5 rounded-full bg-zinc-950/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 ring-1 ring-white/5"
      >
        {/* Lista Button */}
        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'list') {
              triggerHaptic(10);
              playUiSound('pop');
              onSwitchTab('list');
            }
          }}
          className={cn(
            'relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all active:scale-95 cursor-pointer',
            activeTab === 'list'
              ? 'text-white shadow-lg'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          {activeTab === 'list' && (
            <motion.div
              layoutId="mobile-view-pill"
              className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full border border-emerald-400/30 shadow-md shadow-emerald-600/30"
              transition={SPRING_PRESETS.snappy}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <List className="w-3.5 h-3.5" />
            <span>Lista</span>
            {offersCount !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 text-emerald-200 font-black border border-white/10">
                {offersCount}
              </span>
            )}
          </span>
        </button>

        {/* Mapa 3D Button */}
        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'map') {
              triggerHaptic(10);
              playUiSound('pop');
              onSwitchTab('map');
            }
          }}
          className={cn(
            'relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all active:scale-95 cursor-pointer',
            activeTab === 'map'
              ? 'text-white shadow-lg'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          {activeTab === 'map' && (
            <motion.div
              layoutId="mobile-view-pill"
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full border border-blue-400/30 shadow-md shadow-blue-600/30"
              transition={SPRING_PRESETS.snappy}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <MapIcon className="w-3.5 h-3.5" />
            <span>Mapa 3D</span>
          </span>
        </button>
      </motion.div>
    </div>
  );
}
