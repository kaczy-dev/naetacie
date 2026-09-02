'use client';

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Crown,
  Layers,
  Sparkles,
  Phone,
  ExternalLink,
  Heart,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Flame,
  Check,
  Zap,
  X,
  ListFilter,
  Route,
  Compass,
  Navigation,
} from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { SZCZECIN_BRIDGES } from '@/components/map/EnterpriseMapHUD';
import { PriceTagMarker, getCategoryTheme, formatCompactPrice } from '@/components/map/PriceTagMarker';
import { BoostAdBadge } from '@/components/billing/BoostAdBadge';
import { OlxLinkActions } from '@/components/olx/OlxLinkActions';
import { triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';

export const SZCZECIN_DISTRICTS_LIST = [
  { id: 'centrum', name: 'Centrum' },
  { id: 'pogodno', name: 'Pogodno' },
  { id: 'niebuszewo', name: 'Niebuszewo' },
  { id: 'dabie', name: 'Dąbie' },
  { id: 'gumience', name: 'Gumieńce' },
  { id: 'warszewo', name: 'Warszewo' },
  { id: 'pomorzany', name: 'Pomorzany' },
  { id: 'prawobrzeze', name: 'Prawobrzeże' },
];

export interface DesktopCommandCenterProps {
  announcements: DisplayAnnouncement[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  hoveredId: string | null;
  onHoverId: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
  selectedCategories: Set<string>;
  onToggleCategory: (catKey: string) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onOpenSlideOver: (ad: DisplayAnnouncement) => void;
  onOpenProModal: () => void;
  renderMapComponent?: React.ReactNode;
}

const TRADE_CATEGORIES = [
  { key: 'budowa', label: 'Budowa', icon: '🧱' },
  { key: 'instalacje', label: 'Instalacje', icon: '⚡' },
  { key: 'wykończenia', label: 'Wykończenia', icon: '🎨' },
];

export const DesktopCommandCenter: React.FC<DesktopCommandCenterProps> = ({
  announcements,
  selectedId,
  onSelectId,
  hoveredId,
  onHoverId,
  searchQuery,
  onSearchChange,
  selectedDistrict,
  onSelectDistrict,
  selectedCategories,
  onToggleCategory,
  isFavorite,
  onToggleFavorite,
  onOpenSlideOver,
  onOpenProModal,
  renderMapComponent,
}) => {
  // Collapsible drawer states
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);
  const [showOffersDrawer, setShowOffersDrawer] = useState<boolean>(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState<boolean>(false);
  const [bridgesDropdownOpen, setBridgesDropdownOpen] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<'CARDS' | 'COMPACT'>('CARDS');
  const [is3DTilted, setIs3DTilted] = useState<boolean>(true);
  const [activeLayer, setActiveLayer] = useState<'STANDARD' | 'HEATMAP'>('STANDARD');
  const [minSalary, setMinSalary] = useState<number>(0);
  const [urgentOnly, setUrgentOnly] = useState<boolean>(false);

  const cardListRef = useRef<HTMLDivElement>(null);

  // Filter ads based on local state
  const filteredAds = useMemo(() => {
    return announcements.filter((ad) => {
      if (selectedDistrict && ad.location_text) {
        if (!ad.location_text.toLowerCase().includes(selectedDistrict.toLowerCase())) {
          return false;
        }
      }
      if (minSalary > 0 && typeof ad.price === 'number') {
        if (ad.price < minSalary) return false;
      }
      if (urgentOnly) {
        const isUrgent = /pilne|cito|zaraz|od zaraz/i.test(`${ad.title} ${ad.description}`);
        if (!isUrgent) return false;
      }
      return true;
    });
  }, [announcements, selectedDistrict, minSalary, urgentOnly]);

  // Selected ad details
  const activeAd = useMemo(() => {
    return announcements.find((a) => a.id === selectedId) || null;
  }, [announcements, selectedId]);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-zinc-950 text-white overflow-hidden select-none">
      {/* ========================================================================= */}
      {/* 🗺️ 1. HERO FULL-SCREEN MAP CANVAS */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 w-full h-full z-0">
        {renderMapComponent}
      </div>

      {/* ========================================================================= */}
      {/* 🕹️ 2. UNIFIED HARMONIOUS COMMAND TOOLBAR (Centered at the top) */}
      {/* ========================================================================= */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[96%] max-w-6xl pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between gap-2 p-2 rounded-2xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800 shadow-2xl shadow-black/80">
          
          {/* GROUP 1: Search & Location */}
          <div className="flex items-center gap-1.5 flex-1 max-w-md">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Szukaj: murarz, elektryk..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700/60 text-xs font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    onSearchChange('');
                    triggerHaptic(8);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* District Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setDistrictDropdownOpen(!districtDropdownOpen);
                  setBridgesDropdownOpen(false);
                  triggerHaptic(8);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                  selectedDistrict
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400'
                    : 'bg-zinc-900/90 border-zinc-700/60 text-zinc-300 hover:text-white'
                }`}
                title="Wybierz dzielnicę Szczecina"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="capitalize">{selectedDistrict || 'Dzielnice'}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {districtDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 p-1.5 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 shadow-2xl z-50 grid grid-cols-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDistrict(null);
                      setDistrictDropdownOpen(false);
                      triggerHaptic(8);
                    }}
                    className={`p-2 rounded-xl text-xs text-left font-bold transition ${
                      !selectedDistrict ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    Wszystkie dzielnice
                  </button>
                  {SZCZECIN_DISTRICTS_LIST.map((dist) => (
                    <button
                      key={dist.id}
                      type="button"
                      onClick={() => {
                        onSelectDistrict(dist.id);
                        setDistrictDropdownOpen(false);
                        triggerHaptic(8);
                      }}
                      className={`p-2 rounded-xl text-xs text-left font-medium transition ${
                        selectedDistrict === dist.id
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      {dist.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-[1px] h-6 bg-zinc-800 mx-1 hidden lg:block" />

          {/* GROUP 2: Trade Categories */}
          <div className="hidden lg:flex items-center gap-1">
            {TRADE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.has(cat.key);
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    playUiSound('pop');
                    onToggleCategory(cat.key);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-6 bg-zinc-800 mx-1 hidden md:block" />

          {/* GROUP 3: Map Tools & Traffic (Mosty Szczecina + 3D Tilt + Heatmap) */}
          <div className="flex items-center gap-1">
            {/* Mosty Szczecina Status Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setBridgesDropdownOpen(!bridgesDropdownOpen);
                  setDistrictDropdownOpen(false);
                  triggerHaptic(8);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white transition"
                title="Status przejazdu przez mosty Szczecina"
              >
                <Route className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-medium">Mosty:</span>
                <span className="font-mono text-emerald-400 font-bold">+3m</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>

              {bridgesDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 p-3 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 shadow-2xl z-50 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-xs font-bold text-zinc-300">
                    <span>Przeprawy przez Odrę</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Na żywo</span>
                  </div>
                  {SZCZECIN_BRIDGES.map((b) => (
                    <div
                      key={b.name}
                      className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80"
                    >
                      <span className="text-zinc-300">{b.name}</span>
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          b.status === 'GREEN' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                        }`}
                      >
                        +{b.delayMin} min
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3D Tilt */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setIs3DTilted(!is3DTilted);
              }}
              className={`p-1.5 px-2 rounded-xl text-xs font-extrabold flex items-center gap-1 border transition ${
                is3DTilted
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-xs'
                  : 'bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:text-white'
              }`}
              title="Przełącz nachylenie 3D"
            >
              <Compass className={`w-3.5 h-3.5 ${is3DTilted ? 'rotate-45' : ''} transition-transform`} />
              <span className="hidden xl:inline">{is3DTilted ? '3D' : '2D'}</span>
            </button>

            {/* Heatmap */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setActiveLayer(activeLayer === 'HEATMAP' ? 'STANDARD' : 'HEATMAP');
              }}
              className={`p-1.5 rounded-xl text-xs font-bold border transition ${
                activeLayer === 'HEATMAP'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:text-white'
              }`}
              title="Mapa cieplna stawek (Heatmap)"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-zinc-800 mx-1" />

          {/* GROUP 4: Drawers & PRO CTA */}
          <div className="flex items-center gap-1.5">
            {/* Filters Drawer Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowFiltersDrawer(!showFiltersDrawer);
                setBridgesDropdownOpen(false);
                setDistrictDropdownOpen(false);
                triggerHaptic(10);
                playUiSound('toggle');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                showFiltersDrawer || minSalary > 0 || urgentOnly
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Filtry</span>
            </button>

            {/* Offers Drawer Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowOffersDrawer(!showOffersDrawer);
                setBridgesDropdownOpen(false);
                setDistrictDropdownOpen(false);
                triggerHaptic(10);
                playUiSound('toggle');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition ${
                showOffersDrawer
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 border-amber-400'
                  : 'bg-zinc-900/90 border-zinc-700/60 text-zinc-300 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Oferty ({filteredAds.length})</span>
            </button>

            {/* PRO Tier Button */}
            <button
              type="button"
              onClick={onOpenProModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-extrabold uppercase transition"
            >
              <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="hidden sm:inline">PRO</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📂 3. COLLAPSIBLE FLOATING LEFT FILTERS DRAWER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showFiltersDrawer && (
          <motion.div
            initial={{ opacity: 0, x: -40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-18 left-4 z-40 w-72 p-4 rounded-3xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-black tracking-wider uppercase text-amber-400">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Zaawansowane Filtry</span>
              </div>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Minimum Salary Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wider text-[11px]">Min. Stawka</span>
                <span className="font-mono font-bold text-amber-400">
                  {minSalary > 0 ? `${minSalary.toLocaleString('pl-PL')} zł` : 'Wszystkie'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={15000}
                step={500}
                value={minSalary}
                onChange={(e) => setMinSalary(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Urgency Toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setUrgentOnly(!urgentOnly);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold border transition ${
                urgentOnly
                  ? 'bg-red-500/20 border-red-500/50 text-red-300 font-bold'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-400" />
                <span>Tylko na cito / Pilne</span>
              </span>
              {urgentOnly && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
            </button>

            {/* Reset Filters */}
            {(selectedDistrict || minSalary > 0 || urgentOnly) && (
              <button
                type="button"
                onClick={() => {
                  onSelectDistrict(null);
                  setMinSalary(0);
                  setUrgentOnly(false);
                  triggerHaptic(8);
                }}
                className="w-full py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition"
              >
                Resetuj wszystkie filtry
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 📋 4. COLLAPSIBLE FLOATING RIGHT OFFER STREAM DRAWER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showOffersDrawer && (
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-3 right-3 bottom-3 z-40 w-96 flex flex-col rounded-3xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 shadow-2xl p-3.5 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black tracking-wider uppercase text-zinc-200">
                  Oferty ({filteredAds.length})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setViewMode(viewMode === 'CARDS' ? 'COMPACT' : 'CARDS');
                    triggerHaptic(8);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
                  title="Przełącz gęstość widoku"
                >
                  {viewMode === 'CARDS' ? <TableIcon className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setShowOffersDrawer(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
                  title="Zwiń listę ofert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Cards */}
            <div ref={cardListRef} className="flex-1 overflow-y-auto no-scrollbar space-y-2 mt-2 pr-1">
              {filteredAds.map((ad) => {
                const isSelected = ad.id === selectedId;
                const isHovered = ad.id === hoveredId;
                const fav = isFavorite(ad.id);
                const theme = getCategoryTheme(ad.category);

                return (
                  <motion.div
                    key={ad.id}
                    onMouseEnter={() => onHoverId(ad.id)}
                    onMouseLeave={() => onHoverId(null)}
                    onClick={() => {
                      triggerHaptic(10);
                      playUiSound('pop');
                      onSelectId(ad.id);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-zinc-900 border-amber-500 ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10'
                        : isHovered
                        ? 'bg-zinc-900/80 border-zinc-700'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{theme.icon}</span>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {ad.source_portal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-emerald-400">
                          {typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł` : ad.price || 'Wycena'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(10);
                            playUiSound('favorite');
                            onToggleFavorite(ad.id);
                          }}
                          className="text-zinc-500 hover:text-red-400 transition"
                        >
                          <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-white line-clamp-1 mb-1">{ad.title}</h3>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-800/60">
                      <span className="truncate">{ad.location_text || 'Szczecin'}</span>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <BoostAdBadge adId={ad.id} adTitle={ad.title} />
                        <OlxLinkActions ad={ad} variant="compact" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 🌟 5. FLOATING BOTTOM SPOTLIGHT CARD (When an Offer is Selected on Map) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeAd && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl p-3.5 rounded-3xl bg-zinc-950/95 backdrop-blur-2xl border-2 border-amber-500/50 shadow-2xl shadow-black flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <span>{activeAd.location_text || 'Szczecin'}</span>
                <span>•</span>
                <span className="font-mono text-emerald-400 font-extrabold text-sm">
                  {typeof activeAd.price === 'number' ? `${activeAd.price.toLocaleString('pl-PL')} zł` : activeAd.price || 'Wycena'}
                </span>
                {activeAd.source_portal && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {activeAd.source_portal}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white truncate mt-0.5">{activeAd.title}</h4>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenSlideOver(activeAd)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold transition shadow-md"
              >
                Szczegóły
              </button>
              <OlxLinkActions ad={activeAd} variant="compact" />
              <button
                type="button"
                onClick={() => onSelectId(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Zamknij podgląd"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
