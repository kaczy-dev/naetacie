'use client';

import { ReactNode } from 'react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  /** Optional custom icon to display. Defaults to a search/empty illustration. */
  icon?: ReactNode;
  /** Title heading for the empty state */
  title: string;
  /** Descriptive message explaining why there are no results */
  message: string;
  /** Optional call-to-action button */
  action?: EmptyStateAction;
}

/**
 * Default empty state icon — a magnifying glass with an empty result indicator.
 * Accessible via aria-hidden since the title/message convey the meaning.
 */
function DefaultIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ color: 'var(--color-text-disabled)' }}
    >
      {/* Magnifying glass circle */}
      <circle
        cx="28"
        cy="28"
        r="16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Magnifying glass handle */}
      <line
        x1="40"
        y1="40"
        x2="54"
        y2="54"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Horizontal line in center — represents "no results" */}
      <line
        x1="20"
        y1="28"
        x2="36"
        y2="28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * EmptyState component displayed when an announcement list or map returns zero results.
 * Provides an illustrative icon, descriptive message, and optional suggested action.
 *
 * Validates: Requirements 12.6
 */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div style={styles.container} role="status" aria-label={title}>
      <div style={styles.iconWrapper}>
        {icon ?? <DefaultIcon />}
      </div>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.message}>{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={styles.actionButton}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-12, 48px) var(--spacing-4, 16px)',
    textAlign: 'center',
    gap: 'var(--spacing-3, 12px)',
  },
  iconWrapper: {
    marginBottom: 'var(--spacing-2, 8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-h3, 18px)',
    fontWeight: 'var(--font-weight-semibold, 600)' as unknown as number,
    color: 'var(--color-text-primary)',
    lineHeight: 'var(--line-height, 1.5)',
    margin: 0,
  },
  message: {
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-body-sm, 14px)',
    fontWeight: 'var(--font-weight-normal, 400)' as unknown as number,
    color: 'var(--color-text-secondary)',
    lineHeight: 'var(--line-height, 1.5)',
    margin: 0,
    maxWidth: '320px',
  },
  actionButton: {
    marginTop: 'var(--spacing-2, 8px)',
    padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-body-sm, 14px)',
    fontWeight: 'var(--font-weight-medium, 500)' as unknown as number,
    color: 'var(--color-text-inverse, #ffffff)',
    backgroundColor: 'var(--color-primary, #2563eb)',
    border: 'none',
    borderRadius: 'var(--radius-md, 8px)',
    cursor: 'pointer',
    transition: 'var(--transition-fast, 150ms ease)',
  },
};

export default EmptyState;
