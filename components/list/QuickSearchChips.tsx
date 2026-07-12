'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Horizontal row of one-tap popular trade searches.
 * Tapping a chip sets the search query; tapping the active one clears it.
 */
const POPULAR_TRADES = [
  { label: 'Murarz', q: 'murarz' },
  { label: 'Elektryk', q: 'elektryk' },
  { label: 'Hydraulik', q: 'hydraulik' },
  { label: 'Malarz', q: 'malarz' },
  { label: 'Dekarz', q: 'dekarz' },
  { label: 'Brukarz', q: 'brukarz' },
  { label: 'Spawacz', q: 'spawacz' },
  { label: 'Cieśla', q: 'cieśla' },
  { label: 'Pomocnik', q: 'pomocnik' },
  { label: 'Kierownik', q: 'kierownik' },
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
            onClick={() => onChange(active ? '' : t.q)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
            )}
          >
            {t.label}
          </motion.button>
        );
      })}
    </div>
  );
}
