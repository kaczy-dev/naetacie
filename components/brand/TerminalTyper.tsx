'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_PHRASES = [
  'REALNE OFERTY — OLX, PRACUJ.PL, INDEED (SZCZECIN & OKOLICE)',
  'REALNE WYNAGRODZENIA — PRZELICZNIK NETTO / BRUTTO (B2B, UoP)',
  'REALNY SZCZECIN — GUMIEŃCE, PRAWOBRZEŻE, POLICE, GOLENIÓW',
  'MONITOROWANIE W CZASIE RZECZYWISTYM — BEZ PRZEDAWNIONYCH OFERT',
  'MAPA 3D & WSPÓŁRZĘDNE — STADION POGOŃ SZCZECIN & BUDOWY',
];

interface TerminalTyperProps {
  phrases?: string[];
  className?: string;
}

export function TerminalTyper({ phrases = DEFAULT_PHRASES, className }: TerminalTyperProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let timer: NodeJS.Timeout;

    if (!isDeleting && text === currentPhrase) {
      // Pause at full word
      timer = setTimeout(() => setIsDeleting(true), 2400);
    } else if (isDeleting && text === '') {
      // Move to next word
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    } else {
      // Type or delete characters
      const speed = isDeleting ? 18 : 35;
      timer = setTimeout(() => {
        const nextText = isDeleting
          ? currentPhrase.substring(0, text.length - 1)
          : currentPhrase.substring(0, text.length + 1);
        setText(nextText);
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting, phraseIndex, phrases]);

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-emerald-500/30 bg-slate-950/90 text-emerald-400 font-mono shadow-xl backdrop-blur-md transition-all duration-300 hover:border-emerald-500/50 hover:shadow-emerald-500/10 hover:shadow-2xl',
        className
      )}
    >
      {/* Terminal Top Window Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-emerald-500/20 bg-slate-900/80 text-[10px] text-muted-foreground select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block shadow-sm" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block shadow-sm" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block shadow-sm" />
          <span className="ml-2 font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            SZCZECIN NA ETACIE
          </span>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-extrabold tracking-wider uppercase">
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <ShieldCheck className="w-3 h-3 text-emerald-400 inline" /> WERYFIKACJA 100%
          </span>
        </div>
      </div>

      {/* Terminal Typing Body */}
      <div className="p-3.5 flex items-center justify-between gap-3 text-xs md:text-sm tracking-wide">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="text-emerald-500 font-bold select-none shrink-0">&gt;</span>
          <span className="text-emerald-300 font-semibold drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            {text}
          </span>
          <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse shrink-0 align-middle ml-0.5" />
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-400/80 bg-slate-900 px-2.5 py-1 rounded-md border border-emerald-500/20 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> SZCZECIN LIVE
        </div>
      </div>
    </div>
  );
}
