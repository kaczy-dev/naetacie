'use client';

import { motion } from 'framer-motion';
import { cn, triggerHaptic } from '@/lib/utils';

/**
 * Horizontal row of one-tap popular trade searches.
 * Tapping a chip sets the search query; tapping the active one clears it.
 */
const POPULAR_TRADES = [
  { label: '🔥 > 10k PLN', q: '10000' },
  { label: '⚡ Elektryk (SEP)', q: 'elektryk' },
  { label: '🏗️ Murarz-Tynkarz', q: 'murarz' },
  { label: '🛠️ Hydraulik', q: 'hydraulik' },
  { label: '🏠 Dekarz', q: 'dekarz' },
  { label: '🚜 Operator UDT', q: 'koparki' },
  { label: '🎨 Wykończenia', q: 'wykończenia' },
  { label: '🪵 Cieśla', q: 'cieśla' },
  { label: '💼 B2B / Kontrakt', q: 'b2b' },
  { label: '🚛 Kierowca C+E', q: 'kierowca' },
];

export function QuickSearchChips({
  value, onChange,
}: {
  value: string;
  onChange: (q: string) => void;
}) {
  const current = value.trim().toLowerCase();

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {POPULAR_TRADES.map((t, i) => {
        const active = current === t.q.toLowerCase();
        return (
          <motion.button
            key={t.q}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => {
              triggerHaptic(8);
              onChange(active ? '' : t.q);
            }}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap cursor-pointer',
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-card text-muted-foreground border-border/70 hover:border-primary/50 hover:text-foreground'
            )}
          >
            {t.label}
          </motion.button>
        );
      })}
    </div>
  );
}
