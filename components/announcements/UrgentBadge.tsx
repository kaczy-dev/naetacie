'use client';

import React from 'react';
import { Flame, Zap, AlertTriangle } from 'lucide-react';
import { UrgencyAnalysis } from '@/lib/urgent/urgentJobDetector';

interface UrgentBadgeProps {
  urgency: UrgencyAnalysis;
  className?: string;
}

export const UrgentBadge: React.FC<UrgentBadgeProps> = ({ urgency, className = '' }) => {
  if (!urgency.isUrgent) return null;

  const isEmergency = urgency.level === 'EMERGENCY_CITO';

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-xs transition-all ${
        isEmergency
          ? 'bg-rose-500 text-white animate-pulse border border-rose-400'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
      } ${className}`}
    >
      {isEmergency ? (
        <AlertTriangle className="w-3 h-3 text-white shrink-0" />
      ) : (
        <Flame className="w-3 h-3 text-amber-500 shrink-0" />
      )}
      <span>{urgency.badgeLabel}</span>
    </div>
  );
};
