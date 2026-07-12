'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  dismissible: boolean;
}

export interface ToastContextValue {
  show: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ─── ID Generator ─────────────────────────────────────────────────────────────

let toastCounter = 0;

function generateId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  pointerEvents: 'none',
  width: '100%',
  maxWidth: 420,
  padding: '0 16px',
  boxSizing: 'border-box',
};

const toastBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  width: '100%',
  pointerEvents: 'auto',
  fontSize: 14,
  lineHeight: 1.5,
  fontFamily: 'system-ui, sans-serif',
};

const typeStyles: Record<ToastType, React.CSSProperties> = {
  success: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
  },
  error: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
  },
  info: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
};

const dismissButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: 4,
  fontSize: 18,
  lineHeight: 1,
  opacity: 0.8,
  flexShrink: 0,
};

// ─── Keyframe styles (injected once) ─────────────────────────────────────────

const KEYFRAMES_ID = 'toast-keyframes';

const keyframesCSS = `
@keyframes toast-slide-in {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  60% {
    transform: translateY(8px);
    opacity: 1;
  }
  80% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes toast-fade-out {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes toast-slide-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  @keyframes toast-fade-out {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
}
`;

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = keyframesCSS;
  document.head.appendChild(style);
}

// ─── Toast Item Component ─────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  exiting: boolean;
}

function ToastItem({ toast, onDismiss, exiting }: ToastItemProps) {
  const animationStyle: React.CSSProperties = {
    animation: exiting
      ? 'toast-fade-out 200ms ease-out forwards'
      : 'toast-slide-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        ...toastBaseStyle,
        ...typeStyles[toast.type],
        ...animationStyle,
      }}
    >
      <span style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</span>
      {toast.dismissible && (
        <button
          onClick={() => onDismiss(toast.id)}
          style={dismissButtonStyle}
          aria-label="Dismiss notification"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Inject keyframes on mount
  useEffect(() => {
    injectKeyframes();
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    // Start exit animation
    setExitingIds((prev) => new Set(prev).add(id));

    // Remove from DOM after fade-out animation (200ms)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);

    // Clear any existing auto-dismiss timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = generateId();
      const duration = DURATIONS[type];
      const dismissible = true; // All toasts can be manually dismissed

      const newToast: Toast = { id, type, message, duration, dismissible };
      setToasts((prev) => [...prev, newToast]);

      // Set auto-dismiss timer
      const timer = setTimeout(() => {
        dismiss(id);
        timersRef.current.delete(id);
      }, duration);

      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={containerStyle} aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismiss}
            exiting={exitingIds.has(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
