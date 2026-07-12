'use client';

import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Briefcase, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo, Wordmark } from '@/components/brand/Logo';

/**
 * Landing hero — first thing new visitors see.
 * Explains the app value prop clearly with a CTA to continue.
 */
export function Hero({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-md text-center"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <Logo size={48} />
          <Wordmark className="text-3xl" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Oferty pracy budowlanej
          <br />
          <span className="text-primary">w jednym miejscu</span>
        </motion.h1>

        <motion.p
          className="text-muted-foreground text-sm md:text-base mb-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Realne ogłoszenia z OLX, Pracuj.pl i Indeed — Szczecin i okolice.
          Mapa, dopasowanie do Twoich umiejętności, śledzenie aplikacji.
        </motion.p>

        {/* Features */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Mapa ofert</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Dopasowanie</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Bezpieczeństwo</span>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button size="lg" className="w-full gap-2 h-12 text-base" onClick={onContinue}>
            Przeglądaj oferty <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Bez rejestracji · Dane odświeżane co 6h · Darmowe
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
