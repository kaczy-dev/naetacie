'use client';

/**
 * Tracks the status of job applications the user is following.
 * Persisted in localStorage so it survives reloads and works offline.
 *
 * This is the "śledzenie ofert" feature: the user marks an offer as
 * "zapisane / aplikowano / rozmowa / odrzucone" and the list can filter
 * and badge them accordingly.
 */

import { useState, useEffect, useCallback } from 'react';

export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'rejected' | 'offer';

export interface TrackedApplication {
  id: string;
  status: ApplicationStatus;
  note: string;
  updatedAt: number;
}

const STORAGE_KEY = 'tracked-applications';

export const STATUS_META: Record<ApplicationStatus, { label: string; color: string; icon: string }> = {
  saved: { label: 'Zapisane', color: '#6b7280', icon: '🔖' },
  applied: { label: 'Aplikowano', color: '#2563eb', icon: '📤' },
  interview: { label: 'Rozmowa', color: '#9333ea', icon: '📞' },
  offer: { label: 'Oferta', color: '#16a34a', icon: '🎉' },
  rejected: { label: 'Odrzucone', color: '#dc2626', icon: '❌' },
};

export function useApplicationTracking() {
  const [tracked, setTracked] = useState<Record<string, TrackedApplication>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTracked(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Record<string, TrackedApplication>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
  }, []);

  const setStatus = useCallback((id: string, status: ApplicationStatus, note = '') => {
    setTracked((prev) => {
      const next = { ...prev, [id]: { id, status, note, updatedAt: Date.now() } };
      persist(next);
      return next;
    });
  }, [persist]);

  const remove = useCallback((id: string) => {
    setTracked((prev) => {
      const next = { ...prev };
      delete next[id];
      persist(next);
      return next;
    });
  }, [persist]);

  const getStatus = useCallback((id: string): ApplicationStatus | null => {
    return tracked[id]?.status ?? null;
  }, [tracked]);

  return { tracked, setStatus, remove, getStatus, count: Object.keys(tracked).length };
}
