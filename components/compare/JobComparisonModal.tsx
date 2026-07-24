'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X, MapPin, DollarSign, ExternalLink, Briefcase } from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { calculateNetSalary } from '@/lib/salary/calculator';

export interface JobComparisonModalProps {
  ads: DisplayAnnouncement[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export function JobComparisonModal({ ads, isOpen, onClose, onRemove }: JobComparisonModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-4xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-5 space-y-4 my-8"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Porównywarka Ofert Pracy</h3>
                <p className="text-[11px] text-muted-foreground">Porównanie parametrów ofert ({ads.length}/3)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {ads.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Scale className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs text-muted-foreground font-medium">
                Brak ofert w porównywarce. Kliknij ⚖️ Porównaj przy ogłoszeniach, aby dodać je do tabeli.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile 1-on-1 Card Slider (md:hidden) */}
              <div className="md:hidden flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2">
                {ads.map((ad) => {
                  const net = typeof ad.price === 'number' ? calculateNetSalary(ad.price).uopNet : null;
                  return (
                    <div
                      key={ad.id}
                      className="snap-center shrink-0 w-[85vw] bg-card border border-border/80 rounded-xl p-4 space-y-3 shadow-md relative"
                    >
                      <button
                        onClick={() => onRemove(ad.id)}
                        className="absolute top-3 right-3 text-red-500 hover:bg-red-500/10 p-1.5 rounded-full"
                        title="Usuń z porównania"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <h4 className="font-bold text-sm text-foreground line-clamp-2 pr-6 leading-tight">
                        {ad.title}
                      </h4>

                      <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Brutto:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł` : 'Brak danych'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Na rękę (UoP):</span>
                          <span className="font-bold text-foreground">
                            {net ? `~${net.toLocaleString('pl-PL')} zł netto` : '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Portal:</span>
                          <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-muted">
                            {ad.source_portal}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Lokalizacja:</span>
                          <span className="truncate max-w-[140px] text-muted-foreground">
                            {ad.location_text}
                          </span>
                        </div>

                        {ad.employment_type && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-semibold">Zatrudnienie:</span>
                            <span className="text-muted-foreground">{ad.employment_type}</span>
                          </div>
                        )}
                      </div>

                      {ad.source_url && (
                        <a
                          href={ad.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 w-full py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg active:scale-95 transition-all mt-2"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Zobacz ogłoszenie
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Comparison Table (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="p-2.5 font-semibold text-muted-foreground w-1/4">Parametr</th>
                      {ads.map((ad) => (
                        <th key={ad.id} className="p-2.5 font-bold text-foreground min-w-[200px] relative">
                          <button
                            onClick={() => onRemove(ad.id)}
                            className="absolute top-1 right-1 text-red-500 hover:bg-red-500/10 p-1 rounded"
                            title="Usuń z porównania"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <div className="line-clamp-2 pr-4">{ad.title}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    <tr>
                      <td className="p-2.5 font-semibold text-muted-foreground">Wynagrodzenie Brutto</td>
                      {ads.map((ad) => (
                        <td key={ad.id} className="p-2.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                          {typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł` : 'Brak danych'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-muted-foreground">Szacunek Na Rękę (UoP)</td>
                      {ads.map((ad) => {
                        const net = typeof ad.price === 'number' ? calculateNetSalary(ad.price).uopNet : null;
                        return (
                          <td key={ad.id} className="p-2.5 font-bold text-foreground">
                            {net ? `~${net.toLocaleString('pl-PL')} zł netto` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-muted-foreground">Lokalizacja</td>
                      {ads.map((ad) => (
                        <td key={ad.id} className="p-2.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span className="truncate max-w-[160px]">{ad.location_text}</span>
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-muted-foreground">Portal Źródłowy</td>
                      {ads.map((ad) => (
                        <td key={ad.id} className="p-2.5 uppercase font-bold text-[10px]">
                          {ad.source_portal}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-muted-foreground">Forma Zatrudnienia</td>
                      {ads.map((ad) => (
                        <td key={ad.id} className="p-2.5 text-muted-foreground">
                          {ad.employment_type || 'Nieokreślono'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
