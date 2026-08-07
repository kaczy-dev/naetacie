'use client';

import React from 'react';
import { X, Smartphone, ExternalLink, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface OlxQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string | null;
}

export function OlxQrModal({ isOpen, onClose, url, title }: OlxQrModalProps) {
  if (!isOpen) return null;

  // Generate Google Chart API QR Code SVG / PNG URL as zero-dependency fallback
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}&color=10b981&bgcolor=0f172a`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          <QrCode className="w-8 h-8" />
        </div>

        <div>
          <h3 className="font-bold text-lg text-foreground">Skanuj telefonem</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] line-clamp-2">
            {title || 'Otwórz ofertę pracy w telefonie'}
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-inner flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeImageUrl}
            alt="Kod QR oferty OLX"
            width={200}
            height={200}
            className="w-48 h-48 rounded-lg object-contain shadow-md"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
          <span>Aparat telefonu automatycznie otworzy ofertę w aplikacji OLX</span>
        </div>

        <div className="w-full flex gap-2 pt-2 border-t border-border/50">
          <Button
            asChild
            variant="default"
            size="sm"
            className="flex-1 gap-1.5 text-xs font-bold shadow-md cursor-pointer"
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" /> Otwórz na komputerze
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
