'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  Zap,
  Calendar,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, triggerHaptic } from '@/lib/utils';
import { useToast } from '@/components/feedback/ToastProvider';

export interface SkillCert {
  id: string;
  name: string;
  category: 'elektryka' | 'maszyny' | 'kierowca' | 'spawanie' | 'general';
  issuedDate?: string;
  expiryDate?: string;
  active: boolean;
}

const DEFAULT_SKILLS: SkillCert[] = [
  { id: 'sep_g1', name: 'Uprawnienia SEP G1 (Elektryczne do 1kV)', category: 'elektryka', active: true },
  { id: 'udt_wozki', name: 'Certyfikat UDT — Wózki widłowe (II WJO)', category: 'maszyny', active: true },
  { id: 'udt_zwyzki', name: 'UDT Podesty ruchome / Zwyżki (IP)', category: 'maszyny', active: false },
  { id: 'prawo_ce', name: 'Prawo jazdy Kat. C+E + Karta Kierowcy', category: 'kierowca', active: false },
  { id: 'spawacz_tig', name: 'Spawacz TIG 141 (ISO 9606-1)', category: 'spawanie', active: true },
  { id: 'spawacz_mag', name: 'Spawacz MAG 135', category: 'spawanie', active: false },
  { id: 'koparka', name: 'Uprawnienia na Koparko-Ładowarki Klasa III', category: 'maszyny', active: false },
  { id: 'sep_g2', name: 'SEP G2 Cieplne / Kotły i Ciepłownie', category: 'elektryka', active: false },
];

export function SkillWallet() {
  const { show: showToast } = useToast();
  const [skills, setSkills] = useState<SkillCert[]>(DEFAULT_SKILLS);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('naetacie_skill_wallet');
      if (saved) {
        setSkills(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load skill wallet', e);
    }
  }, []);

  const saveSkills = (newSkills: SkillCert[]) => {
    setSkills(newSkills);
    try {
      localStorage.setItem('naetacie_skill_wallet', JSON.stringify(newSkills));
    } catch (e) {
      console.warn('Failed to save skill wallet', e);
    }
  };

  const toggleSkill = (id: string) => {
    triggerHaptic(12);
    const updated = skills.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    saveSkills(updated);
    const item = skills.find((s) => s.id === id);
    if (item) {
      showToast(item.active ? 'info' : 'success', item.active ? `Usunięto: ${item.name}` : `Aktywowano: ${item.name}`);
    }
  };

  const activeCount = skills.filter((s) => s.active).length;
  const matchPowerScore = Math.min(100, Math.round((activeCount / 4) * 100));

  const filteredSkills = filterCategory === 'all'
    ? skills
    : skills.filter((s) => s.category === filterCategory);

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-foreground">Cyfrowy Portfel Uprawnień (SEP/UDT)</h3>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px]">
                {activeCount} Certyfikatów
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Automatyczne dopasowywanie ogłoszeń wg Twoich certyfikatów</p>
          </div>
        </div>

        {/* Skill Score Badge */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 via-primary/10 to-transparent border border-amber-500/20 px-3.5 py-1.5 rounded-xl">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Wskaźnik Kwalifikacji</span>
            <span className="text-xs font-black text-amber-600 dark:text-amber-400">{matchPowerScore}% (Gotowy do pracy)</span>
          </div>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        {[
          { id: 'all', label: 'Wszystkie' },
          { id: 'elektryka', label: '⚡ Elektryka (SEP)' },
          { id: 'maszyny', label: '🚜 Maszyny & UDT' },
          { id: 'spawanie', label: '🔥 Spawanie' },
          { id: 'kierowca', label: '🚛 Transport & C+E' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap',
              filterCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-accent/40 text-muted-foreground hover:text-foreground'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <AnimatePresence>
          {filteredSkills.map((s) => (
            <motion.div
              key={s.id}
              onClick={() => toggleSkill(s.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3',
                s.active
                  ? 'bg-amber-500/5 border-amber-500/30 text-foreground ring-1 ring-amber-500/10 shadow-xs'
                  : 'bg-card/40 border-border/40 text-muted-foreground hover:border-border'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                    s.active ? 'bg-amber-500 text-white shadow-xs' : 'bg-accent text-muted-foreground'
                  )}
                >
                  {s.active ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <span className={cn('text-xs font-bold block leading-tight', s.active && 'text-foreground')}>
                    {s.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold capitalize">
                    Kategoria: {s.category}
                  </span>
                </div>
              </div>

              {s.active && (
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                  Aktywne
                </Badge>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
