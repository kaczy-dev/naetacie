'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  MapPin,
  Flame,
  HardDrive,
  Download,
  Trash2,
  Sparkles,
  Car,
  Bike,
  Bus,
  Footprints,
  Compass,
  Layers,
  ShieldCheck,
  RefreshCw,
  Bell,
  Smartphone,
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { cn, triggerHaptic, exportApplicationsToCSV } from '@/lib/utils';
import { useToast } from '@/components/feedback/ToastProvider';

export function AppSettingsContent() {
  const { mode, setMode } = useTheme();
  const { show } = useToast();

  // Settings State
  const [searchRadius, setSearchRadius] = useState<number>(25);
  const [minSalary, setMinSalary] = useState<number>(40);
  const [commuteMode, setCommuteMode] = useState<'car' | 'transit' | 'bike' | 'walk'>('car');
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [animations3D, setAnimations3D] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(6);
  const [defaultPortal, setDefaultPortal] = useState<string>('all');
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const radius = localStorage.getItem('naetacie_pref_radius');
      if (radius) setSearchRadius(Number(radius));

      const salary = localStorage.getItem('naetacie_pref_salary');
      if (salary) setMinSalary(Number(salary));

      const commute = localStorage.getItem('naetacie_pref_commute');
      if (commute) setCommuteMode(commute as any);

      const sound = localStorage.getItem('naetacie_pref_sound');
      if (sound !== null) setSoundEffects(sound === 'true');

      const anim = localStorage.getItem('naetacie_pref_anim3d');
      if (anim !== null) setAnimations3D(anim === 'true');

      const haptic = localStorage.getItem('naetacie_pref_haptics');
      if (haptic !== null) setHapticsEnabled(haptic === 'true');

      const portal = localStorage.getItem('naetacie_pref_portal');
      if (portal) setDefaultPortal(portal);
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }, []);

  const saveSetting = (key: string, value: any) => {
    try {
      localStorage.setItem(key, String(value));
      triggerHaptic(10);
    } catch (e) {
      console.warn('Failed to save setting:', e);
    }
  };

  const handleClearCache = () => {
    setIsClearing(true);
    triggerHaptic(20);
    setTimeout(() => {
      try {
        localStorage.removeItem('naetacie_geo_cache');
        localStorage.removeItem('nominatim_geo_cache');
        localStorage.removeItem('naetacie_recent_searches');
        localStorage.removeItem('last-auto-scrape');
        show('success', 'Pamięć podręczna mapy i geodanych została wyczyszczona!');
      } catch {
        show('error', 'Wystąpił problem podczas czyszczenia cache.');
      } finally {
        setIsClearing(false);
      }
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
      {/* ─── SEKСJA 1: Wygląd, Motyw & Efekty ─────────────────────── */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/40">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Motyw Graficzny i Efekty Wizualne</h3>
            <p className="text-xs text-muted-foreground">Dostosuj kontrast, kolory i odgłosy aplikacji</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'light', label: 'Jasny', icon: Sun },
            { id: 'dark', label: 'Ciemny', icon: Moon },
            { id: 'oled', label: 'OLED Black', icon: Moon },
            { id: 'system', label: 'Auto (System)', icon: Monitor },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = mode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  triggerHaptic(12);
                  setMode(t.id as any);
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary/15 border-primary text-primary shadow-xs font-extrabold ring-1 ring-primary/30'
                    : 'bg-accent/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Sound FX */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-accent/20">
            <div className="flex items-center gap-2.5">
              {soundEffects ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
              <div>
                <span className="text-xs font-semibold text-foreground">Dźwięki Interfejsu</span>
                <p className="text-[11px] text-muted-foreground">Sygnały audio przy stawkach i polubieniach</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEffects}
              onChange={(e) => {
                setSoundEffects(e.target.checked);
                saveSetting('naetacie_pref_sound', e.target.checked);
              }}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>

          {/* Haptics */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-accent/20">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-primary" />
              <div>
                <span className="text-xs font-semibold text-foreground">Wibracje Dotykowe (Haptics)</span>
                <p className="text-[11px] text-muted-foreground">Wibracje na telefonie przy kliknięciach</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hapticsEnabled}
              onChange={(e) => {
                setHapticsEnabled(e.target.checked);
                saveSetting('naetacie_pref_haptics', e.target.checked);
              }}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ─── SEKСJA 2: Wyszukiwanie Ofert & Parametry Rynku ────────── */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/40">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Domyślne Parametry Szukania Pracy</h3>
            <p className="text-xs text-muted-foreground">Zasięg, stawki minimalne i preferowany portal</p>
          </div>
        </div>

        {/* Search Radius Slider */}
        <div className="p-3.5 rounded-xl border border-border/50 bg-accent/20 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">Zasięg poszukiwań ze Szczecina</span>
            <span className="font-extrabold text-primary">{searchRadius} km</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={searchRadius}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSearchRadius(val);
              saveSetting('naetacie_pref_radius', val);
            }}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>5 km (Tylko Szczecin)</span>
            <span>25 km (Aglomeracja)</span>
            <span>60 km (Region Zachodniopomorski)</span>
          </div>
        </div>

        {/* Min Salary Alert Slider */}
        <div className="p-3.5 rounded-xl border border-border/50 bg-accent/20 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              Preferowana minimalna stawka godzinowa
            </span>
            <span className="font-black text-amber-500 text-sm">{minSalary} zł / h</span>
          </div>
          <input
            type="range"
            min="25"
            max="120"
            step="5"
            value={minSalary}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMinSalary(val);
              saveSetting('naetacie_pref_salary', val);
            }}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>25 zł/h (Pomocnik)</span>
            <span>45 zł/h (Fachowiec)</span>
            <span>80+ zł/h (Majster / Brygadzista)</span>
          </div>
        </div>

        {/* Default Portal & Commute */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Domyślny Portal Źródłowy
            </label>
            <select
              value={defaultPortal}
              onChange={(e) => {
                setDefaultPortal(e.target.value);
                saveSetting('naetacie_pref_portal', e.target.value);
              }}
              className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-border/70 bg-background cursor-pointer"
            >
              <option value="all">🌐 Wszystkie (Multi-Portal Aggregator)</option>
              <option value="olx">OLX Praca</option>
              <option value="pracuj">Pracuj.pl</option>
              <option value="indeed">Indeed Polska</option>
              <option value="oferteo">Oferteo Zlecenia</option>
              <option value="fixly">Fixly</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Środek Dojazdu na Budowę
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'car', label: 'Auto', icon: Car },
                { id: 'transit', label: 'ZTM', icon: Bus },
                { id: 'bike', label: 'Rower', icon: Bike },
                { id: 'walk', label: 'Pieszo', icon: Footprints },
              ].map((m) => {
                const Icon = m.icon;
                const isActive = commuteMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCommuteMode(m.id as any);
                      saveSetting('naetacie_pref_commute', m.id);
                    }}
                    className={cn(
                      'flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-accent/40 border-border/50 text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SEKСJA 3: Mapa 3D WebGL & Pamięć Geodanych ───────────── */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/40">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Mapa 3D WebGL Szczecina</h3>
            <p className="text-xs text-muted-foreground">Silnik cieni słońca, bryły 3D budynków i pamięć offline</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-accent/20">
          <div>
            <span className="text-xs font-semibold text-foreground">Akceleracja GPU dla brył 3D</span>
            <p className="text-[11px] text-muted-foreground">Trójwymiarowe elewacje budynków i perspektywa 62°</p>
          </div>
          <input
            type="checkbox"
            checked={animations3D}
            onChange={(e) => {
              setAnimations3D(e.target.checked);
              saveSetting('naetacie_pref_anim3d', e.target.checked);
            }}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
        </div>

        <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HardDrive className="w-4 h-4 text-primary" />
            <span>Pamięć podręczna: 40+ dzielnic offline</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={isClearing}
              className="flex-1 sm:flex-initial text-xs border-red-500/30 text-red-500 hover:bg-red-500/10 gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isClearing ? 'Czyszczenie...' : 'Wyczyść Geocache'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportApplicationsToCSV([], () => 'Złożona')}
              className="flex-1 sm:flex-initial text-xs gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              Eksportuj Aplikacje (CSV)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
