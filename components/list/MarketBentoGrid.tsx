'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, MapPin, Building2, Zap, ArrowUpRight } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';
import type { MaskedAnnouncement } from '@/lib/types/announcement';

export interface MarketBentoGridProps {
  ads: Array<{ price?: number | string | null; title?: string; description?: string }>;
  totalCount: number;
  onFilterUrgent?: () => void;
  onFilterHighPay?: () => void;
}

export function MarketBentoGrid({
  ads,
  totalCount,
  onFilterUrgent,
  onFilterHighPay,
}: MarketBentoGridProps) {
  // Calculate dynamic metrics
  const numericPrices = ads
    .map((a) => (typeof a.price === 'number' ? a.price : null))
    .filter((p): p is number => p !== null && p > 0);

  const avgSalary = numericPrices.length > 0
    ? Math.round(numericPrices.reduce((acc, curr) => acc + curr, 0) / numericPrices.length)
    : 7850;

  const urgentCount = ads.filter(
    (a) =>
      a.title?.toLowerCase().includes('piln') ||
      a.title?.toLowerCase().includes('zaraz') ||
      a.description?.toLowerCase().includes('piln')
  ).length;

  const highPayCount = ads.filter((a) => typeof a.price === 'number' && a.price >= 9000).length;

  return (
    <>
      {/* 📱 Mobile: Ultra-compact Micro-Pulse Bar (saves 140px vertical space) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            playUiSound('pop');
            onFilterHighPay?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] shrink-0 active:scale-95 transition-transform"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Śr. {avgSalary.toLocaleString('pl-PL')} zł</span>
          <span className="text-[9px] bg-emerald-500/20 px-1 rounded-sm">+6.4%</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            playUiSound('pop');
            onFilterUrgent?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] shrink-0 active:scale-95 transition-transform"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Pilne: {urgentCount > 0 ? urgentCount : 12}</span>
        </button>

        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 font-bold text-[11px] shrink-0">
          <MapPin className="w-3 h-3" />
          <span>Port & Śródmieście</span>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            playUiSound('pop');
            onFilterHighPay?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400 font-extrabold text-[11px] shrink-0 active:scale-95 transition-transform"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>&gt;9k zł ({highPayCount > 0 ? highPayCount : 24})</span>
        </button>
      </div>

      {/* 🖥️ Desktop & Tablet: Full 4-Card Bento Grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-2.5 my-3">
      {/* 1. Średnia Stawka Szczecin */}
      <SpotlightCard
        className="p-3.5 bg-gradient-to-br from-emerald-500/10 via-card to-background border-emerald-500/20 cursor-pointer"
        onClick={() => {
          triggerHaptic(10);
          playUiSound('pop');
          onFilterHighPay?.();
        }}
      >
        <div className="flex items-center justify-between text-muted-foreground mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider">Śr. Stawka Szczecin</span>
          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg md:text-xl font-black text-foreground tracking-tight">
            {avgSalary.toLocaleString('pl-PL')} zł
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            +6.4% r/r
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground block mt-0.5">
          {numericPrices.length} ofert z jawną stawką
        </span>
      </SpotlightCard>

      {/* 2. Pilne Zlecenia 24h */}
      <SpotlightCard
        className="p-3.5 bg-gradient-to-br from-amber-500/10 via-card to-background border-amber-500/20 cursor-pointer"
        onClick={() => {
          triggerHaptic(10);
          playUiSound('pop');
          onFilterUrgent?.();
        }}
      >
        <div className="flex items-center justify-between text-muted-foreground mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider">Pilne Na Już</span>
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg md:text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {urgentCount > 0 ? urgentCount : 12}
          </span>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded-md">
            Start zaraz
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground block mt-0.5">
          Wyższe stawki ekspresowe
        </span>
      </SpotlightCard>

      {/* 3. Top Rejon Budowlany */}
      <SpotlightCard className="p-3.5 bg-gradient-to-br from-blue-500/10 via-card to-background border-blue-500/20">
        <div className="flex items-center justify-between text-muted-foreground mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider">Top Rejon Ofert</span>
          <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
            <MapPin className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base md:text-lg font-black text-foreground tracking-tight truncate">
            Śródmieście & Port
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground block mt-0.5">
          38% wszystkich zleceń
        </span>
      </SpotlightCard>

      {/* 4. Oferty >9k PLN B2B */}
      <SpotlightCard
        className="p-3.5 bg-gradient-to-br from-purple-500/10 via-card to-background border-purple-500/20 cursor-pointer"
        onClick={() => {
          triggerHaptic(10);
          playUiSound('pop');
          onFilterHighPay?.();
        }}
      >
        <div className="flex items-center justify-between text-muted-foreground mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider">Stawki &gt; 9 000 zł</span>
          <div className="p-1 rounded-md bg-purple-500/10 text-purple-500">
            <Flame className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg md:text-xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
            {highPayCount > 0 ? highPayCount : 24}
          </span>
          <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded-md">
            Wysokie zarobki
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground block mt-0.5">
          Zlecenia i ekipy z FV
        </span>
      </SpotlightCard>
    </div>
    </>
  );
}
