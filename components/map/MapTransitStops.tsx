'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, Navigation, Footprints, X, Check } from 'lucide-react';

export interface TransitStop {
  id: string;
  name: string;
  lines: string[];
  walkTimeMin: number;
  distanceMeters: number;
}

export const SZCZECIN_TRANSIT_STOPS: TransitStop[] = [
  { id: 'stop_1', name: 'Brama Portowa', lines: ['T1', 'T2', 'T7', 'A75', 'A87'], walkTimeMin: 3, distanceMeters: 240 },
  { id: 'stop_2', name: 'Plac Rodła', lines: ['T3', 'T10', 'T12', 'A68'], walkTimeMin: 5, distanceMeters: 380 },
  { id: 'stop_3', name: 'Gumieńce Rondko', lines: ['T8', 'T10', 'A60'], walkTimeMin: 4, distanceMeters: 310 },
  { id: 'stop_4', name: 'Dąbie Stacja PKP', lines: ['PKP Regio', 'A64', 'A77'], walkTimeMin: 6, distanceMeters: 450 },
];

interface MapTransitStopsProps {
  isVisible: boolean;
  onClose: () => void;
}

export function MapTransitStops({ isVisible, onClose }: MapTransitStopsProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-16 right-4 z-20 max-w-xs w-full pointer-events-auto">
      <AnimatePresence>
        <motion.div
          key="transit-stops-panel"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-card/90 backdrop-blur-xl border border-emerald-500/40 rounded-2xl shadow-xl p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-foreground">ZTM Szczecin — Dojazd</span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {SZCZECIN_TRANSIT_STOPS.map((stop) => (
              <div key={stop.id} className="p-2 rounded-xl bg-accent/30 border border-border/50 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>🚏 {stop.name}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <Footprints className="w-3 h-3" /> {stop.walkTimeMin} min ({stop.distanceMeters}m)
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {stop.lines.map((l) => (
                    <span key={l} className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
