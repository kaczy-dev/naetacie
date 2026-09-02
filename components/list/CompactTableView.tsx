'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  MessageSquare,
  MapPin,
  Heart,
  Scale,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { cn, triggerHaptic, getAnnouncementExternalUrl } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';
import { OlxLinkActions } from '@/components/olx/OlxLinkActions';

export interface CompactTableViewProps {
  ads: DisplayAnnouncement[];
  selectedId: string | null;
  onSelectAd: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  isCompared: (id: string) => boolean;
  onToggleCompare: (id: string) => void;
  onOpenPitch: (ad: DisplayAnnouncement) => void;
  onQuickView: (ad: DisplayAnnouncement) => void;
}

export function CompactTableView({
  ads,
  selectedId,
  onSelectAd,
  isFavorite,
  onToggleFavorite,
  isCompared,
  onToggleCompare,
  onOpenPitch,
  onQuickView,
}: CompactTableViewProps) {
  if (ads.length === 0) {
    return (
      <div className="p-8 text-center bg-card/40 rounded-2xl border border-border/50 text-muted-foreground text-sm">
        Brak ofert do wyświetlenia w tabeli
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-extrabold uppercase text-[10px] tracking-wider">
            <th className="py-2.5 px-3">Portal / Stanowisko</th>
            <th className="py-2.5 px-3">Lokalizacja</th>
            <th className="py-2.5 px-3 text-right">Stawka Netto</th>
            <th className="py-2.5 px-3 text-center">Telefon</th>
            <th className="py-2.5 px-3 text-right">Szybkie Akcje</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-medium">
          {ads.map((ad) => {
            const isSel = ad.id === selectedId;
            const isFav = isFavorite(ad.id);
            const isComp = isCompared(ad.id);

            return (
              <tr
                key={ad.id}
                onClick={() => {
                  triggerHaptic(5);
                  onSelectAd(ad.id);
                }}
                className={cn(
                  'hover:bg-primary/5 transition-colors cursor-pointer group',
                  isSel && 'bg-primary/10 font-bold'
                )}
              >
                {/* 1. Portal & Title */}
                <td className="py-2 px-3 max-w-[280px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border shrink-0">
                      {ad.source_portal || 'OLX'}
                    </span>
                    <span className="truncate text-foreground group-hover:text-primary transition-colors">
                      {ad.title}
                    </span>
                  </div>
                </td>

                {/* 2. Location */}
                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate max-w-[140px]">{ad.location_text}</span>
                  </div>
                </td>

                {/* 3. Price */}
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  {ad.price ? (
                    <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł` : ad.price}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">Do uzgodnienia</span>
                  )}
                </td>

                {/* 4. Phone Contact */}
                <td className="py-2 px-3 text-center whitespace-nowrap">
                  {ad.phone ? (
                    <a
                      href={`tel:${ad.phone.replace(/\s+/g, '')}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(10);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{ad.phone}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-[10px]">—</span>
                  )}
                </td>

                {/* 5. Quick Actions */}
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    {/* Favorite */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(10);
                        playUiSound('favorite');
                        onToggleFavorite(ad.id);
                      }}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors cursor-pointer',
                        isFav
                          ? 'text-red-500 bg-red-50 dark:bg-red-950/50'
                          : 'text-muted-foreground hover:text-red-500 hover:bg-muted'
                      )}
                      title="Dodaj do ulubionych"
                    >
                      <Heart className={cn('w-3.5 h-3.5', isFav && 'fill-current')} />
                    </button>

                    {/* Compare */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(10);
                        playUiSound('pop');
                        onToggleCompare(ad.id);
                      }}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors cursor-pointer',
                        isComp
                          ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/50'
                          : 'text-muted-foreground hover:text-blue-600 hover:bg-muted'
                      )}
                      title="Porównaj ofertę"
                    >
                      <Scale className="w-3.5 h-3.5" />
                    </button>

                    {/* SMS Pitch */}
                    {ad.phone && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic(10);
                          playUiSound('sparkle');
                          onOpenPitch(ad);
                        }}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                        title="Wyślij gotowy SMS"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Quick View */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(10);
                        playUiSound('pop');
                        onQuickView(ad);
                      }}
                      className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title="Szczegóły"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
