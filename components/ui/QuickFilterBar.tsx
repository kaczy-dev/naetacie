'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Flame, Zap, MapPin, Briefcase, Filter, X, Sparkles, SlidersHorizontal, RefreshCw, Sun } from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

export interface QuickFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'high_pay', label: 'Wysokie stawki (>40 zł/h)', icon: Flame, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { id: 'today', label: 'Dodane dzisiaj', icon: Zap, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { id: 'near_me', label: 'Szczecin & Okolice', icon: MapPin, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'finishing', label: 'Wykończenia', icon: Briefcase, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { id: 'installations', label: 'Instalacje Wod-Kan/Elektryka', icon: Sparkles, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30' },
];

interface QuickFilterBarProps {
  onSearchChange?: (query: string) => void;
  onFilterToggle?: (filterId: string) => void;
  activeFilters?: string[];
  totalOffersCount?: number;
  onRefresh?: () => void;
}

export function QuickFilterBar({
  onSearchChange,
  onFilterToggle,
  activeFilters = [],
  totalOffersCount = 750,
  onRefresh,
}: QuickFilterBarProps) {
  const { outdoorMode, setOutdoorMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearchChange?.(val);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearchChange?.('');
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="w-full bg-card/60 backdrop-blur-md border-b border-border/50 p-3 sm:p-4 space-y-3 shadow-sm transition-all duration-300">
      {/* Top Search & QOL Action Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Animated Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Szukaj po stanowisku (np. Murarz, Elektryk, Dekarz)..."
            className="w-full pl-10 pr-9 py-2.5 bg-background/80 border border-border/60 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner placeholder:text-muted-foreground/60"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Offers Count Badge & Refresh QOL */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary whitespace-nowrap shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{totalOffersCount} zweryfikowanych ofert</span>
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={() => {
                triggerHaptic(10);
                setOutdoorMode(!outdoorMode);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm touch-manipulation cursor-pointer border',
                outdoorMode
                  ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/20 font-black'
                  : 'bg-accent hover:bg-accent/80 text-foreground border-border'
              )}
              title="Tryb Na Budowę (Wysoki kontrast w słońcu)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden xs:inline">☀️ Budowa</span>
            </motion.button>

            <motion.button
              onClick={handleRefreshClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent hover:bg-accent/80 text-xs font-medium text-foreground transition-all shadow-sm touch-manipulation cursor-pointer border border-border"
              title="Odśwież najnowsze oferty"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-primary', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Odśwież</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Quick Filter Chips Scrollable Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
          <SlidersHorizontal className="w-3 h-3" /> Filtr:
        </span>

        {QUICK_FILTERS.map((f) => {
          const isActive = activeFilters.includes(f.id);
          const Icon = f.icon;

          return (
            <motion.button
              key={f.id}
              onClick={() => onFilterToggle?.(f.id)}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 touch-manipulation shadow-sm',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-primary/25'
                  : `bg-card/90 text-foreground hover:bg-accent border-border ${f.color}`
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary-foreground' : '')} />
              <span>{f.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
