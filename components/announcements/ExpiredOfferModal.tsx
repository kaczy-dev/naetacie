'use client';

import React from 'react';
import { AlertCircle, Search, Copy, Check, ExternalLink, Phone, Wrench, ShieldAlert } from 'lucide-react';
import { triggerHaptic, removePolishDiacritics } from '@/lib/utils';

export interface ExpiredOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category?: string | null;
  locationText?: string | null;
  price?: number | string | null;
  phone?: string | null;
  description?: string | null;
  requirements?: Array<{ id: string; label: string; icon: string }>;
  onSearchSimilar?: (keyword: string) => void;
}

export function ExpiredOfferModal({
  isOpen,
  onClose,
  title,
  category,
  locationText = 'Szczecin',
  price,
  phone,
  description,
  requirements = [],
  onSearchSimilar,
}: ExpiredOfferModalProps) {
  const [copiedPhone, setCopiedPhone] = React.useState(false);

  if (!isOpen) return null;

  const tradeKeyword = title.split(/\s+/)[0] || 'budowlane';

  const handleSearchSimilar = () => {
    triggerHaptic(15);
    onClose();
    if (onSearchSimilar) {
      onSearchSimilar(tradeKeyword);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/?search=${encodeURIComponent(tradeKeyword)}`;
    }
  };

  const handleCopyPhone = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      triggerHaptic([10, 20, 10]);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <h4 className="font-bold text-sm leading-none">Oferta zarchiwizowana na portalu źródłowym</h4>
            <p className="opacity-90">
              Ogłoszeniodawca zakończył tę publikację na OLX, ale zachowaliśmy dla Ciebie kopię danych kontaktowych i parametrów.
            </p>
          </div>
        </div>

        {/* Snapshot Details */}
        <div className="space-y-3">
          <div>
            <h3 className="font-extrabold text-base text-foreground leading-snug">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{locationText} • {category || 'Budownictwo'}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {price && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                Stawka: {price} zł
              </span>
            )}
            {phone && (
              <button
                type="button"
                onClick={handleCopyPhone}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium border border-border transition-colors cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span>{phone}</span>
                {copiedPhone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </button>
            )}
          </div>

          {requirements.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {requirements.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium"
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                </span>
              ))}
            </div>
          )}

          {description && (
            <div className="max-h-36 overflow-y-auto p-3 rounded-xl bg-muted/40 border border-border text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {description}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={handleSearchSimilar}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Szukaj podobnych w Szczecinie</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
