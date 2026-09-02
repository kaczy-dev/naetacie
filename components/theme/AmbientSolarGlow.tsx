'use client';

import React, { useMemo } from 'react';

/**
 * AmbientSolarGlow - Atmospheric backdrop lighting reactive to real-time sun phase in Szczecin.
 * Zero-battery drain, pure CSS mesh gradients with pointer-events-none.
 */
export function AmbientSolarGlow() {
  const solarPhase = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return 'dawn';
    if (hour >= 9 && hour < 17) return 'day';
    if (hour >= 17 && hour < 21) return 'golden_hour';
    return 'night';
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none opacity-65 dark:opacity-40">
      {solarPhase === 'dawn' && (
        <div className="absolute top-0 -left-1/4 w-[150vw] h-[50vh] bg-gradient-to-b from-amber-400/10 via-rose-500/5 to-transparent blur-3xl" />
      )}
      {solarPhase === 'day' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[45vh] bg-gradient-to-b from-primary/10 via-emerald-500/5 to-transparent blur-3xl" />
      )}
      {solarPhase === 'golden_hour' && (
        <div className="absolute top-0 right-0 w-[140vw] h-[50vh] bg-gradient-to-b from-amber-500/15 via-orange-500/8 to-transparent blur-3xl" />
      )}
      {solarPhase === 'night' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[35vh] bg-gradient-to-b from-blue-900/10 via-indigo-950/5 to-transparent blur-3xl" />
      )}
    </div>
  );
}
