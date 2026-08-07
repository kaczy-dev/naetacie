'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Clock, Calendar, Check, Briefcase, Phone, Heart } from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { STATUS_META, type ApplicationStatus, type TrackedApplication } from '@/lib/hooks/useApplicationTracking';
import { Button } from '@/components/ui/button';

export interface ApplicationTimelineModalProps {
  ad: DisplayAnnouncement | null;
  trackedApp?: TrackedApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onSetStatus: (status: ApplicationStatus) => void;
}

const TIMELINE_STEPS: Array<{ status: ApplicationStatus; title: string; desc: string; icon: string }> = [
  { status: 'saved', title: '1. Zapisano ofertę', desc: 'Ogłoszenie dodano do zakładek', icon: '🔖' },
  { status: 'applied', title: '2. Wysłano zgłoszenie', desc: 'Wysłano CV / wykonano telefon', icon: '📤' },
  { status: 'interview', title: '3. Rozmowa / Spotkanie', desc: 'Umówiona rozmowa z majstrem', icon: '📞' },
  { status: 'offer', title: '4. Przyjęto ofertę!', desc: 'Umowa podpisana, start pracy', icon: '🎉' },
];

export function ApplicationTimelineModal({
  ad,
  trackedApp,
  isOpen,
  onClose,
  onSetStatus,
}: ApplicationTimelineModalProps) {
  if (!isOpen || !ad) return null;

  const currentStatus = trackedApp?.status || 'saved';
  const history = trackedApp?.history || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 text-card-foreground"
        >
          {/* Header */}
          <div className="p-4 md:p-5 glass border-b border-border/50 flex items-center justify-between bg-card/90">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Briefcase className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base md:text-lg font-black text-foreground">Dziennik Aplikacji & Postęp</h2>
                <p className="text-xs text-muted-foreground line-clamp-1">{ad.title}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
              aria-label="Zamknij"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline Steps */}
          <div className="p-5 space-y-6 flex-1 overflow-y-auto">
            <div className="space-y-4 relative before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60">
              {TIMELINE_STEPS.map((step, i) => {
                const isActive = currentStatus === step.status;
                const isPast =
                  TIMELINE_STEPS.findIndex((s) => s.status === currentStatus) >= i;

                const historyItem = history.find((h) => h.status === step.status);

                return (
                  <div key={step.status} className="flex items-start gap-4 relative z-10">
                    <button
                      type="button"
                      onClick={() => onSetStatus(step.status)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all duration-300 ${
                        isActive
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-lg'
                          : isPast
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-muted text-muted-foreground border border-border/60 hover:bg-accent'
                      }`}
                    >
                      {isPast && !isActive ? <Check className="w-5 h-5" /> : step.icon}
                    </button>

                    <div className="flex-1 p-3 rounded-xl border border-border/50 bg-background/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {step.title}
                        </h3>
                        {historyItem && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(historyItem.timestamp).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 glass border-t border-border/50 bg-card/90 flex justify-end">
            <Button onClick={onClose} variant="default" size="sm" className="font-bold text-xs">
              Gotowe
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
