'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, ExternalLink, Heart, Navigation, Calendar,
  Building2, Phone, Sparkles, CheckCircle2, DollarSign, Share2
} from 'lucide-react';
import { ensureAbsoluteUrl } from '@/lib/utils';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { normalizeCategory, CATEGORIES } from '@/lib/data/categories';
import { calculateNetSalary } from '@/lib/salary/calculator';
import { Button } from '@/components/ui/button';

export interface KinematicQuickViewProps {
  ad: DisplayAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShowOnMap: () => void;
}

export function KinematicQuickView({
  ad,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onShowOnMap,
}: KinematicQuickViewProps) {
  if (!isOpen || !ad) return null;

  const cat = CATEGORIES[normalizeCategory(ad.category)];
  const netBreakdown = typeof ad.price === 'number' ? calculateNetSalary(ad.price) : null;
  const safeUrl = ensureAbsoluteUrl(ad.source_url) || `/announcements/${ad.id}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md">
        {/* Dimmed Backdrop Clicker */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Drawer Content */}
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-xl h-full bg-card border-l border-border/80 shadow-2xl overflow-y-auto flex flex-col z-10 text-card-foreground"
        >
          {/* Header Bar */}
          <div className="sticky top-0 z-20 glass border-b border-border/50 px-6 py-4 flex items-center justify-between bg-card/90 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <span>{cat?.icon}</span> {cat?.label}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5 rounded-md border border-border">
                {ad.source_portal}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleFavorite}
                className="p-2 rounded-full hover:bg-accent text-red-500 transition-transform active:scale-90 border border-border/60"
                title={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground border border-border/60"
                aria-label="Zamknij"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-6 space-y-6 flex-1">
            {/* Title & Salary */}
            <div className="space-y-3">
              <h2 className="text-xl md:text-2xl font-black text-foreground leading-snug">
                {ad.title}
              </h2>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">{ad.location_text}</span>
                </div>

                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/30 shadow-sm">
                  {typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł/mies. brutto` : 'Cena do uzgodnienia'}
                </div>
              </div>
            </div>

            {/* Salary Breakdown Box */}
            {netBreakdown && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" /> Szacunkowe Wynagrodzenie Netto
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    ~{netBreakdown.uopNet.toLocaleString('pl-PL')} zł na rękę (UoP)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/20">
                  <div>Umowa Zlecenie: <strong>~{netBreakdown.uzNet.toLocaleString('pl-PL')} zł</strong></div>
                  <div>UZ Student (&lt;26): <strong>{netBreakdown.uzStudentNet.toLocaleString('pl-PL')} zł</strong></div>
                </div>
              </div>
            )}

            {/* Phone */}
            {ad.phone && (
              <a
                href={`tel:${ad.phone}`}
                className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Zadzwoń do pracodawcy: <strong>{ad.phone}</strong>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-500/20 px-2 py-0.5 rounded-md">Połącz</span>
              </a>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Szczegóły oferty
              </h3>
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-xs md:text-sm leading-relaxed text-foreground whitespace-pre-line">
                {ad.description || 'Brak dodatkowego opisu ogłoszenia.'}
              </div>
            </div>
          </div>

          {/* Fixed Footer Buttons */}
          <div className="sticky bottom-0 z-20 glass border-t border-border/50 p-4 bg-card/90 backdrop-blur-xl flex items-center gap-3">
            <Button
              onClick={onShowOnMap}
              variant="outline"
              className="flex-1 text-xs font-bold gap-2 h-10 border-border/80"
            >
              <Navigation className="w-4 h-4 text-primary" /> Pokaż na mapie
            </Button>
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full text-xs font-extrabold gap-2 h-10 bg-primary text-primary-foreground shadow-md">
                <ExternalLink className="w-4 h-4" /> Aplikuj na {ad.source_portal}
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
