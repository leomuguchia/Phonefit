// moments/integration.ts
import { momentEngine } from './momentsEngine';
import { notificationEngine } from './notificationsEngine';
import type { DeviceInfo, DeviceCapabilities, RuntimeSignals } from '../types';

/**
 * Main integration point for moments and notifications
 */
export class MomentNotificationIntegration {
  /**
   * Check for new moments and send notifications
   * Call this periodically (e.g., every hour)
   */
  static async checkAndNotify(
    deviceInfo: DeviceInfo,
    capabilities: DeviceCapabilities,
    runtimeSignals: RuntimeSignals
  ): Promise<{
    moments: any[];
    notificationsSent: number;
  }> {
    const result = await momentEngine.generateAndNotify(
      deviceInfo,
      capabilities,
      runtimeSignals
    );

    // Map the result to match expected type
    return {
      moments: result.moments,
      notificationsSent: result.newNotificationsSent // Map newNotificationsSent to notificationsSent
    };
  }

  /**
   * Get notification count for UI badge
   */
  static async getNotificationCount(): Promise<number> {
    return notificationEngine.getUnreadCount();
  }

  /**
   * Get all notifications
   */
  static async getNotifications() {
    return notificationEngine.getNotifications();
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string) {
    return notificationEngine.markAsRead(notificationId);
  }

  /**
   * Clear all notifications
   */
  static async clearNotifications() {
    return notificationEngine.clearAll();
  }
}