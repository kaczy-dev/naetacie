'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import {
  MapPin,
  ChevronUp,
  Heart,
  ExternalLink,
  Navigation,
  Sparkles,
  Briefcase,
  Building2,
  List,
  Map as MapIcon,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { normalizeCategory, CATEGORIES } from '@/lib/data/categories';
import { getAnnouncementExternalUrl } from '@/lib/utils';
import { triggerHaptic } from '@/lib/utils';

export interface MobileBottomSheetProps {
  ads: DisplayAnnouncement[];
  selectedAd: DisplayAnnouncement | null;
  selectedId: string | null;
  onSelectAd: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onShowOnMap: (id: string) => void;
  onSnapStateChange?: (state: SheetSnapState) => void;
  ui: {
    surface: string;
    border: string;
    text: string;
    shadow: string;
  };
  isDark: boolean;
}

export type SheetSnapState = 'collapsed' | 'medium' | 'expanded';

const SNAP_HEIGHTS: Record<SheetSnapState, string> = {
  collapsed: '62px',
  medium: '42vh',
  expanded: '88vh',
};

export function MobileBottomSheet({
  ads,
  selectedAd,
  selectedId,
  onSelectAd,
  isFavorite,
  onToggleFavorite,
  onShowOnMap,
  onSnapStateChange,
  ui,
  isDark,
}: MobileBottomSheetProps) {
  const [snapState, setSnapState] = useState<SheetSnapState>('medium');
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (selectedId && snapState === 'expanded') {
      const cardEl = cardRefs.current.get(selectedId);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId, snapState]);

  const updateSnapState = (newState: SheetSnapState) => {
    setSnapState(newState);
    onSnapStateChange?.(newState);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;

    if (velocity.y < -300 || offset.y < -80) {
      // Swiped UP
      triggerHaptic(12);
      if (snapState === 'collapsed') updateSnapState('medium');
      else if (snapState === 'medium') updateSnapState('expanded');
    } else if (velocity.y > 300 || offset.y > 80) {
      // Swiped DOWN
      triggerHaptic(12);
      if (snapState === 'expanded') updateSnapState('medium');
      else if (snapState === 'medium') updateSnapState('collapsed');
    }
  };

  const currentDisplayAd = selectedAd || (ads.length > 0 ? ads[0] : null);

  const toggleSnap = () => {
    triggerHaptic(15);
    if (snapState === 'collapsed') updateSnapState('medium');
    else if (snapState === 'medium') updateSnapState('expanded');
    else updateSnapState('collapsed');
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Completely stable, fixed toggle button */}
      <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setSnapState((prev) => (prev === 'expanded' ? 'medium' : 'expanded'))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 font-extrabold text-xs shadow-2xl backdrop-blur-xl active:scale-95 transition-all border border-slate-700/60"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          {snapState === 'expanded' ? (
            <>
              <MapIcon className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Pokaż pełną mapę</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Zwijana lista ({ads.length})</span>
              <ChevronUp className="w-3.5 h-3.5 opacity-70" />
            </>
          )}
        </button>
      </div>

      {/* Main Sheet Container */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 md:left-auto md:right-8 md:bottom-3 md:w-[420px] z-30 flex flex-col rounded-t-3xl md:rounded-3xl shadow-2xl border border-border/80 backdrop-blur-xl transition-all duration-300 pb-safe"
        style={{
          height: SNAP_HEIGHTS[snapState],
          background: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
          color: ui.text,
        }}
        animate={{ height: SNAP_HEIGHTS[snapState] }}
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      >
        {/* Drag handle header */}
        <motion.div
          className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
          onClick={toggleSnap}
          onPanEnd={handleDragEnd}
        >
          <div className="w-14 h-1.5 rounded-full bg-muted-foreground/40 mb-2 transition-colors hover:bg-muted-foreground/60" />
          <div className="flex items-center justify-between w-full px-5 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground font-bold">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              Oferty w tym obszarze: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{ads.length}</span>
            </span>
            <div className="flex items-center gap-1 text-muted-foreground font-semibold">
              <span className="text-[11px]">
                {snapState === 'collapsed' ? 'Rozwiń' : snapState === 'expanded' ? 'Zwiń' : 'Rozwiń pełną'}
              </span>
              {snapState === 'expanded' ? (
                <ChevronDown className="w-4 h-4 text-emerald-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-emerald-500" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Scrollable / Content area */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 pt-1 space-y-3">
          {/* COLLAPSED & MEDIUM STATE: RICH SINGLE AD CARD PREVIEW */}
          {snapState !== 'expanded' && currentDisplayAd && (
            <div className="bg-card/90 border border-border/70 rounded-2xl p-4 space-y-3 shadow-md backdrop-blur-md">
              {/* Category & Source Portal & Heart */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                    {CATEGORIES[normalizeCategory(currentDisplayAd.category)]?.icon}{' '}
                    {CATEGORIES[normalizeCategory(currentDisplayAd.category)]?.label || currentDisplayAd.category}
                  </span>

                  {currentDisplayAd.source_portal && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {currentDisplayAd.source_portal}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(currentDisplayAd.id);
                  }}
                  className="p-2 rounded-full hover:bg-accent text-red-500 transition-transform active:scale-90"
                  aria-label="Dodaj do ulubionych"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isFavorite(currentDisplayAd.id)
                        ? 'fill-red-500 text-red-500'
                        : 'text-muted-foreground/70 hover:text-red-500'
                    }`}
                  />
                </button>
              </div>

              {/* Title & Company */}
              <div>
                <h4 className="font-bold text-sm md:text-base text-foreground line-clamp-2 leading-tight">
                  {currentDisplayAd.title}
                </h4>
                {currentDisplayAd.company && (
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground/70" />
                    {currentDisplayAd.company}
                  </p>
                )}
              </div>

              {/* Location, Employment Type & Price */}
              <div className="flex items-center justify-between pt-1 gap-2 border-t border-border/40">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate max-w-[170px]">{currentDisplayAd.location_text}</span>
                  </div>
                  {currentDisplayAd.employment_type && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <Briefcase className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{currentDisplayAd.employment_type}</span>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block text-xs md:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-xs">
                    {typeof currentDisplayAd.price === 'number'
                      ? `${currentDisplayAd.price.toLocaleString('pl-PL')} zł`
                      : currentDisplayAd.price || 'Zapytaj o cenę'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    onShowOnMap(currentDisplayAd.id);
                    setSnapState('collapsed');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md"
                >
                  <Navigation className="w-3.5 h-3.5" /> Pokaż na mapie
                </button>
                <a
                  href={getAnnouncementExternalUrl(currentDisplayAd)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex items-center justify-center gap-1 py-2.5 px-3 border border-border/80 text-foreground text-xs font-semibold rounded-xl hover:bg-accent active:scale-95 transition-all cursor-pointer"
                >
                  <span>Zobacz w {currentDisplayAd.source_portal || 'OLX'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* EXPANDED STATE: FULL SCROLLABLE LIST OF ALL ADS */}
          {snapState === 'expanded' && (
            <div className="space-y-3 pt-1">
              {ads.map((ad) => {
                const isSelected = ad.id === selectedId;
                const cat = CATEGORIES[normalizeCategory(ad.category)];

                return (
                  <div
                    key={ad.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(ad.id, el);
                      else cardRefs.current.delete(ad.id);
                    }}
                    onClick={() => {
                      onSelectAd(ad.id);
                      onShowOnMap(ad.id);
                      updateSnapState('medium');
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/40'
                        : 'border-border/60 bg-card/80 hover:bg-card active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <span>{cat?.icon}</span>
                          <span>{cat?.label || ad.category}</span>
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-extrabold text-primary bg-primary/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Wybrana
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {typeof ad.price === 'number'
                          ? `${ad.price.toLocaleString('pl-PL')} zł`
                          : ad.price || 'Brak ceny'}
                      </span>
                    </div>

                    <h5 className="text-xs md:text-sm font-bold text-foreground line-clamp-1">{ad.title}</h5>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate max-w-[180px]">{ad.location_text}</span>
                      </div>
                      {ad.company && (
                        <span className="truncate max-w-[120px] font-medium text-muted-foreground/80">
                          {ad.company}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {ads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Brak ofert w wybranym obszarze. Przesuń mapę lub zmień filtry.
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

