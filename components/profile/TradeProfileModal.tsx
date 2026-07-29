'use client';

/**
 * User & Trade Specialist Profile Modal.
 * Allows job seekers and employers to manage their trade badge, certifications,
 * expected rates, and notification preferences.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Award,
  DollarSign,
  Briefcase,
  User,
  Building2,
  Bell,
  Save,
} from 'lucide-react';
import type { UserProfile, UserRole, TradeCertifications } from '@/lib/types/user';
import { triggerHaptic } from '@/lib/utils';

export interface TradeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSaveProfile: (updated: Partial<UserProfile>) => Promise<void>;
  isDark: boolean;
}

const TRADES_LIST = [
  'Elektryk / Instalacje',
  'Hydraulik / CO / Wod-Kan',
  'Murarz / Zbrojarz',
  'Dekarz / Pokrycia dachowe',
  'Malarz / Wykończenia',
  'Operator koparki / Maszyn',
  'Spawacz MIG/MAG',
  'Stolarz / Monter',
  'Kierownik budowy',
  'Pomocnik budowlany',
];

export function TradeProfileModal({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  isDark,
}: TradeProfileModalProps) {
  const [role, setRole] = useState<UserRole>(profile?.role || 'candidate');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [selectedTrades, setSelectedTrades] = useState<string[]>(profile?.trades || ['Elektryk / Instalacje']);
  const [expectedSalary, setExpectedSalary] = useState<number>(profile?.expected_salary_min || 7000);
  const [certs, setCerts] = useState<Partial<TradeCertifications>>(
    profile?.certifications || {
      sep: true,
      udt: false,
      fgaz: false,
      drivingLicenseB: true,
      heights: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const toggleTrade = (trade: string) => {
    triggerHaptic(10);
    if (selectedTrades.includes(trade)) {
      setSelectedTrades(selectedTrades.filter((t) => t !== trade));
    } else {
      setSelectedTrades([...selectedTrades, trade]);
    }
  };

  const toggleCert = (key: keyof TradeCertifications) => {
    triggerHaptic(10);
    setCerts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    triggerHaptic(15);
    setSaving(true);
    try {
      await onSaveProfile({
        role,
        display_name: displayName,
        trades: selectedTrades,
        expected_salary_min: expectedSalary,
        certifications: certs,
      });
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
      }, 1000);
    } catch {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            isDark ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900 border border-slate-200'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-emerald-600/10 to-blue-600/10">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold text-base md:text-lg">Profil Fachowca i Ustawienia</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 text-sm">
            {/* Role Switch */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Rola w serwisie
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { triggerHaptic(10); setRole('candidate'); }}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold transition-all text-xs cursor-pointer ${
                    role === 'candidate'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'border-border/50 hover:bg-slate-500/10'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Szukam Pracy (Fachowiec)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(10); setRole('employer'); }}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold transition-all text-xs cursor-pointer ${
                    role === 'employer'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'border-border/50 hover:bg-slate-500/10'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Zatrudniam (Pracodawca)</span>
                </button>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Imię i Nazwisko / Nazwa Firmy
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="np. Jan Kowalski"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Selected Trades */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Wykonywane Profesje / Fach
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TRADES_LIST.map((t) => {
                  const active = selectedTrades.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTrade(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-border/40 hover:bg-slate-500/10 text-muted-foreground'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}{t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Certifications Badges */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Uprawnienia i Certyfikaty (Cyfrowy Badge)
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'sep', label: 'Uprawnienia SEP (G1/G2/G3)' },
                  { key: 'udt', label: 'Uprawnienia UDT (Koparki/Wózki)' },
                  { key: 'fgaz', label: 'Certyfikat F-gazowy' },
                  { key: 'drivingLicenseB', label: 'Prawo jazdy kat. B' },
                  { key: 'drivingLicenseC', label: 'Prawo jazdy kat. C / C+E' },
                  { key: 'heights', label: 'Praca na wysokości' },
                ].map((item) => {
                  const k = item.key as keyof TradeCertifications;
                  const active = !!certs[k];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleCert(k)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                          : 'border-border/40 text-muted-foreground hover:bg-slate-500/10'
                      }`}
                    >
                      <span className="text-[11px]">{item.label}</span>
                      {active && <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expected Minimum Salary */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Oczekiwana Stawka Minimalna
                </label>
                <span className="font-extrabold text-emerald-500 text-sm">{expectedSalary} PLN / mies.</span>
              </div>
              <input
                type="range"
                min={4000}
                max={16000}
                step={500}
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/40 flex items-center justify-between bg-muted/20">
            {successMsg ? (
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" /> Profil został pomyślnie zapisany!
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Zapisywanie...' : 'Zapisz profil'}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
