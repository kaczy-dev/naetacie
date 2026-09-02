'use client';

import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Briefcase, Shield, Sparkles, Building2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo, Wordmark } from '@/components/brand/Logo';
import { TerminalTyper } from '@/components/brand/TerminalTyper';
import { triggerHaptic } from '@/lib/utils';

/**
 * Modern High-Impact Landing Hero for NaEtacie.
 */
export function Hero({ onContinue }: { onContinue: () => void }) {
  const handleStart = () => {
    triggerHaptic(20);
    onContinue();
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-5 sm:p-8 bg-gradient-to-b from-background via-background/95 to-primary/10 relative overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 max-w-lg w-full text-center space-y-6"
      >
        {/* Top Announcement Chip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-black shadow-xs tracking-tight"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Szczecin & Pomorze Zachodnie · Agregacja 24/7</span>
        </motion.div>

        {/* Logo & Wordmark */}
        <motion.div
          className="flex items-center justify-center gap-3.5"
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <Logo size={60} animated={true} interactive3D={true} />
          <Wordmark className="text-3xl sm:text-4xl font-black" />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight">
            Praca i zlecenia budowlane <br />
            <span className="gradient-text-emerald">w jednym inteligentnym miejscu</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-md mx-auto leading-relaxed">
            Agregujemy realne zlecenia i etaty z <strong>OLX, Pracuj.pl i Oferteo</strong>. 
            Wyceniaj roboty kalkulatorem obmiaru i eksploruj inwestycje na <strong>Mapie 3D</strong>.
          </p>
        </motion.div>

        {/* Live Terminal Stream */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="max-w-md mx-auto"
        >
          <TerminalTyper />
        </motion.div>

        {/* Feature Cards Matrix */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-md mx-auto"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-xs flex flex-col items-center gap-1 text-center">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-foreground">Mapa 3D</span>
            <span className="text-[10px] text-muted-foreground">Żurawie & Dron</span>
          </div>

          <div className="p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-xs flex flex-col items-center gap-1 text-center">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-foreground">Auto-Wycena</span>
            <span className="text-[10px] text-muted-foreground">Oferta SMS/WA</span>
          </div>

          <div className="p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-xs flex flex-col items-center gap-1 text-center">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-foreground">Na Cito</span>
            <span className="text-[10px] text-muted-foreground">Awarie 24h</span>
          </div>

          <div className="p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-xs flex flex-col items-center gap-1 text-center">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-foreground">Wiarygodność</span>
            <span className="text-[10px] text-muted-foreground">Checklisty NIP</span>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          className="space-y-2.5 pt-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Button
            size="lg"
            className="w-full max-w-md mx-auto gap-2.5 h-13 text-sm sm:text-base font-extrabold shadow-lg hover:shadow-primary/25 transition-all cursor-pointer rounded-2xl"
            onClick={handleStart}
          >
            <span>Przeglądaj Oferty Ze Szczecina</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-[11px] font-semibold text-muted-foreground">
            ⚡ Bez rejestracji · 100% Darmowe · Odświeżanie w czasie rzeczywistym
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
