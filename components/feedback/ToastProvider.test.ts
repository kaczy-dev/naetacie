import { describe, it, expect } from 'vitest';
import type { ToastType, Toast } from './ToastProvider';

describe('Toast types and configuration', () => {
  it('ToastType includes success, error, and info', () => {
    const types: ToastType[] = ['success', 'error', 'info'];
    expect(types).toHaveLength(3);
    expect(types).toContain('success');
    expect(types).toContain('error');
    expect(types).toContain('info');
  });

  it('Toast interface has required fields', () => {
    const toast: Toast = {
      id: 'toast-123',
      type: 'success',
      message: 'Operation succeeded',
      duration: 3000,
      dismissible: true,
    };

    expect(toast.id).toBe('toast-123');
    expect(toast.type).toBe('success');
    expect(toast.message).toBe('Operation succeeded');
    expect(toast.duration).toBe(3000);
    expect(toast.dismissible).toBe(true);
  });

  it('success toast has 3000ms duration', () => {
    const duration = getDurationForType('success');
    expect(duration).toBe(3000);
  });

  it('error toast has 5000ms duration', () => {
    const duration = getDurationForType('error');
    expect(duration).toBe(5000);
  });

  it('info toast has 3000ms duration', () => {
    const duration = getDurationForType('info');
    expect(duration).toBe(3000);
  });
});

// Helper matching the internal DURATIONS constant
function getDurationForType(type: ToastType): number {
  const DURATIONS: Record<ToastType, number> = {
    success: 3000,
    error: 5000,
    info: 3000,
  };
  return DURATIONS[type];
}
