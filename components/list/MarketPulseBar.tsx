'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Briefcase, Zap } from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';

export interface MarketPulseBarProps {
  ads: DisplayAnnouncement[];
  totalCount: number;
}

export function MarketPulseBar({ ads, totalCount }: MarketPulseBarProps) {
  const prices = ads
    .map((a) => (typeof a.price === 'number' ? a.price : null))
    .filter((p): p is number => p !== null);

  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/5 border border-primary/20 rounded-2xl p-3.5 shadow-sm backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary animate-pulse" />
        </div>
        <div>
          <div className="font-extrabold text-foreground flex items-center gap-1.5">
            <span>Puls Rynku Szczecin</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Aktywne oferty: <strong>{totalCount}</strong> • Średnia stawka: <strong>{avgPrice ? `${avgPrice.toLocaleString('pl-PL')} zł` : 'b.d.'}</strong>
          </div>
        </div>
      </div>

      {maxPrice && (
        <div className="flex items-center gap-1.5 bg-background/60 px-3 py-1.5 rounded-xl border border-border/50 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="w-3.5 h-3.5" />
          Najwyższa oferta: {maxPrice.toLocaleString('pl-PL')} zł
        </div>
      )}
    </motion.div>
  );
}
