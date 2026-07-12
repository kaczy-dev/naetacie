'use client';

import { motion } from 'framer-motion';
import { TrendingUp, MapPin, Clock, Wallet } from 'lucide-react';
import { CATEGORIES } from '@/lib/data/categories';
import type { MarketOverview } from '@/lib/stats/market';

/**
 * Collapsible market insights banner shown at the top of the list.
 * Gives users a quick read on salary levels and where the jobs are.
 */
export function MarketStats({ overview }: { overview: MarketOverview }) {
  if (overview.totalOffers === 0) return null;

  const fmt = (n: number | null) => (n === null ? '—' : `${n.toLocaleString('pl-PL')} zł`);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Rynek pracy — Szczecin</h3>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatTile
          icon={<Wallet className="w-3.5 h-3.5" />}
          label="Mediana"
          value={fmt(overview.overallMedianSalary)}
        />
        <StatTile
          icon={<MapPin className="w-3.5 h-3.5" />}
          label="Najwięcej"
          value={overview.topLocation ?? '—'}
        />
        <StatTile
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Najnowsze"
          value={overview.freshestHours !== null ? `${overview.freshestHours}h temu` : '—'}
        />
      </div>

      {/* Per-category salary bars */}
      <div className="space-y-1.5">
        {overview.byCategory.slice(0, 4).map((c) => {
          const cat = CATEGORIES[c.category];
          const maxRef = overview.byCategory[0]?.avgSalary ?? 1;
          const pct = c.avgSalary && maxRef ? Math.min(100, (c.avgSalary / maxRef) * 100) : 0;
          return (
            <div key={c.category} className="flex items-center gap-2">
              <span className="text-xs w-24 shrink-0 flex items-center gap-1" style={{ color: cat.color }}>
                {cat.icon} {cat.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: cat.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground w-20 text-right shrink-0">
                {c.avgSalary ? `${c.avgSalary.toLocaleString('pl-PL')} zł` : `${c.count} ofert`}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card border border-border/50 p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm font-bold text-foreground truncate">{value}</div>
    </div>
  );
}
