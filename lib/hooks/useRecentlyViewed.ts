'use client';

/**
 * Tracks recently viewed offers (max 10, most-recent-first) in localStorage.
 * Lets users quickly return to offers they clicked, even after a refresh.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recently-viewed';
const MAX_ITEMS = 10;

export function useRecentlyViewed() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const markViewed = useCallback((id: string) => {
    setRecent((prev) => {
      // Move to front, dedupe, cap at MAX_ITEMS
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full */
      }
      return next;
    });
  }, []);

  const isRecent = useCallback((id: string) => recent.includes(id), [recent]);

  return { recent, markViewed, isRecent };
}
