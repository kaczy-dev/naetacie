'use client';

/**
 * Push notification registration and management hook.
 * Uses the browser Notification API and Service Worker for push.
 */

import { useState, useEffect, useCallback } from 'react';

type PermissionState = 'default' | 'granted' | 'denied';

interface PushNotificationsResult {
  permission: PermissionState;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (title: string, options?: NotificationOptions) => void;
}

export function usePushNotifications(): PushNotificationsResult {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission as PermissionState);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      return result === 'granted';
    } catch {
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return;

      // Use service worker for better reliability
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options,
        });
      } else {
        new Notification(title, options);
      }
    },
    [permission]
  );

  return { permission, isSupported, requestPermission, sendNotification };
}
