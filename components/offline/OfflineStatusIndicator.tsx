'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { flushOfflineQueue } from '@/lib/offline/offlineStorage';

export const OfflineStatusIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOffline(!navigator.onLine);

    const handleOnline = async () => {
      setIsOffline(false);
      setShowReconnected(true);
      await flushOfflineQueue();
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 sm:left-auto sm:right-4 z-40 max-w-sm pointer-events-none">
      {isOffline && (
        <div className="flex items-center gap-2 p-2.5 px-3.5 bg-slate-900/90 text-amber-300 border border-amber-500/30 rounded-xl shadow-lg backdrop-blur-xs text-xs font-semibold animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Tryb offline (PWA): Dane z pamięci podręcznej</span>
        </div>
      )}

      {showReconnected && (
        <div className="flex items-center gap-2 p-2.5 px-3.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 rounded-xl shadow-lg backdrop-blur-xs text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Połączenie przywrócone – zsynchronizowano dane</span>
        </div>
      )}
    </div>
  );
};
