'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Navigation, Trophy, Users, X, MapPin, Bus, Clock } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export const POGON_STADIUM_COORDS: [number, number] = [14.5165, 53.4367]; // [lng, lat] Stadion im. Floriana Krygiera

export interface PogonFanSpot {
  id: string;
  name: string;
  type: 'stadium' | 'pub' | 'fan_zone';
  address: string;
  district: string;
  lat: number;
  lng: number;
  description: string;
  matchdayVibe: string;
}

export const POGON_SZCZECIN_SPOTS: PogonFanSpot[] = [
  {
    id: 'pogon_stadium',
    name: 'Stadion Miejski im. Floriana Krygiera',
    type: 'stadium',
    address: 'ul. Karłowicza 28',
    district: 'Pogodno',
    lat: 53.4367,
    lng: 14.5165,
    description: 'Dom Portowców Pogoń Szczecin (pojemność: 21 163 miejsc).',
    matchdayVibe: '🔥 Niezapomniana atmosfera na Młynie i w trybunach!',
  },
  {
    id: 'pogon_pub_1',
    name: 'Pub Granatowo-Bordowy',
    type: 'pub',
    address: 'ul. Witkiewicza 42',
    district: 'Pogodno',
    lat: 53.4350,
    lng: 14.5220,
    description: 'Kultowy pub kibiców Pogoni Szczecin tuż przy stadionie.',
    matchdayVibe: '🍺 Zimne piwo po budowie & transmisje meczów Ekstraklasy.',
  },
  {
    id: 'pogon_pub_2',
    name: 'Strefa Portowca — Łasztownia',
    type: 'fan_zone',
    address: 'ul. Łasztownia 14',
    district: 'Łasztownia',
    lat: 53.4245,
    lng: 14.5620,
    description: 'Letnia strefa kibica z telebimem przy Dźwigozaurach.',
    matchdayVibe: '🌊 Telebim nad Odrą, mecze na żywo & foodtrucki.',
  },
];

interface MapPogonSzczecinProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigateToStadium?: () => void;
}

export function MapPogonSzczecin({
  isVisible,
  onClose,
  onNavigateToStadium,
}: MapPogonSzczecinProps) {
  const [selectedSpot, setSelectedSpot] = useState<PogonFanSpot>(POGON_SZCZECIN_SPOTS[0]);

  if (!isVisible) return null;

  return (
    <div className="absolute top-16 left-4 z-20 max-w-sm w-full pointer-events-auto">
      <AnimatePresence>
        <motion.div
          key="pogon-szczecin-hub-panel"
          initial={{ opacity: 0, scale: 0.92, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -10 }}
          className="bg-card/95 backdrop-blur-xl border border-blue-600/40 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3"
        >
          {/* Header Banner - Pogoń Navy & Dark Red Accent */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-900 to-red-700 flex items-center justify-center shadow-lg text-white font-extrabold text-xs">
                ⚓
              </div>
              <div>
                <h3 className="text-xs font-black text-foreground tracking-tight flex items-center gap-1.5">
                  Pogoń Szczecin <span className="text-[10px] text-blue-500 font-bold bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">Duma Pomorza</span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Stadion & Strefy Kibica po pracy na budowie
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Spots Selector */}
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {POGON_SZCZECIN_SPOTS.map((spot) => {
              const isSelected = selectedSpot.id === spot.id;
              return (
                <motion.div
                  key={spot.id}
                  whileHover={{ scale: 1.01, x: 2 }}
                  onClick={() => {
                    triggerHaptic(8);
                    setSelectedSpot(spot);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/50 shadow-sm'
                      : 'bg-accent/30 border-border/50 hover:bg-accent/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {spot.type === 'stadium' ? '🏟️' : spot.type === 'pub' ? '🍺' : '📺'} {spot.name}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-600 dark:text-blue-400">
                      {spot.district}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {spot.description}
                  </p>
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5 flex items-center gap-1">
                    <span>{spot.matchdayVibe}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              triggerHaptic(12);
              onNavigateToStadium?.();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-blue-700 to-red-700 hover:from-blue-600 hover:to-red-600 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" /> Pokaż Stadion Pogoni na mapie
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
