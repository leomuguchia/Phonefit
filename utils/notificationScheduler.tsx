// notifications/notificationScheduler.ts
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { momentEngine } from './momentsEngine';
import type { DeviceInfo, DeviceCapabilities, RuntimeSignals } from '../types';

// Define background task name
const BACKGROUND_TASK_NAME = 'PHONEFIT_MOMENT_CHECK';

// Helper function to schedule daily notifications (works around TypeScript issues)
async function scheduleDailyNotification(
  content: Notifications.NotificationContentInput,
  hour: number,
  minute: number
): Promise<string> {
  // Create a date for the notification
  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(hour, minute, 0, 0);
  
  // If the time has already passed today, schedule for tomorrow
  if (triggerDate <= now) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }
  
  return await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: 'date',
      date: triggerDate,
      repeats: true, // This will repeat the notification daily
    },
  });
}

// Helper function to schedule weekly notifications
async function scheduleWeeklyNotification(
  content: Notifications.NotificationContentInput,
  weekday: number, // 0 = Sunday, 1 = Monday, etc.
  hour: number,
  minute: number
): Promise<string> {
  const now = new Date();
  const targetDate = new Date();
  const currentWeekday = now.getDay();
  
  // Calculate days until target weekday
  let daysUntilTarget = weekday - currentWeekday;
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }
  
  targetDate.setDate(now.getDate() + daysUntilTarget);
  targetDate.setHours(hour, minute, 0, 0);
  
  return await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: 'date',
      date: targetDate,
      repeats: true, // This will repeat weekly
    },
  });
}

class NotificationScheduler {
  private scheduledCheck: NodeJS.Timeout | null = null;
  private isScheduled = false;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private deviceCache: {
    info: DeviceInfo | null;
    caps: DeviceCapabilities | null;
    runtime: RuntimeSignals | null;
  } = {
    info: null,
    caps: null,
    runtime: null,
  };

  constructor() {
    this.initializeNotificationCategories();
  }

