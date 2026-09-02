'use client';

import React, { useState } from 'react';
import { MessageSquare, Phone, Send, Sparkles, Check, Copy } from 'lucide-react';
import { generateApplicationMessageDraft, formatPhoneNumber } from '@/lib/contact/draftGenerator';
import { triggerHaptic } from '@/lib/utils';

export interface DirectContactActionsProps {
  phone?: string | null;
  title: string;
  sourcePortal?: string | null;
  applicantSkills?: string[];
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function DirectContactActions({
  phone,
  title,
  sourcePortal,
  applicantSkills = [],
  className = '',
  size = 'sm',
}: DirectContactActionsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [tone, setTone] = useState<'direct' | 'formal' | 'quick'>('direct');
  const [proposedRate, setProposedRate] = useState<string>('');
  const [applicantName, setApplicantName] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!phone) return null;

  const draft = generateApplicationMessageDraft({
    phone,
    title,
    sourcePortal: sourcePortal || 'OLX',
    applicantSkills,
    proposedRate: proposedRate ? Number(proposedRate) || proposedRate : undefined,
    applicantName: applicantName.trim() || undefined,
    tone,
  });

  if (!draft) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(true);
      triggerHaptic([10, 20, 10]);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleSmsClick = () => {
    triggerHaptic(15);
    window.location.href = draft.smsUrl;
  };

  const handleWhatsAppClick = () => {
    triggerHaptic(15);
    window.open(draft.whatsAppUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {/* Quick 1-Click SMS Button */}
        <button
          type="button"
          onClick={handleSmsClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-97 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          title="Wyślij SMS z gotowym zgłoszeniem"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>SMS</span>
        </button>

        {/* WhatsApp Button */}
        <button
          type="button"
          onClick={handleWhatsAppClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-97 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          title="Otwórz czat WhatsApp"
        >
          <Send className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>

        {/* Call Button */}
        <a
          href={`tel:${draft.phone}`}
          onClick={() => triggerHaptic(15)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/60 hover:bg-muted text-foreground text-xs font-medium transition-all"
          title={`Zadzwoń: ${draft.formattedPhone}`}
        >
          <Phone className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">{draft.formattedPhone}</span>
        </a>

        {/* Customize Message Button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="p-1.5 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Dostosuj treść wiadomości przed wysłaniem"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        </button>
      </div>

      {/* Modal: Customize SMS / WhatsApp Draft */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-5 shadow-2xl space-y-4 text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-none">1-Click Aplikacja SMS / WhatsApp</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Telefon: {draft.formattedPhone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Controls */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Styl wiadomości:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['direct', 'formal', 'quick'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-all cursor-pointer ${
                        tone === t
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {t === 'direct' ? 'Bezpośredni' : t === 'formal' ? 'Formalny' : 'Szybki'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Twoje imię:</label>
                  <input
                    type="text"
                    placeholder="np. Piotr"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Stawka proponowana (zł):</label>
                  <input
                    type="number"
                    placeholder="np. 45"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              {/* Draft Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold">Podgląd wiadomości:</label>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Skopiowano!' : 'Kopiuj'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs leading-relaxed select-all">
                  {draft.text}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSmsClick}
                className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Otwórz w SMS</span>
              </button>
              <button
                type="button"
                onClick={handleWhatsAppClick}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Otwórz w WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
