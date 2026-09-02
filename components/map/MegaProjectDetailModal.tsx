'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  HardHat,
  X,
  Compass,
  DollarSign,
  MessageSquare,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import type { MegaConstructionProject } from '@/lib/geo/szczecinMegaProjects';
import { PitchGeneratorModal } from '@/components/contact/PitchGeneratorModal';
import { triggerHaptic } from '@/lib/utils';

export interface MegaProjectDetailModalProps {
  project: MegaConstructionProject | null;
  onClose: () => void;
  onFlyTo?: (lng: number, lat: number) => void;
}

export function MegaProjectDetailModal({
  project,
  onClose,
  onFlyTo,
}: MegaProjectDetailModalProps) {
  const [pitchOpen, setPitchOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<string>('');

  if (!project) return null;

  const handlePitchClick = (trade: string) => {
    triggerHaptic(15);
    setSelectedTrade(trade);
    setPitchOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-card-foreground my-auto select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold shadow-xs">
                  <HardHat className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Inwestycja Strategiczna Szczecin
                  </span>
                  <h3 className="text-base font-black leading-snug text-foreground">
                    {project.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Zamknij"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Lokalizacja</span>
                <strong className="text-foreground font-bold truncate block">{project.district}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Żurawie wieżowe</span>
                <strong className="text-amber-600 dark:text-amber-400 font-black">🏗️ {project.towerCranesCount} szt.</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Budżet</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black">{project.estimatedValuePLN}</strong>
              </div>
            </div>

            {/* Developer & Description */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-muted/20 border border-border/40 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Generalny Wykonawca / Inwestor: {project.developer}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Demanded Subcontractors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Poszukiwani podwykonawcy i ekipy:
                </span>
                <span className="text-[10px] text-muted-foreground">Kliknij fach, aby zgłosić ekipę</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.demandedTrades.map((trade) => (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => handlePitchClick(trade)}
                    className="py-1 px-2.5 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/25 border border-primary/30 text-primary flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-103"
                  >
                    <span>⚡ {trade}</span>
                    <MessageSquare className="w-3 h-3 opacity-70" />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  onFlyTo?.(project.coordinates[0], project.coordinates[1]);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Najedź kamerą 3D</span>
              </button>

              <button
                type="button"
                onClick={() => handlePitchClick(project.demandedTrades[0] || 'Ekipa ogólnobudowlana')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Zgłoś ofertę B2B</span>
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <PitchGeneratorModal
        isOpen={pitchOpen}
        onClose={() => setPitchOpen(false)}
        phone="+48 91 400 00 00" // Szczecin general contractor placeholder/hotline
        title={`Podwykonawstwo na budowie: ${project.name} (${selectedTrade || 'Ekipa'})`}
        location={project.district}
        sourcePortal="Szczecin 3D Radar"
      />
    </>
  );
}
