'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  RotateCw,
  Sun,
  Moon,
  Sunset,
  Box,
  Eye,
  Layers,
  Map as MapIcon,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';
import type { SunlightMode } from '@/lib/geo/sunlightEngine';

export interface FloatingCameraControlsProps {
  onSetIsometric3D: () => void;
  onSetStreetLevel3D: () => void;
  onResetNorth: () => void;
  onToggleDroneOrbit: () => void;
  isDroneOrbiting: boolean;
  onToggleSatellite: () => void;
  isSatellite: boolean;
  sunlightMode: SunlightMode;
  onCycleSunlightMode: () => void;
  className?: string;
}

export function FloatingCameraControls({
  onSetIsometric3D,
  onSetStreetLevel3D,
  onResetNorth,
  onToggleDroneOrbit,
  isDroneOrbiting,
  onToggleSatellite,
  isSatellite,
  sunlightMode,
  onCycleSunlightMode,
  className = '',
}: FloatingCameraControlsProps) {
  const getSunlightIcon = () => {
    switch (sunlightMode) {
      case 'golden_hour':
        return <Sunset className="w-3.5 h-3.5 text-amber-500" />;
      case 'sunset':
        return <Sunset className="w-3.5 h-3.5 text-rose-500" />;
      case 'night_cyberpunk':
        return <Moon className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-yellow-500" />;
    }
  };

  return (
    <div
      className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-card/90 dark:bg-slate-900/90 border border-border/80 shadow-2xl backdrop-blur-xl select-none ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* 3D Isometric View (45 deg) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          onSetIsometric3D();
        }}
        className="p-2 rounded-xl hover:bg-muted/80 active:scale-95 text-foreground transition-all cursor-pointer shadow-2xs"
        title="Rzut Izometryczny 3D (45°)"
        aria-label="Rzut Izometryczny 3D"
      >
        <Box className="w-4 h-4 text-primary" />
      </button>

      {/* Street Level Pitch (65 deg) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          onSetStreetLevel3D();
        }}
        className="p-2 rounded-xl hover:bg-muted/80 active:scale-95 text-foreground transition-all cursor-pointer shadow-2xs"
        title="Poziom Ulicy (65° Pitch)"
        aria-label="Poziom Ulicy 3D"
      >
        <Eye className="w-4 h-4 text-emerald-500" />
      </button>

      {/* Reset North Compass */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          onResetNorth();
        }}
        className="p-2 rounded-xl hover:bg-muted/80 active:scale-95 text-foreground transition-all cursor-pointer shadow-2xs"
        title="Zresetuj orientację na Północ"
        aria-label="Zorientuj na północ"
      >
        <Compass className="w-4 h-4 text-blue-500" />
      </button>

      {/* 360 Drone Orbit Toggle */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(12);
          onToggleDroneOrbit();
        }}
        className={`p-2 rounded-xl active:scale-95 transition-all cursor-pointer shadow-2xs ${
          isDroneOrbiting
            ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-400/50'
            : 'hover:bg-muted/80 text-foreground'
        }`}
        title={isDroneOrbiting ? 'Zatrzymaj obieg dronem' : 'Włącz kinowy obieg dronem 360°'}
        aria-label="Kinowy obieg dronem 360°"
      >
        <RotateCw className={`w-4 h-4 ${isDroneOrbiting ? 'animate-spin' : 'text-purple-500'}`} />
      </button>

      {/* Sunlight / Shading Mode Cycler */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          onCycleSunlightMode();
        }}
        className="p-2 rounded-xl hover:bg-muted/80 active:scale-95 text-foreground transition-all cursor-pointer shadow-2xs"
        title={`Oświetlenie słoneczne 3D (aktualnie: ${sunlightMode})`}
        aria-label="Przełącz oświetlenie 3D"
      >
        {getSunlightIcon()}
      </button>

      {/* Satellite / Vector Toggle */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(12);
          onToggleSatellite();
        }}
        className={`p-2 rounded-xl active:scale-95 transition-all cursor-pointer shadow-2xs ${
          isSatellite
            ? 'bg-emerald-600 text-white'
            : 'hover:bg-muted/80 text-foreground'
        }`}
        title={isSatellite ? 'Przełącz na mapę wektorową' : 'Przełącz na satelitę HD'}
        aria-label="Przełącz warstwę satelitarną"
      >
        <MapIcon className="w-4 h-4 text-amber-500" />
      </button>
    </div>
  );
}
