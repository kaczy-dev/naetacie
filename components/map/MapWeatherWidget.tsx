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

export function MapWeatherWidget({ ui, isDark }: { ui: { surface: string; border: string; text: string; shadow: string }; isDark: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const weather = getMockSzczecinWeather();

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-7 h-7 text-[10px] md:w-8 md:h-8 rounded-lg shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '10px',
          zIndex: 10,
          background: ui.surface,
          border: `1px solid ${ui.border}`,
          color: ui.text,
        }}
        title="Pogoda na budowie"
      >
        ⛅
      </button>
    );
  }

  return (
    <div
      className="p-2.5 rounded-xl shadow-lg text-xs max-w-[240px] backdrop-blur-md transition-all duration-200"
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '10px',
        zIndex: 10,
        background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        border: `1px solid ${ui.border}`,
        color: ui.text,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-border/30">
        <div className="flex items-center gap-1.5 font-bold text-[11px]">
          <CloudSun className="w-4 h-4 text-amber-500" />
          <span>Szczecin Pogoda</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-muted-foreground hover:text-foreground text-[10px] px-1"
          title="Zwiń"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] mb-1.5 font-semibold">
        <span className="text-emerald-500 font-extrabold text-sm">{weather.tempC}°C</span>
        <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
          <span className="flex items-center gap-0.5"><Wind className="w-3 h-3" /> {weather.windKmH} km/h</span>
          <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" /> {weather.humidityPct}%</span>
        </div>
      </div>

      <div className="text-[10px] leading-tight text-emerald-600 dark:text-emerald-400 font-medium flex items-start gap-1">
        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
        <span>{weather.suitabilityMessage}</span>
      </div>
    </div>
  );
}
