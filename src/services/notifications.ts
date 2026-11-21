import type { ReminderSettings } from '../types/finance';
import { getTodayISO } from '../utils/format';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const result = await Notification.requestPermission();
  return result;
}

export async function showHouseholdNotification(title: string, body: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'kas-rumah-daily-reminder',
        });
        return true;
      }
    }
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: 'kas-rumah-daily-reminder',
    });
    return true;
  } catch {
    return false;
  }
}

export function shouldTriggerDailyReminder(settings: ReminderSettings): boolean {
  if (!settings.enabled) return false;
  const todayISO = getTodayISO();
  if (settings.lastNotifiedDate === todayISO) return false;

  const [targetHour, targetMin] = settings.time.split(':').map(Number);
  if (Number.isNaN(targetHour) || Number.isNaN(targetMin)) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetHour * 60 + targetMin;

  // Trigger if we are at or past the reminder time today
  return currentMinutes >= targetMinutes;
}
