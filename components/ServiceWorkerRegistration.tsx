'use client';

import { useEffect } from 'react';

/**
 * Instead of registering a SW, this component UNREGISTERS any existing one.
 * This fixes the issue where a stale SW was intercepting map tile requests
 * and Firestore connections, causing black maps and connection errors.
 *
 * Once the old SW is gone, tile requests go directly to the network.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Unregister ALL service workers for this origin
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().then(() => {
            console.log('[SW] Unregistered stale service worker');
          });
        }
      });
    }
  }, []);

  return null;
}
