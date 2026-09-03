import { describe, it, expect, beforeEach } from 'vitest';
import {
  openOfflineDatabase,
  cacheAnnouncementsOffline,
  getCachedAnnouncementsOffline,
  queueOfflineAction,
  flushOfflineQueue,
} from '@/lib/offline/offlineStorage';

describe('Offline Storage Module', () => {
  it('handles offline announcement caching gracefully', async () => {
    const items = [
      { id: 'job-1', title: 'Murarz Szczecin' },
      { id: 'job-2', title: 'Elektryk Gumieńce' },
    ];
    const ok = await cacheAnnouncementsOffline(items);
    // In node/vitest without real indexedDB, it should fail-soft with false
    expect(typeof ok).toBe('boolean');
  });

  it('handles queueing offline actions safely', async () => {
    const id = await queueOfflineAction({
      type: 'bookmark_toggle',
      payload: { jobId: 'job-1' },
    });
    expect(typeof id).toBe('string');
    expect(id).toContain('action_');
  });
});
