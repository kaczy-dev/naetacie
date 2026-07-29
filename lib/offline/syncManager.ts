/**
 * IndexedDB Offline Queue & Sync Manager for NaEtacie.
 * Enables offline saving of favorites, application status changes, and offline application drafts,
 * automatically syncing them with Firestore / LocalStorage when network connectivity is restored.
 */

export interface OfflineAction {
  id: string;
  type: 'TOGGLE_FAVORITE' | 'SET_STATUS' | 'SAVE_NOTE';
  payload: Record<string, unknown>;
  timestamp: number;
}

const DB_NAME = 'naetacie_offline_db';
const STORE_ACTIONS = 'offline_actions';
const STORE_MAP_CACHE = 'map_tiles_cache';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ACTIONS)) {
        db.createObjectStore(STORE_ACTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MAP_CACHE)) {
        db.createObjectStore(STORE_MAP_CACHE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueues an offline action into IndexedDB.
 */
export async function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ACTIONS, 'readwrite');
    const store = tx.objectStore(STORE_ACTIONS);
    const item: OfflineAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    store.add(item);
    await new Promise((res) => { tx.oncomplete = res; });
  } catch (err) {
    console.warn('Failed to enqueue offline action:', err);
  }
}

/**
 * Retrieves all pending offline actions from IndexedDB.
 */
export async function getPendingOfflineActions(): Promise<OfflineAction[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ACTIONS, 'readonly');
    const store = tx.objectStore(STORE_ACTIONS);
    const req = store.getAll();
    return await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Clears synced offline actions from IndexedDB.
 */
export async function clearOfflineActions(ids: string[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ACTIONS, 'readwrite');
    const store = tx.objectStore(STORE_ACTIONS);
    for (const id of ids) {
      store.delete(id);
    }
    await new Promise((res) => { tx.oncomplete = res; });
  } catch (err) {
    console.warn('Failed to clear offline actions:', err);
  }
}

/**
 * Caches map geodata or tiles in IndexedDB.
 */
export async function cacheMapGeodata(key: string, data: unknown): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MAP_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_MAP_CACHE);
    store.put({ key, data, cachedAt: Date.now() });
  } catch {
    /* ignore cache write failure */
  }
}

/**
 * Gets cached map geodata from IndexedDB.
 */
export async function getCachedMapGeodata<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MAP_CACHE, 'readonly');
    const store = tx.objectStore(STORE_MAP_CACHE);
    const req = store.get(key);
    const res = await new Promise<{ key: string; data: T } | undefined>((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
    return res ? res.data : null;
  } catch {
    return null;
  }
}
