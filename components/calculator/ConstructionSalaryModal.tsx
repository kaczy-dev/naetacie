'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  X,
  Sparkles,
  TrendingUp,
  Percent,
  Wallet,
  Car,
  Wrench,
  Users,
  Briefcase,
  DollarSign,
  Info,
  Check,
} from 'lucide-react';
import {
  calculateConstructionSalary,
  ContractType,
  RateType,
  SalaryCalculatorInput,
} from '@/lib/calculators/constructionSalaryCalculator';
import { Button } from '@/components/ui/button';
import { cn, triggerHaptic } from '@/lib/utils';

export interface ConstructionSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialPrice?: number | string | null;
  initialPortal?: string;
}

const CONTRACT_LABELS: Record<ContractType, { name: string; desc: string; badge: string }> = {
  uop: { name: 'Umowa o Pracę (UoP)', desc: 'Pełny ZUS + płatny urlop + KUP', badge: 'Standard' },
  uz: { name: 'Umowa Zlecenie', desc: 'Składki ZUS + 20% KUP', badge: 'Popularne' },
  uz_student: { name: 'Zlecenie Student (<26 lat)', desc: '0% ZUS i 0% PIT (100% na rękę!)', badge: '0% Podatku' },
  b2b_ryczalt_8_5: { name: 'B2B Ryczałt 8.5%', desc: 'Prace budowlane i wykończeniowe', badge: 'Budownictwo' },
  b2b_ryczalt_12: { name: 'B2B Ryczałt 12%', desc: 'Inżynieria i doradztwo techniczne', badge: 'Niski podatek' },
  b2b_liniowy: { name: 'B2B Liniowy 19%', desc: 'Wyższe dochody i kosztowa rozliczenia', badge: 'Faktura VAT' },
};

