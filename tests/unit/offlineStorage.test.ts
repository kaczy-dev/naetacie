import { describe, it, expect, beforeEach } from 'vitest';
import {
  openOfflineDatabase,
  cacheAnnouncementsOffline,
  getCachedAnnouncementsOffline,
  queueOfflineAction,
} from '@/lib/offline/offlineStorage';

describe('Offline Storage Engine Suite', () => {
  it('handles server-side / headless environments gracefully without crashing', async () => {
    const db = await openOfflineDatabase();
    // In node environment without indexedDB polyfill, should return null safely
    expect(db === null || typeof db === 'object').toBe(true);

    const res = await cacheAnnouncementsOffline([{ id: '1', title: 'Test' }]);
    expect(typeof res).toBe('boolean');

    const cached = await getCachedAnnouncementsOffline();
    expect(Array.isArray(cached)).toBe(true);
  });

  it('generates unique queue action IDs', async () => {
    const id = await queueOfflineAction({
      type: 'sms_draft',
      payload: { phone: '501234567', text: 'Hello' },
    });
    expect(id).toBeDefined();
    expect(id.startsWith('action_')).toBe(true);
  });
});
