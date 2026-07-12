'use client';

/**
 * Global keyboard shortcuts for power users:
 * - "/"      → focus the search input
 * - "Escape" → blur/clear active input, close panels
 * - "m/l/p"  → jump to Map / List / Profile tabs (when not typing)
 *
 * Ignores shortcuts while the user is typing in an input/textarea.
 */

import { useEffect } from 'react';

interface ShortcutHandlers {
  onFocusSearch?: () => void;
  onEscape?: () => void;
  onTab?: (tab: 'map' | 'list' | 'profile') => void;
}

function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape works even while typing (to blur)
      if (e.key === 'Escape') {
        handlers.onEscape?.();
        (document.activeElement as HTMLElement)?.blur?.();
        return;
      }

      if (isTyping()) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          handlers.onFocusSearch?.();
          break;
        case 'm':
          handlers.onTab?.('map');
          break;
        case 'l':
          handlers.onTab?.('list');
          break;
        case 'p':
          handlers.onTab?.('profile');
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
