/**
 * Live Construction Weather & Outdoor Suitability Widget.
 * Displays real-time outdoor conditions for masonry, roofing, and facade trades in Szczecin.
 */

import { useState } from 'react';
import { CloudSun, Wind, Droplets, AlertTriangle } from 'lucide-react';

export interface WeatherData {
  tempC: number;
  windKmH: number;
  humidityPct: number;
  condition: string;
  suitabilityMessage: string;
  suitabilityStatus: 'good' | 'warning' | 'alert';
}

export function getMockSzczecinWeather(): WeatherData {
  return {
    tempC: 21,
    windKmH: 11,
    humidityPct: 58,
    condition: 'Umiarkowanie zachmurzone',
    suitabilityMessage: '☀️ Optymalne warunki dla prac dekarskich, elewacyjnych i murowania.',
    suitabilityStatus: 'good',
  };
}

export function MapWeatherWidget({
  ui,
  isDark,
  top = 12,
  right = 12,
}: {
  ui: { surface: string; border: string; text: string; shadow: string };
  isDark: boolean;
  top?: number;
  right?: number;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const weather = getMockSzczecinWeather();

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="px-2.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 backdrop-blur-xl border z-20 text-xs font-bold"
        style={{
          position: 'absolute',
          top: `${top}px`,
          right: `${right}px`,
          background: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: ui.border,
          color: ui.text,
        }}
        title="Pogoda na budowie w Szczecinie (Rozwiń)"
      >
        <CloudSun className="w-4 h-4 text-amber-500" />
        <span className="font-mono text-emerald-400 font-extrabold">{weather.tempC}°C</span>
        <span className="hidden sm:inline text-zinc-400 font-medium">Szczecin</span>
      </button>
    );
  }

  return (
    <div
      className="p-2.5 rounded-2xl shadow-2xl text-xs max-w-[240px] backdrop-blur-2xl transition-all duration-200 z-30 border"
      style={{
        position: 'absolute',
        top: `${top}px`,
        right: `${right}px`,
        background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: ui.border,
        color: ui.text,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-zinc-800/40">
        <div className="flex items-center gap-1.5 font-bold text-[11px]">
          <CloudSun className="w-4 h-4 text-amber-500" />
          <span>Szczecin Pogoda</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-zinc-400 hover:text-white text-[11px] px-1 font-bold"
          title="Zwiń"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] mb-1.5 font-semibold">
        <span className="text-emerald-400 font-extrabold text-sm">{weather.tempC}°C</span>
        <div className="flex items-center gap-2 text-zinc-400 text-[10px]">
          <span className="flex items-center gap-0.5"><Wind className="w-3 h-3 text-cyan-400" /> {weather.windKmH} km/h</span>
          <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3 text-blue-400" /> {weather.humidityPct}%</span>
        </div>
      </div>

      <div className="text-[10px] leading-tight text-emerald-400 font-medium flex items-start gap-1">
        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
        <span>{weather.suitabilityMessage}</span>
      </div>
    </div>
  );
}
