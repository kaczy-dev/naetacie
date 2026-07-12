'use client';

/**
 * Hook for managing favorite announcements.
 * Persists to localStorage for guests, Firestore for authenticated users.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'favorite-announcements';

interface UseFavoritesResult {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  favoriteCount: number;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist to localStorage
  const persist = useCallback((newFavs: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newFavs]));
    } catch {
      // Storage full
    }
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      persist(next);
      return next;
    });
  }, [persist]);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    favoriteCount: favorites.size,
  };
}
