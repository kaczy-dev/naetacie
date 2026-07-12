'use client';

/**
 * Slide-over panel for editing job search preferences that drive the
 * matching engine. Keyword chips, category toggles, salary slider,
 * employment type, and "use my location" for distance scoring.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CATEGORIES, ALL_CATEGORY_KEYS } from '@/lib/data/categories';
import type { JobPreferences } from '@/lib/matching/types';

const EMPLOYMENT_TYPES = ['Umowa o pracę', 'B2B', 'Zlecenie', 'Tymczasowa'];

export function JobPreferencesPanel({
  open, preferences, onClose, onChange, onReset,
}: {
  open: boolean;
  preferences: JobPreferences;
  onClose: () => void;
  onChange: (patch: Partial<JobPreferences>) => void;
  onReset: () => void;
}) {
  const [keywordInput, setKeywordInput] = useState('');
  const [locating, setLocating] = useState(false);

  const addKeyword = () => {
    const k = keywordInput.trim();
    if (k && !preferences.keywords.includes(k)) {
      onChange({ keywords: [...preferences.keywords, k] });
    }
    setKeywordInput('');
  };

  const useMyLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          homeLat: pos.coords.latitude,
          homeLng: pos.coords.longitude,
          maxDistanceKm: preferences.maxDistanceKm ?? 25,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-[91] w-full max-w-sm bg-card border-l border-border shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 glass border-b border-border/50 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-semibold text-foreground">Dopasowanie ofert</h2>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Keywords */}
              <section className="space-y-2">
                <label className="text-sm font-medium text-foreground">Umiejętności / słowa kluczowe</label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="np. spawacz, uprawnienia SEP"
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={addKeyword} className="shrink-0 px-3"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {kw}
                      <button onClick={() => onChange({ keywords: preferences.keywords.filter((k) => k !== kw) })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </section>

              {/* Categories */}
              <section className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kategorie</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CATEGORY_KEYS.map((key) => {
                    const cat = CATEGORIES[key];
                    const active = preferences.categories.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => onChange({
                          categories: active
                            ? preferences.categories.filter((c) => c !== key)
                            : [...preferences.categories, key],
                        })}
                        className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-colors',
                          active ? 'text-white' : 'text-muted-foreground border-border')}
                        style={active ? { background: cat.color, borderColor: cat.color } : undefined}
                      >
                        {cat.icon} {cat.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Min salary */}
              <section className="space-y-2">
                <label className="text-sm font-medium text-foreground flex justify-between">
                  <span>Min. wynagrodzenie</span>
                  <span className="text-primary font-semibold">
                    {preferences.minSalary ? `${preferences.minSalary} zł` : 'dowolne'}
                  </span>
                </label>
                <input
                  type="range" min={0} max={15000} step={500}
                  value={preferences.minSalary ?? 0}
                  onChange={(e) => onChange({ minSalary: Number(e.target.value) || null })}
                  className="w-full accent-primary"
                />
              </section>

              {/* Employment types */}
              <section className="space-y-2">
                <label className="text-sm font-medium text-foreground">Typ umowy</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMPLOYMENT_TYPES.map((t) => {
                    const active = preferences.employmentTypes.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => onChange({
                          employmentTypes: active
                            ? preferences.employmentTypes.filter((x) => x !== t)
                            : [...preferences.employmentTypes, t],
                        })}
                        className={cn('text-xs px-2.5 py-1.5 rounded-full border transition-colors',
                          active ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-border')}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Location / distance */}
              <section className="space-y-2">
                <label className="text-sm font-medium text-foreground flex justify-between">
                  <span>Maks. odległość</span>
                  <span className="text-primary font-semibold">
                    {preferences.maxDistanceKm ? `${preferences.maxDistanceKm} km` : '—'}
                  </span>
                </label>
                <Button variant="outline" size="sm" onClick={useMyLocation} disabled={locating} className="w-full gap-2">
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {preferences.homeLat ? 'Zaktualizuj lokalizację' : 'Użyj mojej lokalizacji'}
                </Button>
                {preferences.homeLat && (
                  <input
                    type="range" min={5} max={100} step={5}
                    value={preferences.maxDistanceKm ?? 25}
                    onChange={(e) => onChange({ maxDistanceKm: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                )}
              </section>

              <Button variant="ghost" onClick={onReset} className="w-full text-muted-foreground">
                Wyczyść preferencje
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
