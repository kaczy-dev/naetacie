/**
 * Offline-First IndexedDB Storage & Background Dispatch Queue.
 * 
 * Enables seamless offline usage on construction sites with zero network.
 * Stores cached announcements, saved jobs, and queues offline draft messages/inquiries.
 */

export interface QueuedOfflineAction {
  id: string;
  type: 'sms_draft' | 'bookmark_toggle' | 'inquiry_send';
  payload: Record<string, unknown>;
  createdAt: string;
}

const DB_NAME = 'praca_szczecin_offline_db';
const DB_VERSION = 1;
const STORE_ANNOUNCEMENTS = 'announcements_cache';
const STORE_QUEUE = 'action_queue';

/**
 * Initializes and opens the IndexedDB instance safely.
 */
export function openOfflineDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_ANNOUNCEMENTS)) {
          db.createObjectStore(STORE_ANNOUNCEMENTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves announcements to offline cache.
 */
export async function cacheAnnouncementsOffline<T extends { id: string }>(items: T[]): Promise<boolean> {
  const db = await openOfflineDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_ANNOUNCEMENTS], 'readwrite');
      const store = tx.objectStore(STORE_ANNOUNCEMENTS);

      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retrieves all cached announcements from offline storage.
 */
export async function getCachedAnnouncementsOffline<T>(): Promise<T[]> {
  const db = await openOfflineDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_ANNOUNCEMENTS], 'readonly');
      const store = tx.objectStore(STORE_ANNOUNCEMENTS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Queues an action when offline (e.g. sent application).
 */
export async function queueOfflineAction(action: Omit<QueuedOfflineAction, 'id' | 'createdAt'>): Promise<string> {
  const id = `action_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item: QueuedOfflineAction = {
    id,
    ...action,
    createdAt: new Date().toISOString(),
  };

  const db = await openOfflineDatabase();
  if (db) {
    try {
      const tx = db.transaction([STORE_QUEUE], 'readwrite');
      tx.objectStore(STORE_QUEUE).put(item);
    } catch {
      /* non-fatal fallback */
    }
  }

  return id;
}

/**
 * Reads and clears pending offline queued actions upon reconnection.
 */
export async function flushOfflineQueue(): Promise<QueuedOfflineAction[]> {
  const db = await openOfflineDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_QUEUE], 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result as QueuedOfflineAction[];
        store.clear();
        resolve(items);
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}
