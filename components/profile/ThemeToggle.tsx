'use client';

/**
 * Theme toggle component for the profile/settings area.
 * Allows switching between light, dark, and system modes.
 * Connects to ThemeProvider's setMode for persistence.
 *
 * Validates: Requirement 13.5
 */

import { useTheme, type ThemeMode } from '@/components/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useTheme();

  return (
    <div style={containerStyle}>
      <div style={labelRowStyle}>
        <span style={labelStyle}>Appearance</span>
        <span style={currentModeStyle}>
          {mode === 'system'
            ? `System (${resolvedTheme})`
            : mode.charAt(0).toUpperCase() + mode.slice(1)}
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
