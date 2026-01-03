// notifications/notificationEngine.ts
import type { PhoneMoment } from '../moments/types';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface MomentNotification {
  id: string;
  momentId: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  category?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

class NotificationEngine {
  private static readonly STORAGE_KEY = '@phonefit_notifications';
  private static readonly MOMENT_HISTORY_KEY = '@phonefit_moment_history';
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    console.log('[NotificationEngine] Initializing...');
    
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('[NotificationEngine] Permission status:', status);

    if (status !== 'granted') {
      console.warn('[NotificationEngine] Notification permissions not granted');
      return;
    }

    // Configure notification handling
    Notifications.setNotificationHandler({
      handleNotification: async () => ({}),
    });

    this.isInitialized = true;
    console.log('[NotificationEngine] Initialization complete');
  }

  /**
   * Send a notification for a new moment
   */
  async sendMomentNotification(moment: PhoneMoment): Promise<boolean> {
    console.log('[NotificationEngine] Sending notification for moment:', moment.id);

    if (!this.isInitialized) {
      await this.initialize();
    }

    const hasRecentNotification = await this.hasRecentMomentNotification(moment.id);
    console.log(`[NotificationEngine] Has recent notification for ${moment.id}?`, hasRecentNotification);

    if (hasRecentNotification) {
      console.log(`[NotificationEngine] Skipping notification for ${moment.id} due to cooldown`);
      return false;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📱 ${moment.title}`,
          body: moment.description,
          data: {
            momentId: moment.id,
            category: moment.category,
            action: 'view_moment',
            url: moment.suggestion ? `suggestion:${moment.suggestion}` : undefined,
          },
          sound: true,
          badge: 1,
        },
        trigger: null, // immediate
      });

      console.log('[NotificationEngine] Scheduled notification with ID:', notificationId);

      await this.saveNotification({
        id: notificationId,
        momentId: moment.id,
        title: moment.title,
        body: moment.description,
        timestamp: Date.now(),
        read: false,
        category: moment.category,
        actionUrl: moment.suggestion,
        metadata: {
          priority: moment.priority,
          expiresAt: moment.expiresAt,
          emoji: moment.emoji,
        }
      });

      console.log('[NotificationEngine] Notification saved locally for', moment.id);

      await this.recordMomentSeen(moment.id);
      console.log('[NotificationEngine] Moment recorded as seen:', moment.id);

      return true;
    } catch (error) {
      console.error('[NotificationEngine] Failed to send notification for', moment.id, error);
      return false;
    }
  }

  private async hasRecentMomentNotification(momentId: string): Promise<boolean> {
    try {
      const historyJson = await AsyncStorage.getItem(this.MOMENT_HISTORY_KEY);
      if (!historyJson) return false;

      const history: Record<string, number> = JSON.parse(historyJson);
      const lastSeen = history[momentId];
      
      if (lastSeen && Date.now() - lastSeen < 4 * 60 * 60 * 1000) {
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[NotificationEngine] Error reading recent notifications:', err);
      return false;
    }
  }

  private async recordMomentSeen(momentId: string): Promise<void> {
    try {
      const historyJson = await AsyncStorage.getItem(this.MOMENT_HISTORY_KEY);
      const history: Record<string, number> = historyJson ? JSON.parse(historyJson) : {};
      history[momentId] = Date.now();

      const entries = Object.entries(history);
      const trimmedHistory = entries.length > 100 
        ? Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, 100))
        : history;

      await AsyncStorage.setItem(this.MOMENT_HISTORY_KEY, JSON.stringify(trimmedHistory));
      console.log('[NotificationEngine] Moment history updated:', momentId);
    } catch (error) {
      console.error('[NotificationEngine] Failed to record moment seen:', error);
    }
  }

  private async saveNotification(notification: MomentNotification): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      notifications.unshift(notification);
      const trimmed = notifications.slice(0, 50);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
      console.log('[NotificationEngine] Notification saved to storage:', notification.momentId);
    } catch (error) {
      console.error('[NotificationEngine] Failed to save notification:', error);
    }
  }

  async getNotifications(): Promise<MomentNotification[]> {
    try {
      const notificationsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      return notificationsJson ? JSON.parse(notificationsJson) : [];
    } catch (error) {
      console.error('[NotificationEngine] Failed to read notifications:', error);
      return [];
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      const updated = notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      console.log('[NotificationEngine] Marked as read:', notificationId);
    } catch (error) {
      console.error('[NotificationEngine] Failed to mark notification as read:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
      console.log('[NotificationEngine] Cleared all notifications');
    } catch (error) {
      console.error('[NotificationEngine] Failed to clear notifications:', error);
    }
  }

  async getUnreadCount(): Promise<number> {
    const notifications = await this.getNotifications();
    return notifications.filter(n => !n.read).length;
  }
}

export const notificationEngine = new NotificationEngine();
