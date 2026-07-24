'use client';

/**
 * Theme toggle component for the profile/settings area.
 * Allows switching between light, dark, and system modes.
 * Connects to ThemeProvider's setMode for persistence.
 *
 * Validates: Requirement 13.5
 */

import { useState } from 'react';
import { useTheme, type ThemeMode } from '@/components/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useTheme();
  const [fontScale, setFontScale] = useState<'normal' | 'large' | 'huge'>(() => {
    if (typeof window === 'undefined') return 'normal';
    try {
      return (localStorage.getItem('naetacie_font_scale') as 'normal' | 'large' | 'huge') || 'normal';
    } catch {
      return 'normal';
    }
  });

  const handleFontChange = (scale: 'normal' | 'large' | 'huge') => {
    setFontScale(scale);
    try {
      localStorage.setItem('naetacie_font_scale', scale);
      if (scale === 'normal') document.documentElement.style.fontSize = '100%';
      if (scale === 'large') document.documentElement.style.fontSize = '112.5%';
      if (scale === 'huge') document.documentElement.style.fontSize = '125%';
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={containerStyle}>
      <div style={labelRowStyle}>
        <span style={labelStyle}>Motyw wyglądu</span>
        <span style={currentModeStyle}>
          {mode === 'system'
            ? `Systemowy (${resolvedTheme})`
            : mode === 'dark' ? 'Ciemny' : 'Jasny'}
        </span>
      </div>
      <div style={toggleGroupStyle} role="radiogroup" aria-label="Theme mode">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={mode === option.value}
            aria-label={`${option.label} mode`}
            onClick={() => setMode(option.value)}
            style={{
              ...toggleButtonStyle,
              ...(mode === option.value ? toggleButtonActiveStyle : {}),
            }}
          >
            <span style={toggleIconStyle}>{option.icon}</span>
            <span style={toggleLabelStyle}>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Font Scaling Accessibility Section */}
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
        <div style={labelRowStyle}>
          <span style={labelStyle}>Rozmiar tekstu (Dostępność)</span>
          <span style={currentModeStyle}>{fontScale === 'normal' ? 'Standardowy' : fontScale === 'large' ? 'Powiększony (A+)' : 'B. Duży (A++)'}</span>
        </div>
        <div style={toggleGroupStyle}>
          {[
            { id: 'normal', label: 'Standard (A)', size: '13px' },
            { id: 'large', label: 'Duży (A+)', size: '15px' },
            { id: 'huge', label: 'B. Duży (A++)', size: '17px' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleFontChange(item.id as 'normal' | 'large' | 'huge')}
              style={{
                ...toggleButtonStyle,
                ...(fontScale === item.id ? toggleButtonActiveStyle : {}),
              }}
            >
              <span style={{ fontSize: item.size, fontWeight: 700 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Styles using design system CSS custom properties ---

const containerStyle: React.CSSProperties = {
  padding: 'var(--spacing-4)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
};

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 'var(--spacing-3)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-body)',
  fontWeight: 'var(--font-weight-semibold)' as unknown as number,
  color: 'var(--color-text-primary)',
};

const currentModeStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-body-sm)',
  color: 'var(--color-text-secondary)',
};

const toggleGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--spacing-2)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface-raised)',
  padding: 'var(--spacing-1)',
};

const toggleButtonStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  padding: 'var(--spacing-2) var(--spacing-3)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  transition: 'background-color var(--transition-fast), box-shadow var(--transition-fast)',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family)',
};

const toggleButtonActiveStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  boxShadow: 'var(--shadow-sm)',
  color: 'var(--color-primary)',
};

const toggleIconStyle: React.CSSProperties = {
  fontSize: '20px',
  lineHeight: 1,
};

const toggleLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-caption)',
  fontWeight: 'var(--font-weight-medium)' as unknown as number,
};
