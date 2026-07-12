'use client';

/**
 * Persists the user's job search preferences in localStorage and exposes
 * a stable setter. Used by the matching engine to score/sort offers.
 */

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_PREFERENCES, type JobPreferences } from '@/lib/matching/types';

const STORAGE_KEY = 'job-preferences';

export function useJobPreferences() {
  const [preferences, setPreferences] = useState<JobPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(raw) });
      }
    } catch {
      /* ignore corrupt data */
    }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<JobPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { preferences, update, reset, loaded };
}
