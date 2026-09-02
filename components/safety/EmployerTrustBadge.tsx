'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Shield, Check, AlertCircle } from 'lucide-react';
import { EmployerTrustReport } from '@/lib/safety/employerTrustEvaluator';

interface EmployerTrustBadgeProps {
  report?: EmployerTrustReport;
  trust?: EmployerTrustReport;
  className?: string;
}

export const EmployerTrustBadge: React.FC<EmployerTrustBadgeProps> = ({
  report,
  trust,
  className = '',
}) => {
  const currentReport = report || trust;
  const [showTooltip, setShowTooltip] = useState(false);

  if (!currentReport) return null;

  const getIcon = () => {
    switch (currentReport.level) {
      case 'VERIFIED_BUSINESS':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'ESTABLISHED_DIRECT':
        return <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'PRIVATE_INDIVIDUAL':
        return <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      default:
        return <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  const getColors = () => {
    switch (currentReport.level) {
      case 'VERIFIED_BUSINESS':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'ESTABLISHED_DIRECT':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'PRIVATE_INDIVIDUAL':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${getColors()}`}
      >
        {getIcon()}
        <span>{currentReport.badgeLabel}</span>
        <span className="opacity-70 font-mono text-[9px]">({currentReport.score}%)</span>
      </button>

      {/* Popover / Tooltip */}
      {showTooltip && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 bottom-full mb-1.5 z-50 w-64 p-3 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95 pointer-events-auto"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-bold text-foreground flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Wskaźnik wiarygodności: {currentReport.score}/100
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <p className="font-semibold text-muted-foreground">Weryfikacja:</p>
            {currentReport.safetyChecklist.map((item, i) => (
              <div key={i} className="flex items-start gap-1 text-foreground/90">
                <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {currentReport.recommendations.length > 0 && (
            <div className="pt-1 border-t border-border/40 space-y-1 text-[10.5px]">
              <p className="font-semibold text-amber-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Wskazówki BHP / Umowy:
              </p>
              {currentReport.recommendations.map((rec, i) => (
                <p key={i} className="text-muted-foreground leading-tight">
                  • {rec}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
