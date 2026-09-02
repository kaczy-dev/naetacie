'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X, ArrowRight, Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';
import type { DisplayAnnouncement } from '@/lib/types/display';

export interface CompareShelfDockProps {
  comparedAds: DisplayAnnouncement[];
  onRemoveAd: (id: string) => void;
  onClearAll: () => void;
  onOpenCompareModal: () => void;
}

export function CompareShelfDock({
  comparedAds,
  onRemoveAd,
  onClearAll,
  onOpenCompareModal,
}: CompareShelfDockProps) {
  if (comparedAds.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 35, scale: 0.95 }}
        transition={SPRING_PRESETS.snappy}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-45 hidden md:flex items-center gap-3 p-2.5 px-4 rounded-3xl bg-card/95 backdrop-blur-2xl border border-primary/30 shadow-2xl text-card-foreground select-none max-w-2xl ring-1 ring-black/5"
      >
        {/* Header Icon */}
        <div className="flex items-center gap-2 pr-2 border-r border-border/60 shrink-0">
          <div className="p-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-foreground block">
              Porównywarka
            </span>
            <span className="text-[10px] text-muted-foreground">
              {comparedAds.length}/3 wybrane
            </span>
          </div>
        </div>

        {/* Selected Offer Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {comparedAds.map((ad) => (
            <div
              key={ad.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-background/80 border border-border/70 text-xs font-bold text-foreground shadow-2xs group shrink-0 max-w-[160px]"
            >
              <span className="truncate">{ad.title}</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  playUiSound('pop');
                  onRemoveAd(ad.id);
                }}
                className="p-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                title="Usuń z porównania"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-border/60 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              playUiSound('pop');
              onClearAll();
            }}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Wyczyść wszystkie"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              playUiSound('sparkle');
              onOpenCompareModal();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Porównaj ({comparedAds.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
