'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Copy, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateCoverLetter } from '@/lib/ai/coverLetter';
import { useToast } from '@/components/feedback/ToastProvider';
import { triggerHaptic } from '@/lib/utils';
import type { DisplayAnnouncement } from '@/lib/types/display';

export interface CoverLetterModalProps {
  ad: DisplayAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CoverLetterModal({ ad, isOpen, onClose }: CoverLetterModalProps) {
  const { show: showToast } = useToast();

  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantSkills, setApplicantSkills] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('3-5 lat');
  const [tone, setTone] = useState<'formal' | 'direct'>('formal');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !ad) return null;

  const generatedText = generateCoverLetter({
    jobTitle: ad.title,
    companyName: ad.company,
    locationText: ad.location_text,
    sourcePortal: ad.source_portal,
    applicantName,
    applicantPhone,
    applicantSkills,
    yearsOfExperience,
    tone,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    triggerHaptic(12);
    showToast('success', 'Skopiowano list motywacyjny do schowka!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-6 space-y-5 my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-1.5">
                  AI Generator Aplikacji i Listu Motywacyjnego
                </h3>
                <p className="text-xs text-muted-foreground">
                  Dla oferty: <span className="font-semibold text-foreground">{ad.title}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-muted-foreground block mb-1">Twoje Imię i Nazwisko</label>
              <Input
                placeholder="Jan Kowalski"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground block mb-1">Numer Telefonu</label>
              <Input
                placeholder="500-123-456"
                value={applicantPhone}
                onChange={(e) => setApplicantPhone(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground block mb-1">Doświadczenie</label>
              <Input
                placeholder="np. 4 lata"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground block mb-1">Styl wiadomości</label>
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setTone('formal')}
                  className={`flex-1 py-1 px-2 rounded-lg border text-xs font-semibold ${
                    tone === 'formal' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Oficjalny
                </button>
                <button
                  type="button"
                  onClick={() => setTone('direct')}
                  className={`flex-1 py-1 px-2 rounded-lg border text-xs font-semibold ${
                    tone === 'direct' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Krótki & Bezpośredni
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-xs text-muted-foreground block mb-1">
              Główne umiejętności / atuty (opcjonalnie)
            </label>
            <Input
              placeholder="np. uprawnienia SEP, układanie płyt GK, własny transport"
              value={applicantSkills}
              onChange={(e) => setApplicantSkills(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Generated Result Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> Wygenerowany Tekst Wiadomości
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                Gotowe do wysłania
              </span>
            </div>

            <div className="relative p-4 rounded-xl bg-muted/40 border border-border/60 text-xs md:text-sm font-sans whitespace-pre-line leading-relaxed text-foreground max-h-60 overflow-y-auto">
              {generatedText}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Zamknij
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCopy}
              className="gap-2 text-xs font-extrabold bg-primary text-primary-foreground shadow-md"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Skopiowano!' : 'Kopiuj Wiadomość'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