  /**
   * Initialize notification categories for interactive notifications
   */
  private async initializeNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('moment_actions', [
        {
          identifier: 'view_moment',
          buttonTitle: 'View Details',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            isDestructive: true,
          },
        },
      ]);
    } catch (error) {
      console.warn('Failed to set notification categories:', error);
    }
  }

  /**
   * Initialize background task (if supported)
   */
  async initializeBackgroundTask(): Promise<boolean> {
    try {
      // Register background task
      if (TaskManager.isTaskDefined(BACKGROUND_TASK_NAME)) {
        console.log('Background task already defined');
      } else {
        TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
          await this.checkForMomentsInBackground();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        });
      }

      // Set up notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Listen for notification responses
      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        response => {
          this.handleNotificationResponse(response);
        }
      );

      // Listen for incoming notifications
      this.notificationListener = Notifications.addNotificationReceivedListener(
        notification => {
          console.log('Notification received:', notification.request.content);
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to initialize background task:', error);
      return false;
    }
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    this.stopPeriodicChecks();
  }

  /**
   * Start periodic moment checks
   */
  async startPeriodicChecks(
    deviceInfo: DeviceInfo,
    capabilities: DeviceCapabilities,
    runtime: RuntimeSignals
  ): Promise<void> {
    // Cache device data for background checks
    this.deviceCache = { info: deviceInfo, caps: capabilities, runtime };

    // Clear any existing schedule
    if (this.scheduledCheck) {
      clearInterval(this.scheduledCheck);
    }

    // Schedule periodic checks (every 2 hours when app is open)
    this.scheduledCheck = setInterval(async () => {
      await this.checkForNewMoments(deviceInfo, capabilities, runtime);
    }, 2 * 60 * 60 * 1000); // 2 hours

    this.isScheduled = true;

    // Also try to schedule background fetch
    await this.scheduleBackgroundFetch();
  }

  /**
   * Schedule background fetch if available
   */
  private async scheduleBackgroundFetch(): Promise<void> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      const isAvailable = status !== BackgroundFetch.BackgroundFetchStatus.Restricted;
      
      if (isAvailable) {
        // Unregister first to avoid duplicates
        try {
          await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
        } catch (error) {
          // Ignore if not registered
        }

        // Register with appropriate interval
        const minimumInterval = Platform.OS === 'ios' 
          ? 4 * 60 * 60 // 4 hours for iOS
          : 6 * 60 * 60; // 6 hours for Android

        await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
          minimumInterval,
          stopOnTerminate: false,
          startOnBoot: true,
        });

        console.log('Background fetch scheduled with interval:', minimumInterval, 'seconds');
      } else {
        console.warn('Background fetch not available on this device');
      }
    } catch (error) {
      console.warn('Background fetch scheduling failed:', error);
    }
  }

  /**
   * Stop all scheduled checks
   */
  stopPeriodicChecks(): void {
    if (this.scheduledCheck) {
      clearInterval(this.scheduledCheck);
      this.scheduledCheck = null;
    }
    this.isScheduled = false;
  }

  /**
   * Manual check for new moments
   */
  async checkForNewMoments(
    deviceInfo: DeviceInfo,
    capabilities: DeviceCapabilities,
    runtime: RuntimeSignals
  ): Promise<{ moments: any[]; notificationsSent: number }> {
    const result = await momentEngine.generateAndNotify(
      deviceInfo,
      capabilities,
      runtime
    );

    // Update cache
    this.deviceCache = { info: deviceInfo, caps: capabilities, runtime };

    return {
      moments: result.moments,
      notificationsSent: result.newNotificationsSent
    };
  }

  /**
   * Background task handler (called by OS in background)
   */
  private async checkForMomentsInBackground(): Promise<BackgroundFetch.BackgroundFetchResult> {
    try {
      console.log('Background moment check running...');
      
      // Load cached device data
      const cachedData = await this.loadCachedDeviceData();
      if (!cachedData.info || !cachedData.caps || !cachedData.runtime) {
        console.log('No cached device data available for background check');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Check for moments
      const result = await momentEngine.generateAndNotify(
        cachedData.info,
        cachedData.caps,
        cachedData.runtime
      );

      console.log(`Background check complete: ${result.newNotificationsSent} notifications sent`);
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background check failed:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  }

  /**
   * Load device data from cache for background tasks
   */
  private async loadCachedDeviceData(): Promise<{
    info: DeviceInfo | null;
    caps: DeviceCapabilities | null;
    runtime: RuntimeSignals | null;
  }> {
    try {
      const cachedData = await AsyncStorage.getItem('@phonefit_device_cache');
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.error('Failed to load cached device data:', error);
    }

    return { info: null, caps: null, runtime: null };
  }

  /**
   * Save device data to cache for background tasks
   */
  async cacheDeviceData(
    deviceInfo: DeviceInfo,
    capabilities: DeviceCapabilities,
    runtime: RuntimeSignals
  ): Promise<void> {
    try {
      const cacheData = {
        info: deviceInfo,
        caps: capabilities,
        runtime: {
          ...runtime,
          timestamp: Date.now(),
        },
      };

      await AsyncStorage.setItem(
        '@phonefit_device_cache',
        JSON.stringify(cacheData)
      );

      // Update memory cache
      this.deviceCache = cacheData;
    } catch (error) {
      console.error('Failed to cache device data:', error);
    }
  }

  /**
   * Schedule time-based notifications (e.g., morning commute reminder)
   */
  async scheduleTimeBasedNotifications(): Promise<void> {
    try {
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      // Clear existing scheduled notifications first
      await this.cancelAllScheduledNotifications();

      // Schedule morning commute reminder (8:30 AM daily)
      await scheduleDailyNotification(
        {
          title: '🚇 Ready for your commute?',
          body: 'Your phone is optimized for streaming, podcasts, or navigation.',
          sound: true,
          data: {
            type: 'scheduled_moment',
            momentType: 'morning_commute',
          },
        },
        8, // hour
        30 // minute
      );

      // Schedule evening entertainment reminder (7:00 PM daily)
      await scheduleDailyNotification(
        {
          title: '🎬 Entertainment night',
          body: 'Perfect time for movie streaming or gaming sessions.',
          sound: true,
          data: {
            type: 'scheduled_moment',
            momentType: 'evening_entertainment',
          },
        },
        19, // hour (7 PM)
        0   // minute
      );

      // Schedule weekend gaming reminder (2:00 PM on Saturday)
      if (dayOfWeek <= 5) { // Only schedule if it's not already weekend
        const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
        const saturday = new Date();
        saturday.setDate(saturday.getDate() + daysUntilSaturday);
        saturday.setHours(14, 0, 0, 0);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎮 Weekend gaming session',
            body: 'Perfect time for longer gaming sessions!',
            sound: true,
            data: {
              type: 'scheduled_moment',
              momentType: 'weekend_gaming',
            },
          },
          trigger: {
            type: 'date',
            date: saturday,
            repeats: false,
          },
        });
      }

      // Schedule storage cleanup reminder (10:00 AM on Sunday)
      await scheduleWeeklyNotification(
        {
          title: '🧹 Weekly cleanup reminder',
          body: 'Good time to clear cache and organize files.',
          sound: true,
          data: {
            type: 'scheduled_moment',
            momentType: 'storage_cleanup',
          },
        },
        0, // Sunday (0 = Sunday)
        10, // hour (10 AM)
        0   // minute
      );

      // Schedule "Quiet hours" reminder (10:00 PM daily)
      await scheduleDailyNotification(
        {
          title: '🌙 Quiet hours reminder',
          body: 'Great time for system updates or large downloads.',
          sound: true,
          data: {
            type: 'scheduled_moment',
            momentType: 'quiet_hours',
          },
        },
        22, // hour (10 PM)
        0   // minute
      );

      console.log('Time-based notifications scheduled successfully');
    } catch (error) {
      console.error('Failed to schedule time-based notifications:', error);
    }
  }

  /**
   * Handle notification response (when user taps notification)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as any;

    console.log('Notification response:', {
      actionIdentifier,
      data,
    });

    // Handle different actions
    switch (actionIdentifier) {
      case 'view_moment':
        // Navigate to moments screen
        if (data.momentId) {
          // Use your navigation system here
          console.log('Navigating to moment:', data.momentId);
        }
        break;
        
      case 'dismiss':
        // Notification was dismissed
        console.log('Notification dismissed');
        break;
        
      default:
        // User tapped the notification body
        if (data.type === 'moment' || data.type === 'scheduled_moment') {
          // Navigate to moments screen
          console.log('Opening moments screen');
        }
        break;
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel scheduled notifications:', error);
    }
  }

  /**
   * Schedule a single test notification
   */
  async scheduleTestNotification(): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📱 PhoneFit Test',
          body: 'This is a test notification from PhoneFit!',
          sound: true,
          data: {
            type: 'test',
            timestamp: Date.now(),
          },
        },
        trigger: {
          seconds: 5, // Show in 5 seconds
        },
      });
      
      console.log('Test notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule test notification:', error);
      return null;
    }
  }

  /**
   * Check if background tasks are available
   */
  isBackgroundAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Get background task status
   */
  async getBackgroundTaskStatus(): Promise<BackgroundFetch.BackgroundFetchStatus> {
    try {
      return await BackgroundFetch.getStatusAsync();
    } catch (error) {
      console.error('Failed to get background task status:', error);
      return BackgroundFetch.BackgroundFetchStatus.Restricted;
    }
  }

  /**
   * Manual method to schedule a notification with a specific date
   */
  async scheduleNotificationAtDate(
    content: Notifications.NotificationContentInput,
    date: Date,
    repeats: boolean = false
  ): Promise<string> {
    try {
      return await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: 'date',
          date,
          repeats,
        },
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }
}

export const notificationScheduler = new NotificationScheduler();