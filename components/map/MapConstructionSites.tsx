'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardHat, Building2, MapPin, Users, ChevronRight, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConstructionSite {
  id: string;
  name: string;
  contractor: string;
  district: string;
  lat: number;
  lng: number;
  type: 'commercial' | 'residential' | 'infrastructure';
  neededTrades: string[];
  workersNeededCount: number;
  avgHourlyRate: string;
}

export const SZCZECIN_CONSTRUCTION_SITES: ConstructionSite[] = [
  {
    id: 'site_1',
    name: 'Kompleks Łasztownia Port',
    contractor: 'Budgeo Szczecin Sp. z o.o.',
    district: 'Łasztownia / Centrum',
    lat: 53.4255,
    lng: 14.565,
    type: 'commercial',
    neededTrades: ['Murarz', 'Cieśla', 'Zbrojarz', 'Elektryk'],
    workersNeededCount: 18,
    avgHourlyRate: '45 - 55 zł/h',
  },
  {
    id: 'site_2',
    name: 'Osiedle Gumieńce Park',
    contractor: 'Development Zachód',
    district: 'Gumieńce',
    lat: 53.398,
    lng: 14.508,
    type: 'residential',
    neededTrades: ['Tynkarz', 'Glazurnik', 'Malarz', 'Hydraulik'],
    workersNeededCount: 12,
    avgHourlyRate: '40 - 50 zł/h',
  },
  {
    id: 'site_3',
    name: 'Centrum Logistyczne Prawobrzeże',
    contractor: 'Stargard Inwestycje',
    district: 'Dąbie / Prawobrzeże',
    lat: 53.408,
    lng: 14.625,
    type: 'infrastructure',
    neededTrades: ['Operator Koparki', 'Spawacz', 'Brukarz', 'Monter'],
    workersNeededCount: 25,
    avgHourlyRate: '50 - 65 zł/h',
  },
  {
    id: 'site_4',
    name: 'Rewitalizacja Niebuszewo Hub',
    contractor: 'Gryf Budownictwo',
    district: 'Niebuszewo',
    lat: 53.448,
    lng: 14.558,
    type: 'commercial',
    neededTrades: ['Dekarz', 'Cieśla', 'Posadzkarz', 'Regipsiarz'],
    workersNeededCount: 9,
    avgHourlyRate: '42 - 52 zł/h',
  },
];

interface MapConstructionSitesProps {
  isVisible: boolean;
  onToggleVisible: () => void;
  onSelectSite?: (site: ConstructionSite) => void;
}

export function MapConstructionSites({
  isVisible,
  onToggleVisible,
  onSelectSite,
}: MapConstructionSitesProps) {
  const [selectedSite, setSelectedSite] = useState<ConstructionSite | null>(null);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-16 left-4 z-20 max-w-sm w-full pointer-events-auto">
      <AnimatePresence>
        <motion.div
          key="construction-sites-panel"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="bg-card/90 backdrop-blur-xl border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground leading-none">Inwestycje Budowlane Szczecin</h3>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  4 aktywne duże mega-budowy
                </p>
              </div>
            </div>
            <button
              onClick={onToggleVisible}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of Sites */}
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {SZCZECIN_CONSTRUCTION_SITES.map((site) => (
              <motion.div
                key={site.id}
                whileHover={{ scale: 1.02, x: 2 }}
                onClick={() => {
                  setSelectedSite(site);
                  onSelectSite?.(site);
                }}
                className="p-2.5 rounded-xl border border-border/60 bg-accent/30 hover:bg-accent/70 cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-emerald-500" /> {site.name}
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    {site.avgHourlyRate}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500" /> {site.district}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <Users className="w-3 h-3" /> Potrzebnych: {site.workersNeededCount}
                  </span>
                </div>

                {/* Needed Trades */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {site.neededTrades.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-1.5 py-0.2 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
