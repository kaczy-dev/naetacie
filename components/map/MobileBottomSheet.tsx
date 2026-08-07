'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import {
  MapPin,
  ChevronUp,
  Heart,
  Navigation,
  Sparkles,
  Building2,
  List,
  Map as MapIcon,
  ChevronDown,
  CheckCircle2,
  GripHorizontal,
  MessageSquare,
  BadgePercent,
  Car,
} from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { normalizeCategory, CATEGORIES } from '@/lib/data/categories';
import { triggerHaptic } from '@/lib/utils';
import { OlxLinkActions } from '@/components/olx/OlxLinkActions';

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

// Ultra-compact 1/3 reduced snap heights for mobile view:
// medium: 16vh, expanded: 32vh, collapsed: 30px
const SNAP_HEIGHTS: Record<SheetSnapState, string> = {
  collapsed: '30px',
  medium: '16vh',
  expanded: '32vh',
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
    if (selectedId) {
      triggerHaptic(12);
      setSnapState((prev) => (prev === 'collapsed' ? 'medium' : prev));
      if (snapState === 'expanded') {
        const cardEl = cardRefs.current.get(selectedId);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }, [selectedId]);

  const updateSnapState = (newState: SheetSnapState) => {
    setSnapState(newState);
    onSnapStateChange?.(newState);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;

    if (velocity.y < -180 || offset.y < -40) {
      // Swiped UP
      triggerHaptic(12);
      if (snapState === 'collapsed') updateSnapState('medium');
      else if (snapState === 'medium') updateSnapState('expanded');
    } else if (velocity.y > 180 || offset.y > 40) {
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

  const getQuickContactLink = (ad: DisplayAnnouncement) => {
    const text = encodeURIComponent(
      `Dzień dobry! Piszę w sprawie ogłoszenia "${ad.title}" z portalu NaEtacie. Czy oferta jest nadal aktualna?`
    );
    if (ad.phone) {
      const cleanPhone = ad.phone.replace(/\D/g, '');
      return `https://wa.me/48${cleanPhone}?text=${text}`;
    }
    return `sms:?body=${text}`;
  };

  return (
    <>
      {/* Floating Action Toggle Button - 1/3 smaller icons & typography */}
      <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setSnapState((prev) => (prev === 'expanded' ? 'medium' : 'expanded'))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 font-extrabold text-[10px] shadow-2xl backdrop-blur-xl active:scale-95 transition-all border border-slate-700/60 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          {snapState === 'expanded' ? (
            <>
              <MapIcon className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
              <span>Pełna mapa</span>
            </>
          ) : (
            <>
              <List className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
              <span>Zwijana lista ({ads.length})</span>
              <ChevronUp className="w-2.5 h-2.5 opacity-70" />
            </>
          )}
        </button>
      </div>

      {/* Drag & Drop Main Sheet Container */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 md:left-auto md:right-8 md:bottom-3 md:w-[380px] z-30 flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl border border-border/80 backdrop-blur-2xl transition-all duration-300 pb-safe touch-none"
        style={{
          height: SNAP_HEIGHTS[snapState],
          background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 255, 255, 0.98)',
          color: ui.text,
        }}
        animate={{ height: SNAP_HEIGHTS[snapState] }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        {/* Drag-and-drop Header Handle */}
        <motion.div
          className="w-full flex flex-col items-center pt-1.5 pb-1 cursor-grab active:cursor-grabbing touch-none select-none shrink-0 group"
          onClick={toggleSnap}
        >
          <div className="flex items-center justify-center gap-1 w-10 h-1 rounded-full bg-muted-foreground/40 mb-1 transition-all group-hover:bg-primary group-active:scale-110">
            <GripHorizontal className="w-2.5 h-2.5 text-muted-foreground opacity-60" />
          </div>
          <div className="flex items-center justify-between w-full px-3 text-[10px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground font-bold">
              <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
              Obszar: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">{ads.length}</span>
            </span>
            <div className="flex items-center gap-0.5 text-muted-foreground font-bold">
              <span className="text-[9px] text-primary">
                {snapState === 'collapsed' ? 'Rozwiń' : snapState === 'expanded' ? 'Zwiń' : 'Rozwiń'}
              </span>
              {snapState === 'expanded' ? (
                <ChevronDown className="w-3 h-3 text-primary" />
              ) : (
                <ChevronUp className="w-3 h-3 text-primary animate-bounce" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-2 pb-14 pt-0.5 space-y-1.5 overscroll-contain touch-pan-y">
          {/* COLLAPSED & MEDIUM STATE: ULTRA COMPACT SINGLE AD PREVIEW */}
          {snapState !== 'expanded' && currentDisplayAd && (
            <div className="bg-card/90 border border-border/70 rounded-lg p-2 space-y-1.5 shadow-xs backdrop-blur-md">
              {/* Header Info + Badges */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                    {CATEGORIES[normalizeCategory(currentDisplayAd.category)]?.icon}{' '}
                    {CATEGORIES[normalizeCategory(currentDisplayAd.category)]?.label || currentDisplayAd.category}
                  </span>

                  <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 flex items-center gap-0.5">
                    <BadgePercent className="w-2.5 h-2.5" /> Powyżej średniej +18%
                  </span>

                  <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 py-0.2 rounded flex items-center gap-0.5">
                    <Car className="w-2.5 h-2.5" /> ~14 min auta
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(currentDisplayAd.id);
                  }}
                  className="p-0.5 rounded-full hover:bg-accent text-red-500 transition-transform active:scale-90 cursor-pointer"
                  aria-label="Dodaj do ulubionych"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      isFavorite(currentDisplayAd.id)
                        ? 'fill-red-500 text-red-500'
                        : 'text-muted-foreground/70 hover:text-red-500'
                    }`}
                  />
                </button>
              </div>

              {/* Title & Price */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[11px] text-foreground truncate leading-tight">
                    {currentDisplayAd.title}
                  </h4>
                  {currentDisplayAd.company && (
                    <p className="text-[10px] font-medium text-muted-foreground truncate flex items-center gap-0.5 mt-0.5">
                      <Building2 className="w-2.5 h-2.5 text-muted-foreground/70 shrink-0" />
                      {currentDisplayAd.company}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    {typeof currentDisplayAd.price === 'number'
                      ? `${currentDisplayAd.price.toLocaleString('pl-PL')} zł`
                      : currentDisplayAd.price || 'Cena do uzg.'}
                  </span>
                </div>
              </div>

              {/* Action Buttons with 1-Tap Quick Contact */}
              <div className="flex items-center gap-1 pt-1 border-t border-border/40">
                <button
                  onClick={() => {
                    onShowOnMap(currentDisplayAd.id);
                    setSnapState('collapsed');
                  }}
                  className="flex-1 flex items-center justify-center gap-0.5 py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-[10px] font-bold rounded active:scale-95 transition-all cursor-pointer"
                >
                  <Navigation className="w-2.5 h-2.5 text-emerald-400" /> Na mapie
                </button>

                <a
                  href={getQuickContactLink(currentDisplayAd)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-0.5 py-1 px-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-2.5 h-2.5" /> Szybka odp.
                </a>

                <OlxLinkActions
                  ad={currentDisplayAd}
                  variant="default"
                  size="sm"
                  className="flex-1 text-[10px] py-0.5 h-6"
                />
              </div>
            </div>
          )}

          {/* EXPANDED STATE: COMPACT FULL LIST */}
          {snapState === 'expanded' && (
            <div className="space-y-1 pt-0.5">
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
                    className={`p-2 rounded-lg border transition-all cursor-pointer space-y-0.5 ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                        : 'border-border/60 bg-card/80 hover:bg-card active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-0.5">
                          <span>{cat?.icon}</span>
                          <span>{cat?.label || ad.category}</span>
                        </span>
                        {isSelected && (
                          <span className="text-[8px] font-extrabold text-primary bg-primary/20 px-1 rounded flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Wybrana
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
                        {typeof ad.price === 'number'
                          ? `${ad.price.toLocaleString('pl-PL')} zł`
                          : ad.price || 'Zapytaj'}
                      </span>
                    </div>

                    <h5 className="text-[11px] font-bold text-foreground truncate">{ad.title}</h5>

                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <div className="flex items-center gap-0.5 truncate">
                        <MapPin className="w-2.5 h-2.5 text-primary shrink-0" />
                        <span className="truncate max-w-[140px]">{ad.location_text}</span>
                      </div>
                      {ad.company && (
                        <span className="truncate max-w-[100px] font-medium text-muted-foreground/80">
                          {ad.company}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {ads.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-[10px]">
                  Brak ofert w wybranym obszarze.
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
