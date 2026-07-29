'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AtsKanbanBoard } from './AtsKanbanBoard';

export interface EmployerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdCreated?: (title: string) => void;
}

export function EmployerPortalModal({ isOpen, onClose, onAdCreated }: EmployerPortalModalProps) {
  const [tab, setTab] = useState<'create' | 'kanban'>('create');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Szczecin, Centrum');
  const [desc, setDesc] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSuccess(true);
    if (onAdCreated) onAdCreated(title);
    setTimeout(() => {
      setSuccess(false);
      setTitle('');
      setCompany('');
      setPrice('');
      setDesc('');
      setTab('kanban');
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-5 space-y-4 my-8 relative max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black">Panel Pracodawcy i Wykonawcy (B2B)</h3>
                <p className="text-[11px] text-muted-foreground">
                  Publikacja ofert bezpośrednich i obsługa zgłoszeń fachowców w Szczecinie
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-border/40 pb-2 shrink-0">
            <Button
              onClick={() => setTab('create')}
              variant={tab === 'create' ? 'default' : 'outline'}
              size="sm"
              className="text-xs font-bold gap-1.5 h-8 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Dodaj Nowe Ogłoszenie
            </Button>
            <Button
              onClick={() => setTab('kanban')}
              variant={tab === 'kanban' ? 'default' : 'outline'}
              size="sm"
              className="text-xs font-bold gap-1.5 h-8 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Tablica Kandydatów (ATS)
            </Button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            {tab === 'create' ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                {success && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Ogłoszenie opublikowane pomyślnie! Przechodzenie do tablicy kandydatów...
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Tytuł ogłoszenia</label>
                    <Input
                      placeholder="np. Poszukiwany Murarz-Tynkarz od zaraz"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Nazwa firmy / Pracodawca</label>
                    <Input
                      placeholder="np. BudMax Szczecin Sp. z o.o."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Wynagrodzenie (brutto / mies.)</label>
                    <Input
                      placeholder="np. 7500 zł"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Lokalizacja w Szczecinie</label>
                    <Input
                      placeholder="np. Szczecin, Prawobrzeże"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Opis stanowiska i wymagania</label>
                  <textarea
                    placeholder="Wpisz zakres obowiązków, godziny pracy, uprawnienia..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-md border border-input bg-transparent resize-none h-24 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full text-xs font-bold gap-2 h-10 bg-primary text-primary-foreground shadow-md cursor-pointer"
                >
                  <Building2 className="w-4 h-4" /> Opublikuj Ogłoszenie Bezpośrednie
                </Button>
              </form>
            ) : (
              <AtsKanbanBoard />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
