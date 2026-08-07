import { useState, useEffect, useCallback } from 'react';

const NOTES_STORAGE_KEY = 'naetacie_user_notes';

export function useUserNotes() {
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) {
        setNotes(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load user notes:', e);
    }
  }, []);

  const saveNote = useCallback((adId: string, noteText: string) => {
    setNotes((prev) => {
      const next = { ...prev };
      if (noteText.trim()) {
        next[adId] = noteText.trim();
      } else {
        delete next[adId];
      }
      try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save user note:', e);
      }
      return next;
    });
  }, []);

  const getNote = useCallback((adId: string): string => {
    return notes[adId] || '';
  }, [notes]);

  return { notes, saveNote, getNote };
}
