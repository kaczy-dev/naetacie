'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, PhoneCall, CheckCircle2, MessageSquare, Clock, Plus, Search, Filter, Phone } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export interface Candidate {
  id: string;
  name: string;
  trade: string;
  phone: string;
  cert?: string;
  status: 'new' | 'contacted' | 'interview' | 'hired';
  date: string;
}

const INITIAL_CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Marek Wiśniewski', trade: 'Elektryk budowlany', cert: 'SEP G1/G2', phone: '502-111-222', status: 'new', date: 'Dzisiaj 09:30' },
  { id: 'c2', name: 'Piotr Zieliński', trade: 'Murarz-Tynkarz', cert: 'Praca na wysokości', phone: '503-333-444', status: 'contacted', date: 'Wczoraj' },
  { id: 'c3', name: 'Tomasz Lewandowski', trade: 'Operator koparki', cert: 'UDT Kat. III', phone: '504-555-666', status: 'interview', date: '2 dni temu' },
  { id: 'c4', name: 'Adam Wójcik', trade: 'Hydraulik CO/Wod-Kan', cert: 'F-gaz', phone: '505-777-888', status: 'hired', date: '3 dni temu' },
  { id: 'c5', name: 'Krzysztof Kowalczyk', trade: 'Dekarz-Blacharz', cert: 'B+E', phone: '506-888-999', status: 'new', date: 'Dzisiaj 11:15' },
];

export function AtsKanbanBoard() {
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState<string | null>(null);

  const moveStatus = (id: string, nextStatus: Candidate['status']) => {
    triggerHaptic(12);
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.trade.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCert = selectedCert ? c.cert?.includes(selectedCert) : true;
    return matchesSearch && matchesCert;
  });

  const columns: Array<{ id: Candidate['status']; label: string; icon: typeof UserCheck; color: string }> = [
    { id: 'new', label: 'Nowe zgłoszenia', icon: Clock, color: '#2563eb' },
    { id: 'contacted', label: 'W kontakcie', icon: PhoneCall, color: '#d97706' },
    { id: 'interview', label: 'Rozmowa', icon: MessageSquare, color: '#9333ea' },
    { id: 'hired', label: 'Zatrudnieni', icon: CheckCircle2, color: '#16a34a' },
  ];

  return (
    <div className="space-y-3">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/50">
        <div>
          <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
            System Zarządzania Kandydatami (ATS Light)
          </h4>
          <p className="text-[10px] text-muted-foreground">
            Śledź rekrutację fachowców w czasie rzeczywistym
          </p>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj kandydata..."
              className="w-full pl-6 pr-2 py-1 text-[11px] rounded-lg bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <span className="text-[10px] font-mono font-extrabold bg-primary/10 text-primary px-2 py-1 rounded-lg border border-primary/20 shrink-0">
            {filteredCandidates.length} kandydatów
          </span>
        </div>
      </div>

      {/* Trade Cert Filter Chips */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] no-scrollbar">
        <span className="text-muted-foreground font-semibold flex items-center gap-0.5 shrink-0">
          <Filter className="w-2.5 h-2.5 text-primary" /> Uprawnienia:
        </span>
        {['SEP', 'UDT', 'F-gaz', 'B+E', 'Praca na wysokości'].map((cert) => {
          const isActive = selectedCert === cert;
          return (
            <button
              key={cert}
              onClick={() => {
                triggerHaptic(8);
                setSelectedCert(isActive ? null : cert);
              }}
              className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border/40'
              }`}
            >
              {cert}
            </button>
          );
        })}
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col) => {
          const Icon = col.icon;
          const colCandidates = filteredCandidates.filter((c) => c.status === col.id);

          return (
            <div key={col.id} className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: col.color }} /> {col.label}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-muted border border-border/60 text-muted-foreground">
                  {colCandidates.length}
                </span>
              </div>

              <div className="space-y-2 flex-1 min-h-[140px] pt-1">
                <AnimatePresence mode="popLayout">
                  {colCandidates.map((c) => (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="p-2.5 rounded-lg bg-background border border-border/80 shadow-xs space-y-1.5 hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-heading font-bold text-[11px] text-foreground group-hover:text-primary transition-colors">
                          {c.name}
                        </div>
                        {c.cert && (
                          <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            {c.cert}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-muted-foreground font-medium">
                        {c.trade}
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-border/40 text-[9px]">
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                        >
                          <Phone className="w-2.5 h-2.5" /> {c.phone}
                        </a>

                        <div className="flex gap-1">
                          {col.id !== 'hired' && (
                            <button
                              onClick={() => {
                                const nexts: Record<Candidate['status'], Candidate['status']> = {
                                  new: 'contacted',
                                  contacted: 'interview',
                                  interview: 'hired',
                                  hired: 'hired',
                                };
                                moveStatus(c.id, nexts[col.id]);
                              }}
                              className="px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary text-[9px] hover:text-white font-extrabold transition-colors cursor-pointer"
                            >
                              Dalej →
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {colCandidates.length === 0 && (
                  <div className="h-full min-h-[100px] flex items-center justify-center text-[10px] text-muted-foreground/60 border border-dashed border-border/60 rounded-lg">
                    Brak kandydatów
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
