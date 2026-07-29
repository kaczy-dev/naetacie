/**
 * Multi-Channel Notification Manager & In-App Inbox Service.
 * Manages push, e-mail, and SMS notification preferences and stores in-app alerts.
 */

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'job_alert' | 'high_pay' | 'market_update';
  linkUrl?: string;
}

const NOTIFICATIONS_STORAGE_KEY = 'naetacie_notifications_v1';

export function getStoredNotifications(): AppNotification[] {
  if (typeof localStorage === 'undefined') return getInitialMockNotifications();
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return getInitialMockNotifications();
    return JSON.parse(raw);
  } catch {
    return getInitialMockNotifications();
  }
}

export function saveNotifications(items: AppNotification[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function markAllAsRead(): AppNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);
  return updated;
}

export function getInitialMockNotifications(): AppNotification[] {
  return [
    {
      id: 'n1',
      title: '⚡ Nowa oferta ze stawką > 10 000 PLN',
      message: 'Kierownik budowy / Elektryk – Szczecin Gumieńce. Zobacz szczegóły w serwisie Pracuj.pl.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false,
      type: 'high_pay',
      linkUrl: 'https://www.pracuj.pl/praca/szczecin',
    },
    {
      id: 'n2',
      title: '☀️ Znakomite warunki dekarskie w Dąbiu',
      message: 'Dzisiejsza pogoda w Szczecinie (21°C, wiatr 9 km/h) sprzyja pracom na wysokości.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      read: false,
      type: 'market_update',
    },
    {
      id: 'n3',
      title: '👷 Nowe ogłoszenie: Spawacz MIG/MAG',
      message: 'Firma StalKon dodała nową ofertę z zakwaterowaniem gratis w Gryfinie.',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      read: true,
      type: 'job_alert',
    },
  ];
}
