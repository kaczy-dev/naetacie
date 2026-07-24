'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Zap } from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { GSAPNumberCounter } from '@/components/ui/GSAPNumberCounter';
import { GSAPMagnetic } from '@/components/ui/GSAPMagnetic';

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
        <GSAPMagnetic strength={0.2}>
          <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 cursor-pointer shadow-xs hover:scale-105 transition-transform">
            <Zap className="w-4.5 h-4.5 text-primary animate-pulse" />
          </div>
        </GSAPMagnetic>
        <div>
          <div className="font-extrabold text-foreground flex items-center gap-1.5 text-xs md:text-sm">
            <span>Puls Rynku Szczecin</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          </div>
          <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
            <span>Aktywne oferty:</span>
            <span className="font-extrabold text-foreground">
              <GSAPNumberCounter value={totalCount} duration={0.8} />
            </span>
            <span>• Średnia stawka:</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              {avgPrice ? <GSAPNumberCounter value={avgPrice} suffix=" zł" duration={1.2} /> : 'b.d.'}
            </span>
          </div>
        </div>
      </div>

      {maxPrice && (
        <GSAPMagnetic strength={0.15}>
          <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs backdrop-blur-md">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Najwyższa oferta:</span>
            <GSAPNumberCounter value={maxPrice} suffix=" zł" duration={1.5} />
          </div>
        </GSAPMagnetic>
      )}
    </motion.div>
  );
}
