'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Sun,
  Moon,
  Compass,
  Navigation,
  Flame,
  Route,
  RefreshCw,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export interface BridgeTrafficStatus {
  name: string;
  delayMin: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

export const SZCZECIN_BRIDGES: BridgeTrafficStatus[] = [
  { name: 'Most Długi', delayMin: 3, status: 'GREEN' },
  { name: 'Most Pionierów', delayMin: 5, status: 'GREEN' },
  { name: 'Trasa Zamkowa', delayMin: 8, status: 'YELLOW' },
];

export interface EnterpriseMapHUDProps {
  is3DTilted: boolean;
  onToggle3D: () => void;
  activeLayer: 'STANDARD' | 'HEATMAP' | 'TRANSIT';
  onLayerChange: (layer: 'STANDARD' | 'HEATMAP' | 'TRANSIT') => void;
  sunPhase?: 'DAWN' | 'NOON' | 'GOLDEN' | 'NIGHT';
  onSunPhaseChange?: (phase: 'DAWN' | 'NOON' | 'GOLDEN' | 'NIGHT') => void;
  onResetCenter?: () => void;
  className?: string;
}

export const EnterpriseMapHUD: React.FC<EnterpriseMapHUDProps> = ({
  is3DTilted,
  onToggle3D,
  activeLayer,
  onLayerChange,
  sunPhase = 'NOON',
  onSunPhaseChange,
  onResetCenter,
  className = '',
}) => {
  const [showBridges, setShowBridges] = useState(true);

  return (
    <div className={`absolute top-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-auto ${className}`}>
      {/* Floating Glass Tool Matrix */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-zinc-800/80 shadow-2xl shadow-black/60 text-white">
        {/* 3D Tilt Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onToggle3D();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
            is3DTilted
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Przełącz kąt 3D i cienie budynków"
        >
          <Compass className={`w-3.5 h-3.5 ${is3DTilted ? 'rotate-45' : ''} transition-transform`} />
          <span>{is3DTilted ? '3D 45°' : '2D Płaska'}</span>
        </button>

        {/* Heatmap Layer Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onLayerChange(activeLayer === 'HEATMAP' ? 'STANDARD' : 'HEATMAP');
          }}
          className={`p-2 rounded-xl text-xs font-bold transition ${
            activeLayer === 'HEATMAP'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Mapa cieplna stawek i popytu (Heatmap)"
        >
          <Flame className="w-4 h-4 text-orange-400" />
        </button>

        {/* Reset View to Szczecin Center */}
        {onResetCenter && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onResetCenter();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title="Wycentruj na Szczecin (Brama Portowa)"
          >
            <Navigation className="w-4 h-4 text-emerald-400" />
          </button>
        )}
      </div>

      {/* Szczecin Bridges Cross-River Traffic Monitor Widget */}
      <div className="w-64 p-3 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-zinc-800/80 shadow-2xl shadow-black/60 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
            <Route className="w-3.5 h-3.5 text-amber-400" />
            <span>Mosty Szczecina (Przeprawy)</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          {SZCZECIN_BRIDGES.map((bridge) => (
            <div
              key={bridge.name}
              className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60"
            >
              <span className="text-zinc-300 font-medium">{bridge.name}</span>
              <span
                className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                  bridge.status === 'GREEN'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-amber-400 bg-amber-500/10'
                }`}
              >
                +{bridge.delayMin} min
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
