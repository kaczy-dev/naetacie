'use client';

import { useState, useEffect } from 'react';
import { Clock, X, Star } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export interface RecentSearchChipsProps {
  currentQuery: string;
  onSelectQuery: (query: string) => void;
}

export function RecentSearchChips({ currentQuery, onSelectQuery }: RecentSearchChipsProps) {
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [savedPresets, setSavedPresets] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem('naetacie_recent_searches');
      if (storedRecent) setRecentQueries(JSON.parse(storedRecent));

      const storedPresets = localStorage.getItem('naetacie_saved_presets');
      if (storedPresets) setSavedPresets(JSON.parse(storedPresets));
    } catch {
      /* ignore */
    }
  }, []);

  // Save new search queries into history
  useEffect(() => {
    const query = currentQuery.trim();
    if (query.length < 3) return;

    const timer = setTimeout(() => {
      setRecentQueries((prev) => {
        const filtered = prev.filter((q) => q.toLowerCase() !== query.toLowerCase());
        const updated = [query, ...filtered].slice(0, 5);
        try {
          localStorage.setItem('naetacie_recent_searches', JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentQuery]);

  const toggleSavePreset = (query: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic(12);
    setSavedPresets((prev) => {
      const exists = prev.includes(query);
      const updated = exists ? prev.filter((q) => q !== query) : [...prev, query];
      try {
        localStorage.setItem('naetacie_saved_presets', JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  const handleRemoveRecent = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentQueries.filter((q) => q !== query);
    setRecentQueries(updated);
    try {
      localStorage.setItem('naetacie_recent_searches', JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const isCurrentSaved = currentQuery.trim().length >= 3 && savedPresets.includes(currentQuery.trim());

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-0.5 text-xs">
      {/* Save current search button if valid */}
      {currentQuery.trim().length >= 3 && (
        <button
          onClick={() => toggleSavePreset(currentQuery.trim())}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all shrink-0 ${
            isCurrentSaved
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-muted/80 text-muted-foreground hover:text-foreground border-border/50'
          }`}
          title={isCurrentSaved ? 'Usuń ze zapisanych filtrów' : 'Zapisz ten filtr wyszukiwania'}
        >
          <Star className={`w-3 h-3 ${isCurrentSaved ? 'fill-current text-amber-500' : ''}`} />
          <span>{isCurrentSaved ? 'Zapisano' : 'Zapisz filtr'}</span>
        </button>
      )}

      {/* Saved Presets */}
      {savedPresets.map((q) => (
        <span
          key={`preset-${q}`}
          onClick={() => onSelectQuery(q)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold cursor-pointer transition-all shrink-0 hover:bg-amber-500/20"
        >
          <Star className="w-3 h-3 fill-current text-amber-500" />
          <span>{q}</span>
        </span>
      ))}

      {/* Recent Queries */}
      {recentQueries.map((q) => (
        <span
          key={`recent-${q}`}
          onClick={() => onSelectQuery(q)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium border border-border/40 cursor-pointer transition-all shrink-0"
        >
          <Clock className="w-2.5 h-2.5 opacity-60" />
          <span>{q}</span>
          <button
            onClick={(e) => handleRemoveRecent(q, e)}
            className="hover:text-red-500 rounded p-0.5"
            aria-label="Usuń z historii"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
