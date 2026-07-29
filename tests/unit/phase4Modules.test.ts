import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStoredNotifications, markAllAsRead, saveNotifications } from '@/lib/notifications/notificationCenter';
import { sendMagicLink } from '@/lib/auth/passwordless';

const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  key: () => null,
  length: 0,
};

describe('Phase 4: Auth, User Profile & Notification Center', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Passwordless Magic Link Auth', () => {
    it('returns authentication_failed when Firebase auth is not initialized or invalid', async () => {
      const res = await sendMagicLink('test@example.com');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBeDefined();
      }
    });
  });

  describe('Notification Center & Multi-Channel Inbox', () => {
    it('returns initial mock notifications and marks all as read', () => {
      const initial = getStoredNotifications();
      expect(initial.length).toBeGreaterThan(0);
      expect(initial.some((n) => !n.read)).toBe(true);

      const readAll = markAllAsRead();
      expect(readAll.every((n) => n.read)).toBe(true);
    });

    it('persists notifications to localStorage', () => {
      const testItem = [
        {
          id: 't1',
          title: 'Test Notification',
          message: 'Test message',
          timestamp: new Date().toISOString(),
          read: false,
          type: 'job_alert' as const,
        },
      ];

      saveNotifications(testItem);
      const retrieved = getStoredNotifications();
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].title).toBe('Test Notification');
    });
  });
});