export default function ConstructionSalaryModal({
  isOpen,
  onClose,
  initialTitle = 'Przelicz Wynagrodzenie',
  initialPrice,
}: ConstructionSalaryModalProps) {
  // Parse numeric initial price if present
  const parsedInitialPrice = useMemo(() => {
    if (typeof initialPrice === 'number' && initialPrice > 0) return initialPrice;
    if (typeof initialPrice === 'string') {
      const match = initialPrice.match(/(\d[\d\s]*)/);
      if (match) return parseInt(match[1].replace(/\s/g, ''), 10) || 7000;
    }
    return 7000;
  }, [initialPrice]);

  const isHourlyPreset = parsedInitialPrice > 0 && parsedInitialPrice <= 150;

  const [rateType, setRateType] = useState<RateType>(isHourlyPreset ? 'hourly' : 'monthly');
  const [rateValue, setRateValue] = useState<number>(parsedInitialPrice);
  const [contractType, setContractType] = useState<ContractType>('uop');
  const [hoursPerMonth, setHoursPerMonth] = useState<number>(168);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [overtimeBonusPercent, setOvertimeBonusPercent] = useState<number>(50);
  const [pieceworkUnits, setPieceworkUnits] = useState<number>(120);
  const [teamMembers, setTeamMembers] = useState<number>(1);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(21);
  const [fuelCost, setFuelCost] = useState<number>(300);
  const [toolAmortization, setToolAmortization] = useState<number>(150);

  const breakdown = useMemo(() => {
    const input: SalaryCalculatorInput = {
      rateType,
      rateValue,
      hoursPerMonth,
      overtimeHours,
      overtimeBonusPercent,
      pieceworkUnitsPerMonth: pieceworkUnits,
      teamMembersCount: teamMembers,
      daysPerMonth,
      contractType,
      monthlyFuelCost: fuelCost,
      monthlyToolAmortization: toolAmortization,
    };
    return calculateConstructionSalary(input);
  }, [
    rateType,
    rateValue,
    hoursPerMonth,
    overtimeHours,
    overtimeBonusPercent,
    pieceworkUnits,
    teamMembers,
    daysPerMonth,
    contractType,
    fuelCost,
    toolAmortization,
  ]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-3xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden glass max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/15 text-primary border border-primary/30">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                  Kalkulator Zarobków Budowlanych
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Netto & Na Rękę
                  </span>
                </h3>
                <p className="text-xs font-medium text-muted-foreground truncate max-w-[320px] sm:max-w-md">
                  {initialTitle}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Top Stat Overview Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 text-card-foreground">
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" /> Na Rękę (Czyszczonka)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {breakdown.realDisposableIncome.toLocaleString('pl-PL')} zł
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Po odliczeniu podatków, paliwa i sprzętu
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/60 border border-border/70">
                <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> Stawka Miesięczna Brutto
                </span>
                <div className="text-xl sm:text-2xl font-black text-foreground mt-1">
                  {breakdown.grossMonthlyTotal.toLocaleString('pl-PL')} zł
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Podatki i ZUS: -{breakdown.taxDeductions.totalDeductions.toLocaleString('pl-PL')} zł ({breakdown.effectiveTaxRatePercent}%)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/60 border border-border/70">
                <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Efektywna Stawka/h
                </span>
                <div className="text-xl sm:text-2xl font-black text-foreground mt-1">
                  {breakdown.hourlyNetRate} zł / h
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Czysta stawka netto za godzinę pracy
                </span>
              </div>
            </div>

            {/* Step 1: Rate Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" /> 1. Sposób Rozliczania Stawek
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'monthly', label: 'Miesięcznie (zł/mc)' },
                  { id: 'hourly', label: 'Godzinowo (zł/h)' },
                  { id: 'daily', label: 'Dniówka (zł/dzień)' },
                  { id: 'piecework', label: 'Akord (zł/m²)' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(6);
                      setRateType(type.id as RateType);
                    }}
                    className={cn(
                      'py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all text-center touch-manipulation',
                      rateType === type.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Value Controls */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-foreground">
                  Stawka Bazowa: <strong className="text-primary text-sm">{rateValue} zł</strong>
                </label>
                <input
                  type="number"
                  value={rateValue}
                  onChange={(e) => setRateValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full sm:w-36 px-3 py-1.5 rounded-xl border border-border bg-background text-sm font-bold"
                />
              </div>

              {rateType === 'hourly' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Godziny podstawowe / miesiąc:</span>
                      <strong className="text-foreground">{hoursPerMonth} h</strong>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="240"
                      value={hoursPerMonth}
                      onChange={(e) => setHoursPerMonth(parseInt(e.target.value, 10))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Nadgodziny (+50%):</span>
                      <strong className="text-foreground">{overtimeHours} h</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(parseInt(e.target.value, 10))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              )}

              {rateType === 'piecework' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Wykonane metry (m²) / miesiąc:</label>
                    <input
                      type="number"
                      value={pieceworkUnits}
                      onChange={(e) => setPieceworkUnits(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">Liczba osób w brygadzie:</label>
                    <input
                      type="number"
                      value={teamMembers}
                      min="1"
                      onChange={(e) => setTeamMembers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-sm font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Contract Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-primary" /> 2. Format Umowy & Podatki
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(CONTRACT_LABELS) as ContractType[]).map((key) => {
                  const item = CONTRACT_LABELS[key];
                  const isSelected = contractType === key;

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        triggerHaptic(8);
                        setContractType(key);
                      }}
                      className={cn(
                        'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 active:scale-[0.98]',
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                          : 'border-border/60 bg-muted/30 hover:bg-muted/60'
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-foreground">{item.name}</span>
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>

                      {isSelected && <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Expenses (Fuel & Tools) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Car className="w-4 h-4 text-primary" /> 3. Koszty Eksploatacji & Dojazdów (Miesięcznie)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/40 border border-border/60">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5 text-muted-foreground" /> Koszt paliwa / dojazdów:</span>
                    <strong className="text-foreground">{fuelCost} zł</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1500"
                    step="50"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(parseInt(e.target.value, 10))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5 text-muted-foreground" /> Amortyzacja własnych narzędzi:</span>
                    <strong className="text-foreground">{toolAmortization} zł</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={toolAmortization}
                    onChange={(e) => setToolAmortization(parseInt(e.target.value, 10))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/40 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-primary" /> Wyliczenia są szacunkiem na podstawie polskiego ładu podatkowego 2026.
            </span>
            <Button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 font-bold rounded-xl bg-primary text-primary-foreground shadow-md"
            >
              Gotowe
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
