'use client';

import { useCallback } from 'react';

export interface SearchAreaButtonProps {
  visible?: boolean;
  onClick: () => void;
  ui?: { surface: string; border: string; text: string; shadow: string };
  top?: string | number;
}

/**
 * "Szukaj w tym obszarze" button that appears after the user pans or zooms the map.
 * Triggers area filtering callback when clicked.
 */
export function SearchAreaButton({
  visible = true,
  onClick,
  ui = {
    surface: '#ffffff',
    border: '#e5e7eb',
    text: '#1f2937',
    shadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  top = '88px',
}: SearchAreaButtonProps) {
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  if (!visible) return null;

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: typeof top === 'number' ? `${top}px` : top,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 15,
        padding: '8px 18px',
        background: ui.surface,
        border: `1.5px solid ${ui.border}`,
        borderRadius: '20px',
        boxShadow: ui.shadow,
        fontSize: '13px',
        fontWeight: 600,
        color: ui.text,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) scale(0.95)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%)';
      }}
    >
      🔍 Szukaj w tym obszarze
    </button>
  );
}

