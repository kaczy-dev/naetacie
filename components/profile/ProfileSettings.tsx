'use client';

/**
 * Enterprise-grade Profile & Settings Dashboard with Read-Only Guest Mode,
 * interactive QOL sliders, personalization toggles, activity stats, and data export.
 */

import { useState, useEffect } from 'react';
import {
  Mail,
  Sparkles,
  Sliders,
  MapPin,
  Eye,
  Car,
  Bike,
  Footprints,
  Bus,
  Download,
  CheckCircle2,
  Moon,
  HardDrive,
  RefreshCw,
  LogOut,
  LogIn,
  Layers,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { triggerHaptic } from '@/lib/utils';

export function ProfileSettings() {
  const { user, profile, isGuest, signOut } = useAuth();

  // ─── QOL PREFERENCE SLIDERS & STATES ──────────────────────────────────────
  const [searchRadius, setSearchRadius] = useState<number>(25);
  const [mapDefaultZoom, setMapDefaultZoom] = useState<number>(11);
  const [minSalaryAlert, setMinSalaryAlert] = useState<number>(5000);
  const [uiDensity, setUiDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');
  const [commuteMode, setCommuteMode] = useState<'walk' | 'bike' | 'car' | 'transit'>('car');

  // ─── TOGGLES ─────────────────────────────────────────────────────────────
  const [pushNotifications, setPushNotifications] = useState<boolean>(true);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [autoFitBounds, setAutoFitBounds] = useState<boolean>(true);

  // ─── STATS ───────────────────────────────────────────────────────────────
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [applicationsCount, setApplicationsCount] = useState<number>(0);
  const [clearingCache, setClearingCache] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const radius = localStorage.getItem('naetacie_pref_radius');
      if (radius) setSearchRadius(Number(radius));

      const zoom = localStorage.getItem('naetacie_pref_zoom');
      if (zoom) setMapDefaultZoom(Number(zoom));

      const salary = localStorage.getItem('naetacie_pref_salary');
      if (salary) setMinSalaryAlert(Number(salary));

      const density = localStorage.getItem('naetacie_pref_density');
      if (density) setUiDensity(density as 'compact' | 'comfortable' | 'spacious');

      const mode = localStorage.getItem('naetacie_pref_commute');
      if (mode) setCommuteMode(mode as 'walk' | 'bike' | 'car' | 'transit');

      const push = localStorage.getItem('naetacie_pref_push');
      if (push !== null) setPushNotifications(push === 'true');

      const sound = localStorage.getItem('naetacie_pref_sound');
      if (sound !== null) setSoundEffects(sound === 'true');

      const autoFit = localStorage.getItem('naetacie_pref_autofit');
      if (autoFit !== null) setAutoFitBounds(autoFit === 'true');

      // Stats
      const favs = localStorage.getItem('naetacie_favorites');
      if (favs) {
        const parsed = JSON.parse(favs);
        setFavoritesCount(Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length);
      }

      const apps = localStorage.getItem('naetacie_applications');
      if (apps) {
        const parsed = JSON.parse(apps);
        setApplicationsCount(Object.keys(parsed).length);
      }
    } catch (e) {
      console.warn('Failed to load local preferences:', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper save handlers
  const updatePref = (key: string, val: unknown, setter: (v: any) => void) => {
    setter(val);
    try {
      localStorage.setItem(key, String(val));
      triggerHaptic(8);
      showToast('Ustawienia zapisane');
    } catch (e) {
      console.error(e);
    }
  };

  // Export applications CSV
  const handleExportCSV = () => {
    try {
      const stored = localStorage.getItem('naetacie_applications');
      const apps = stored ? JSON.parse(stored) : {};
      const keys = Object.keys(apps);

      if (keys.length === 0) {
        showToast('Brak zarejestrowanych aplikacji do wyeksportowania.');
        return;
      }

      let csv = 'ID Ogłoszenia;Status;Data zmiany\n';
      keys.forEach((k) => {
        csv += `"${k}";"${apps[k].status || 'Aplikowano'}";"${apps[k].updatedAt || new Date().toISOString()}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `naetacie_raport_aplikacji_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      showToast('Raport CSV został pobrany!');
    } catch {
      showToast('Błąd podczas generowania raportu.');
    }
  };

  // Export favorites JSON
  const handleExportFavorites = () => {
    try {
      const favs = localStorage.getItem('naetacie_favorites');
      if (!favs || favs === '[]' || favs === '{}') {
        showToast('Brak ulubionych ofert do wyeksportowania.');
        return;
      }

      const blob = new Blob([favs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `naetacie_ulubione_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      showToast('Ulubione zostały wyeksportowane!');
    } catch {
      showToast('Błąd eksportu ulubionych.');
    }
  };

  // Clear Cache
  const handleClearCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      try {
        localStorage.removeItem('naetacie_geo_cache');
        localStorage.removeItem('naetacie_map_tiles_cache');
        setClearingCache(false);
        showToast('Pamięć podręczna mapy została wyczyszczona!');
      } catch {
        setClearingCache(false);
      }
    }, 500);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 text-foreground pb-24">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-500" /> Profil i Ustawienia
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Zarządzaj kontem, dostosuj mapę i suwaki preferencji QOL.
          </p>
        </div>
      </div>

      {/* ─── 1. USER IDENTITY & READ-ONLY GUEST BANNER ───────────────────────── */}
      {isGuest || !user ? (
        <div className="p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-background shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Eye className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Tryb Odczytu (Read-Only)
                </span>
                <h3 className="font-bold text-base mt-0.5">Konto Gościa</h3>
              </div>
            </div>
            <a
              href="/login"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md flex items-center gap-1.5 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" /> Zaloguj / Utwórz konto
            </a>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Masz pełny, nieograniczony dostęp do przeglądania mapy, filtrowania ofert i sprawdzania dojazdów.
            Zaloguj się, aby synchronizować ulubione oferty w chmurze i otrzymywać powiadomienia na email.
          </p>
        </div>
      ) : (
        <div className="p-5 rounded-3xl border border-border/80 bg-card shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-lg border border-primary/20">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : user.email?.[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {profile?.display_name || 'Użytkownik naEtacie'}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/70" /> {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {profile?.tier === 'premium' ? '⭐ Premium' : 'Plan Darmowy'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. QUICK ACTIVITY STATS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-border/60 bg-card/60 space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Zapisane Ulubione</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{favoritesCount}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/60 bg-card/60 space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Wysłane Aplikacje</span>
          <p className="text-xl font-extrabold text-primary">{applicationsCount}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl border border-border/60 bg-card/60 space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Konta</span>
          <p className="text-sm font-bold text-foreground truncate">
            {isGuest ? '👀 Odczyt (Gość)' : '✅ Aktywne'}
          </p>
        </div>
      </div>

      {/* ─── 3. INTERACTIVE QOL SLIDERS & PREFERENCES ───────────────────────── */}
      <div className="p-5 rounded-3xl border border-border/80 bg-card shadow-md space-y-6">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-500" /> Suwaki Preferencji QOL (Personalizacja)
        </h3>

        {/* Slider 1: Search Radius */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-foreground">
              <MapPin className="w-4 h-4 text-primary" /> Domyślny promień szukania:
            </span>
            <span className="text-primary font-extrabold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              {searchRadius} km
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={searchRadius}
            onChange={(e) => updatePref('naetacie_pref_radius', Number(e.target.value), setSearchRadius)}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
            <span>5 km (Lokalnie)</span>
            <span>50 km</span>
            <span>100 km (Region)</span>
          </div>
        </div>

        {/* Slider 2: Default Map Zoom */}
        <div className="space-y-2 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-foreground">
              <Layers className="w-4 h-4 text-emerald-500" /> Domyślne powiększenie mapy (Zoom):
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Level {mapDefaultZoom}
            </span>
          </div>
          <input
            type="range"
            min={8}
            max={16}
            step={1}
            value={mapDefaultZoom}
            onChange={(e) => updatePref('naetacie_pref_zoom', Number(e.target.value), setMapDefaultZoom)}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
            <span>Zoom 8 (Województwo)</span>
            <span>Zoom 12 (Miasto)</span>
            <span>Zoom 16 (Ulica)</span>
          </div>
        </div>

        {/* Slider 3: Minimum Salary Threshold */}
        <div className="space-y-2 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" /> Próg wynagrodzenia dla alertów:
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-extrabold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              od {minSalaryAlert.toLocaleString('pl-PL')} zł/mc
            </span>
          </div>
          <input
            type="range"
            min={3000}
            max={25000}
            step={500}
            value={minSalaryAlert}
            onChange={(e) => updatePref('naetacie_pref_salary', Number(e.target.value), setMinSalaryAlert)}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
            <span>3 000 zł</span>
            <span>12 000 zł</span>
            <span>25 000 zł</span>
          </div>
        </div>

        {/* Commute Transport Mode Selector */}
        <div className="space-y-2 pt-3 border-t border-border/50">
          <span className="text-xs font-bold text-foreground block">
            Domyślny środek transportu dla czasu dojazdu:
          </span>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'walk', label: 'Pieszo', icon: Footprints },
              { id: 'bike', label: 'Rower', icon: Bike },
              { id: 'car', label: 'Auto', icon: Car },
              { id: 'transit', label: 'ZTM', icon: Bus },
            ].map((item) => {
              const Icon = item.icon;
              const active = commuteMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => updatePref('naetacie_pref_commute', item.id, setCommuteMode)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-card border-border/60 hover:bg-accent text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 4. DISPLAY & MOTYW ────────────────────────────────────────────── */}
      <div className="p-5 rounded-3xl border border-border/80 bg-card shadow-md space-y-4">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Moon className="w-4 h-4 text-primary" /> Wygląd i Dźwięk
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Motyw kolorystyczny</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-foreground block">Powiadomienia Push PWA</span>
            <span className="text-[11px] text-muted-foreground">Alert o nowych ofertach spełniających kryteria</span>
          </div>
          <button
            onClick={() => updatePref('naetacie_pref_push', !pushNotifications, setPushNotifications)}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              pushNotifications ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                pushNotifications ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-foreground block">Automatyczne dopasowanie granic mapy</span>
            <span className="text-[11px] text-muted-foreground">Zoom na obszar wyszukiwanych markerów</span>
          </div>
          <button
            onClick={() => updatePref('naetacie_pref_autofit', !autoFitBounds, setAutoFitBounds)}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              autoFitBounds ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                autoFitBounds ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-foreground block">Gęstość Interfejsu (UI Density)</span>
            <span className="text-[11px] text-muted-foreground">Kompaktowy vs komfortowy układy kart</span>
          </div>
          <div className="flex gap-1">
            {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
              <button
                key={d}
                onClick={() => updatePref('naetacie_pref_density', d, setUiDensity)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                  uiDensity === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                {d === 'compact' ? 'Kompakt' : d === 'comfortable' ? 'Komfort' : 'Duży'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-foreground block">Efekty Dźwiękowe i Haptyka</span>
            <span className="text-[11px] text-muted-foreground">Wibracje kciuka przy klikaniu w piny i arkusz</span>
          </div>
          <button
            onClick={() => updatePref('naetacie_pref_sound', !soundEffects, setSoundEffects)}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              soundEffects ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                soundEffects ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ─── 5. EXPORT & DATA MANAGEMENT ───────────────────────────────────── */}
      <div className="p-5 rounded-3xl border border-border/80 bg-card shadow-md space-y-4">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-500" /> Eksport i Zarządzanie Danymi
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-accent border border-border/80 rounded-2xl text-xs font-bold text-foreground active:scale-95 transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-primary" /> Raport aplikacji (CSV)
          </button>

          <button
            onClick={handleExportFavorites}
            className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-accent border border-border/80 rounded-2xl text-xs font-bold text-foreground active:scale-95 transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-500" /> Eksport ulubionych (JSON)
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="w-full flex items-center justify-center gap-2 p-3 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-2xl text-xs font-bold text-destructive active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${clearingCache ? 'animate-spin' : ''}`} />
            {clearingCache ? 'Czyszczenie...' : 'Wyczyść pamięć podręczną mapy (Geo-Cache)'}
          </button>
        </div>
      </div>

      {/* ─── 6. SIGN OUT / LOGIN BUTTON ─────────────────────────────────────── */}
      <div className="pt-2">
        {user ? (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-destructive text-destructive-foreground font-extrabold text-xs shadow-md active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4" /> Wyloguj się
          </button>
        ) : (
          <a
            href="/login"
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xs shadow-md active:scale-95 transition-all"
          >
            <LogIn className="w-4 h-4" /> Przejdź do strony logowania
          </a>
        )}
      </div>
    </div>
  );
}

export default ProfileSettings;
