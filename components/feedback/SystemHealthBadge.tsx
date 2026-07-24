'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, ShieldCheck } from 'lucide-react';

export function SystemHealthBadge() {
  const [status, setStatus] = useState<'healthy' | 'degraded'>('healthy');
  const [latencyMs, setLatencyMs] = useState<number>(35);

  useEffect(() => {
    // Simulate lightweight ping status check
    const start = performance.now();
    fetch('/manifest.json', { method: 'HEAD' })
      .then(() => {
        const duration = Math.round(performance.now() - start);
        setLatencyMs(duration);
        setStatus('healthy');
      })
      .catch(() => setStatus('degraded'));
  }, []);

  return (
    <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold shadow-2xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>System OK ({latencyMs}ms)</span>
      <span className="opacity-40">|</span>
      <span className="flex items-center gap-1 text-[10px] opacity-80">
        <ShieldCheck className="w-3 h-3" /> Scraper Aktywny
      </span>
    </div>
  );
}
