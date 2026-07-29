'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, PhoneCall, CheckCircle2, MessageSquare, Clock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Candidate {
  id: string;
  name: string;
  trade: string;
  phone: string;
  status: 'new' | 'contacted' | 'interview' | 'hired';
  date: string;
}

const INITIAL_CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Marek Wiśniewski', trade: 'Elektryk (SEP G1)', phone: '502 111 222', status: 'new', date: 'Dzisiaj' },
  { id: 'c2', name: 'Piotr Zieliński', trade: 'Murarz-Tynkarz', phone: '503 333 444', status: 'contacted', date: 'Wczoraj' },
  { id: 'c3', name: 'Tomasz Lewandowski', trade: 'Operator koparki UDT', phone: '504 555 666', status: 'interview', date: '2 dni temu' },
  { id: 'c4', name: 'Adam Wójcik', trade: 'Hydraulik CO/Wod-Kan', phone: '505 777 888', status: 'hired', date: '3 dni temu' },
];

export function AtsKanbanBoard() {
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);

  const moveStatus = (id: string, nextStatus: Candidate['status']) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );
  };

  const columns: Array<{ id: Candidate['status']; label: string; icon: typeof UserCheck; color: string }> = [
    { id: 'new', label: 'Nowe zgłoszenia', icon: Clock, color: '#2563eb' },
    { id: 'contacted', label: 'W kontakcie', icon: PhoneCall, color: '#d97706' },
    { id: 'interview', label: 'Rozmowa', icon: MessageSquare, color: '#9333ea' },
    { id: 'hired', label: 'Zatrudnieni', icon: CheckCircle2, color: '#16a34a' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          System Zarządzania Kandydatami (ATS Light)
        </h4>
        <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
          Kandydatów: {candidates.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col) => {
          const Icon = col.icon;
          const colCandidates = candidates.filter((c) => c.status === col.id);

          return (
            <div key={col.id} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: col.color }} /> {col.label}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-background border border-border/60">
                  {colCandidates.length}
                </span>
              </div>

              <div className="space-y-2 flex-1 min-h-[120px]">
                {colCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-card border border-border/70 shadow-xs space-y-1 text-xs"
                  >
                    <div className="font-bold text-foreground">{c.name}</div>
                    <div className="text-[11px] text-primary font-semibold">{c.trade}</div>
                    <div className="text-[10px] text-muted-foreground">tel: {c.phone}</div>

                    <div className="pt-1 flex items-center justify-between border-t border-border/30 text-[9px] text-muted-foreground">
                      <span>{c.date}</span>
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
                            className="px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-bold cursor-pointer"
                          >
                            Dalej →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
