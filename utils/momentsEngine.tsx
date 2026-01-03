import type { DeviceInfo, DeviceCapabilities, RuntimeSignals } from '../types';
import type { PhoneMoment } from '../types';
import { notificationEngine } from './notificationsEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

type SeenMomentsMap = Record<string, number>;

const STORAGE_KEYS = {
  notified: '@moment_notification_history',
  seen: '@moment_seen_history',
  stepStats: '@moment_step_stats',
};

export class MomentEngine {
  private lastGeneratedMoments: PhoneMoment[] = [];
  private lastGenerationTime = 0;
  private lastStepsCheck = 0;
  private lastStepsCount = 0;
  private stepHistory: {timestamp: number, steps: number}[] = [];
  
  private readonly GENERATION_INTERVAL = 30 * 60 * 1000; // 30 min
  private readonly NOTIFICATION_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hrs
  private readonly STEPS_CHECK_INTERVAL = 15 * 60 * 1000; // 15 min
  private readonly STEP_GOAL = 5000; // Daily step goal threshold
  
  private notifiedMoments: Record<string, number> = {};
  private seenMoments: SeenMomentsMap = {};
  private stepStats = {
    lastActiveHour: -1,
    consecutiveInactiveHours: 0,
    bestTimeForWalking: -1,
    stepsPerHour: new Array(24).fill(0),
    lastLoadTime: 0,
  };

  /* =======================
     PUBLIC ENTRY
  ======================= */

  async generateAndNotify(
    info: DeviceInfo,
    caps: DeviceCapabilities,
    runtime: RuntimeSignals
  ): Promise<{ moments: PhoneMoment[]; newNotificationsSent: number }> {
    const now = Date.now();

    if (now - this.lastGenerationTime < this.GENERATION_INTERVAL) {
      return { moments: this.lastGeneratedMoments, newNotificationsSent: 0 };
    }

    await this.loadPersistence();

    const rawMoments = this.generateMoments(info, caps, runtime);
    const resolvedMoments = this.resolveConflicts(rawMoments);

    this.lastGeneratedMoments = resolvedMoments;
    this.lastGenerationTime = now;

    let notificationsSent = 0;

    for (const moment of resolvedMoments) {
      if (!this.isNotificationCandidate(moment, now)) continue;

      const sent = await notificationEngine.sendMomentNotification(moment);
      if (sent) {
        notificationsSent++;
        await this.recordNotification(moment.id);
      }
    }

    await this.recordSeen(resolvedMoments.map(m => m.id));
    await this.saveStepStats();

    return { moments: resolvedMoments, newNotificationsSent: notificationsSent };
  }

  getRecentMoments(): PhoneMoment[] {
    return this.lastGeneratedMoments;
  }

  clearCache(): void {
    this.lastGeneratedMoments = [];
    this.lastGenerationTime = 0;
    this.notifiedMoments = {};
    this.seenMoments = {};
    this.stepStats = {
      lastActiveHour: -1,
      consecutiveInactiveHours: 0,
      bestTimeForWalking: -1,
      stepsPerHour: new Array(24).fill(0),
      lastLoadTime: Date.now(),
    };
  }

  /* =======================
     MOMENT GENERATION
  ======================= */

  private generateMoments(
    info: DeviceInfo,
    caps: DeviceCapabilities,
    runtime: RuntimeSignals
  ): PhoneMoment[] {
    const now = Date.now();
    const endOfDay = new Date().setHours(23, 59, 59, 999);
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;

    const moments: PhoneMoment[] = [];

    // Get steps from runtime if available
    let currentSteps = 0;
    if (caps.sensors) {
      const pedometer = caps.sensors.find(s => 
        s.name.toLowerCase().includes('pedometer') || 
        s.name.toLowerCase().includes('step')
      );
      if (this.shouldCheckSteps(now)) {
        currentSteps = this.simulateStepCount(hour, isWeekend);
        this.updateStepStats(currentSteps, hour);
      }
    }

    // Generate step moments
    const stepMoments = this.generateStepMoments(currentSteps, hour, day, isWeekend, caps);
    moments.push(...stepMoments);

    /* 🌅 Morning: full battery - ADDED STEP CONTEXT */
    if (hour >= 6 && hour <= 11 && runtime.batteryLevel >= 0.9) {
      moments.push({
        id: 'morning-charge-ready',
        emoji: '☀️',
        title: 'Phone fully charged',
        description: currentSteps < 100 
          ? 'Perfect for tracking your morning walk!' 
          : 'Start your day without worrying about battery.',
        priority: 3,
        expiresAt: endOfDay,
        category: 'morning',
        notifyEligible: false,
      });
    }

    /* 🚇 Commute: smooth experience - ADDED STEP CONTEXT */
    if (hour >= 7 && hour <= 10 && caps.performance.tier >= 4) {
      moments.push({
        id: 'commute-ready',
        emoji: '🚇',
        title: 'Commute-ready phone',
        description: currentSteps > 1000 
          ? 'Great job walking to the station! Your phone is ready for the ride.' 
          : 'Smooth navigation, streaming, and music for your trip.',
        priority: 4,
        expiresAt: now + 2 * 60 * 60 * 1000,
        category: 'commute',
        notifyEligible: true,
      });
    }

    /* 📈 Productivity: battery & performance check - ADDED BREAK REMINDER */
    if (hour >= 12 && hour <= 17 && caps.performance.tier >= 4 && runtime.batteryLevel > 0.5) {
      moments.push({
        id: 'productivity-window',
        emoji: '📈',
        title: 'Good time for heavy tasks',
        description: this.stepStats.consecutiveInactiveHours >= 2
          ? 'Battery and performance are optimal. Consider a short walk break first!'
          : 'Battery and performance are optimal for calls or apps.',
        priority: 4,
        expiresAt: now + 3 * 60 * 60 * 1000,
        category: 'productivity',
        notifyEligible: true,
      });
    }

    /* 🎬 Evening entertainment - ADDED STEP CONTEXT */
    if (hour >= 18 && hour <= 23 && caps.performance.tier >= 3) {
      const stepsLeft = this.STEP_GOAL - currentSteps;
      moments.push({
        id: 'evening-entertainment',
        emoji: '🎬',
        title: stepsLeft > 0 ? 'Walk before entertainment?' : 'Perfect for movies or gaming',
        description: stepsLeft > 0 && stepsLeft <= 1000
          ? `Just ${stepsLeft} steps to reach your goal before movie time!`
          : 'Your phone can handle longer sessions tonight.',
        priority: 4,
        expiresAt: endOfDay,
        category: 'entertainment',
        notifyEligible: false,
      });
    }

    /* 💾 Storage alerts */
    const free = caps.storage.free;
    const total = caps.storage.total || 100;
    const freePercent = (free / total) * 100;

    if (freePercent < 10) {
      moments.push({
        id: 'storage-critical',
        emoji: '⚠️',
        title: 'Storage almost full',
        description: 'Free up space to keep your phone fast.',
        priority: 5,
        expiresAt: endOfDay,
        category: 'storage',
        notifyEligible: true,
        suggestion: 'Delete large files or unused apps',
      });
    } else if (freePercent < 30) {
      moments.push({
        id: 'storage-warning',
        emoji: '🛋️',
        title: 'Storage getting tight',
        description: 'Consider cleaning up some files soon.',
        priority: 3,
        expiresAt: endOfDay,
        category: 'storage',
        notifyEligible: false,
      });
    }

    /* ⚡ Performance: smooth display */
    if (info.refreshRate && info.refreshRate >= 120) {
      moments.push({
        id: 'high-refresh-display',
        emoji: '✨',
        title: 'Ultra-smooth scrolling',
        description: '120Hz screen for silky animations and fluid scrolling.',
        priority: 4,
        expiresAt: endOfDay,
        category: 'performance',
        notifyEligible: false,
      });
    }

    /* 🛰️ Sensors: real benefit for apps */
    const activeSensors = caps.sensors.filter(s => s.available);
    if (activeSensors.length >= 3) {
      moments.push({
        id: 'sensor-usage',
        emoji: '🛰️',
        title: 'Sensors ready',
        description: 'AR, fitness, and navigation apps will perform well.',
        priority: 3,
        expiresAt: endOfDay,
        category: 'sensors',
        notifyEligible: false,
      });
    }

    /* 🎮 Weekend gaming */
    if (isWeekend && caps.gaming.tier >= 4) {
      moments.push({
        id: 'weekend-gaming',
        emoji: '🎮',
        title: 'Gaming session ready',
        description: 'Your phone can handle long gaming sessions without lag.',
        priority: 4,
        expiresAt: endOfDay,
        category: 'weekend',
        notifyEligible: false,
      });
    }

    /* 🔋 Low battery alert */
    if (runtime.batteryLevel > 0 && runtime.batteryLevel < 0.2) {
      moments.push({
        id: 'battery-low',
        emoji: '🔋',
        title: 'Low battery',
        description: 'Battery under 20%, consider charging soon.',
        priority: 5,
        expiresAt: now + 2 * 60 * 60 * 1000,
        category: 'battery',
        notifyEligible: true,
      });
    }

    return moments;
  }

  /* =======================
     STEP TRACKING METHODS
  ======================= */

  private shouldCheckSteps(now: number): boolean {
    return now - this.lastStepsCheck > this.STEPS_CHECK_INTERVAL;
  }

  private updateStepStats(currentSteps: number, hour: number) {
    const now = Date.now();
    
    // Record steps per hour
    if (this.lastStepsCount > 0 && currentSteps > this.lastStepsCount) {
      const stepsThisHour = currentSteps - this.lastStepsCount;
      this.stepStats.stepsPerHour[hour] += stepsThisHour;
      
      // Update best time for walking if this hour has high activity
      if (stepsThisHour > 500 && hour !== this.stepStats.bestTimeForWalking) {
        this.stepStats.bestTimeForWalking = hour;
      }
    }
    
    // Check for inactivity
    if (currentSteps === this.lastStepsCount) {
      if (hour !== this.stepStats.lastActiveHour) {
        this.stepStats.consecutiveInactiveHours++;
      }
    } else {
      this.stepStats.lastActiveHour = hour;
      this.stepStats.consecutiveInactiveHours = 0;
    }
    
    this.lastStepsCount = currentSteps;
    this.lastStepsCheck = now;
    
    // Keep only last 24 hours of history
    this.stepHistory.push({timestamp: now, steps: currentSteps});
    if (this.stepHistory.length > 96) {
      this.stepHistory = this.stepHistory.slice(-96);
    }
  }

  private generateStepMoments(
    currentSteps: number,
    hour: number,
    day: number,
    isWeekend: boolean,
    caps: DeviceCapabilities
  ): PhoneMoment[] {
    const moments: PhoneMoment[] = [];
    const now = Date.now();
    const endOfDay = new Date().setHours(23, 59, 59, 999);
    
    // Check if device has pedometer capability
    const hasPedometer = caps.sensors?.some(s => 
      s.name.toLowerCase().includes('pedometer') || 
      s.name.toLowerCase().includes('step')
    );
    
    if (!hasPedometer) {
      return moments;
    }

    const progressPercentage = Math.min((currentSteps / this.STEP_GOAL) * 100, 100);
    
    /* 🚶 Step Goal Achievements */
    if (currentSteps >= this.STEP_GOAL) {
      moments.push({
        id: 'step-goal-achieved',
        emoji: '🏆',
        title: 'Step Goal Achieved!',
        description: `You've reached ${currentSteps.toLocaleString()} steps today! Keep up the great work!`,
        priority: 4,
        expiresAt: endOfDay,
        category: 'fitness',
        notifyEligible: true,
      });
    } else if (progressPercentage >= 75) {
      moments.push({
        id: 'step-goal-close',
        emoji: '🎯',
        title: 'Almost There!',
        description: `You're ${this.STEP_GOAL - currentSteps} steps away from your daily goal.`,
        priority: 3,
        expiresAt: endOfDay,
        category: 'fitness',
        notifyEligible: false,
      });
    } else if (currentSteps === 0 && hour >= 9) {
      moments.push({
        id: 'step-day-start',
        emoji: '🌅',
        title: 'Perfect day to move',
        description: 'Start your day with a short walk to boost your energy!',
        priority: 3,
        expiresAt: now + 3 * 60 * 60 * 1000,
        category: 'morning',
        notifyEligible: false,
      });
    }

    /* 🚶‍♂️ Activity Reminders */
    if (this.stepStats.consecutiveInactiveHours >= 2) {
      const suggestedWalkTime = this.getOptimalWalkTime(hour);
      
      if (suggestedWalkTime !== -1) {
        moments.push({
          id: 'walk-suggestion',
          emoji: '🚶‍♂️',
          title: 'Perfect time for a walk!',
          description: `You've been inactive for a while. How about a 10-minute walk? ${this.getWalkBenefit()}`,
          priority: 4,
          expiresAt: now + 2 * 60 * 60 * 1000,
          category: 'activity',
          notifyEligible: true,
          suggestion: 'Take a 10-minute walk around the block',
        });
      }
    }

    /* 🏃‍♀️ Post-Lunch Activity */
    if (hour === 14 && currentSteps < 1000) {
      moments.push({
        id: 'post-lunch-walk',
        emoji: '🍃',
        title: 'Beat the afternoon slump',
        description: 'A quick walk after lunch can improve focus and digestion.',
        priority: 3,
        expiresAt: now + 2 * 60 * 60 * 1000,
        category: 'productivity',
        notifyEligible: true,
      });
    }

    /* 🌅 Morning Freshness */
    if (hour >= 6 && hour <= 8 && currentSteps < 500) {
      moments.push({
        id: 'morning-freshness',
        emoji: '🌅',
        title: 'Morning freshness',
        description: 'Start your day with a morning walk to boost mood and energy.',
        priority: 3,
        expiresAt: now + 2 * 60 * 60 * 1000,
        category: 'morning',
        notifyEligible: false,
      });
    }

    /* 🌇 Evening Wind Down */
    if (hour >= 17 && hour <= 19 && currentSteps < (this.STEP_GOAL * 0.7)) {
      moments.push({
        id: 'evening-stroll',
        emoji: '🌇',
        title: 'Evening stroll time',
        description: 'Perfect weather for an evening walk to clear your mind.',
        priority: 3,
        expiresAt: endOfDay,
        category: 'evening',
        notifyEligible: false,
      });
    }

    /* 📱 Phone Usage Balance */
    if (hour >= 12 && hour <= 16 && this.stepStats.consecutiveInactiveHours >= 3) {
      moments.push({
        id: 'screen-break',
        emoji: '📱',
        title: 'Screen break time',
        description: 'Been on your phone a while? A short walk can reduce eye strain.',
        priority: 4,
        expiresAt: now + 1 * 60 * 60 * 1000,
        category: 'health',
        notifyEligible: true,
      });
    }

    /* 🎵 Walking with Music */
    if (isWeekend && hour >= 10 && hour <= 18 && currentSteps < (this.STEP_GOAL * 0.5)) {
      moments.push({
        id: 'weekend-walk',
        emoji: '🎵',
        title: 'Weekend vibes',
        description: 'Perfect weekend for a walk with your favorite podcast or music.',
        priority: 3,
        expiresAt: endOfDay,
        category: 'weekend',
        notifyEligible: false,
      });
    }

    /* ☀️ Good Weather Check (simulated) */
    const isGoodWeather = this.isLikelyGoodWeather(hour);
    if (isGoodWeather && this.stepStats.consecutiveInactiveHours >= 1) {
      moments.push({
        id: 'weather-walk',
        emoji: '☀️',
        title: 'Great weather for walking!',
        description: 'The conditions are perfect for some fresh air and movement.',
        priority: 4,
        expiresAt: now + 3 * 60 * 60 * 1000,
        category: 'weather',
        notifyEligible: true,
      });
    }

    /* 🏢 Break from Work/Study */
    if (hour >= 9 && hour <= 17 && (hour % 2 === 1)) {
      moments.push({
        id: 'work-break',
        emoji: '🏢',
        title: 'Time for a break',
        description: 'Research shows short walks during work improve productivity.',
        priority: 3,
        expiresAt: now + 1 * 60 * 60 * 1000,
        category: 'productivity',
        notifyEligible: true,
      });
    }

    return moments;
  }

  private getOptimalWalkTime(currentHour: number): number {
    const preferredTimes = [9, 12, 15, 18];
    
    for (const time of preferredTimes) {
      if (currentHour <= time && currentHour >= time - 1) {
        return time;
      }
    }
    
    return this.stepStats.bestTimeForWalking !== -1 
      ? this.stepStats.bestTimeForWalking 
      : 15;
  }

  private getWalkBenefit(): string {
    const benefits = [
      'It can boost your creativity!',
      'Great for clearing your mind!',
      'Helps reduce stress levels!',
      'Perfect for some fresh air!',
      'Good for your posture!',
      'Helps improve circulation!'
    ];
    return benefits[Math.floor(Math.random() * benefits.length)];
  }

  private isLikelyGoodWeather(hour: number): boolean {
    const goodWeatherHours = [9, 10, 11, 14, 15, 16, 17];
    return goodWeatherHours.includes(hour);
  }

  private simulateStepCount(hour: number, isWeekend: boolean): number {
    let baseSteps = 0;
    
    if (hour < 6) baseSteps = 100;
    else if (hour < 12) baseSteps = 1500;
    else if (hour < 18) baseSteps = 3000;
    else baseSteps = 4000;
    
    if (isWeekend) baseSteps += 1000;
    
    const randomVariation = Math.floor(Math.random() * 500);
    return baseSteps + randomVariation;
  }

  /* =======================
     CONFLICT RESOLUTION
  ======================= */

  private resolveConflicts(moments: PhoneMoment[]): PhoneMoment[] {
    const hasCritical = moments.some(m => m.priority === 5);

    const filtered = hasCritical
      ? moments.filter(m => m.priority >= 4)
      : moments;

    return filtered
      .sort((a, b) => b.priority - a.priority || a.expiresAt - b.expiresAt)
      .slice(0, 4);
  }

  /* =======================
     NOTIFICATIONS
  ======================= */

  private isNotificationCandidate(moment: PhoneMoment, now: number): boolean {
    if (!moment.notifyEligible) return false;
    if (moment.priority < 4) return false;
    if (moment.expiresAt - now < 60 * 60 * 1000) return false;

    const last = this.notifiedMoments[moment.id];
    return !last || now - last > this.NOTIFICATION_COOLDOWN;
  }

  private async recordNotification(id: string) {
    this.notifiedMoments[id] = Date.now();
    await AsyncStorage.setItem(
      STORAGE_KEYS.notified,
      JSON.stringify(this.notifiedMoments)
    );
  }

  /* =======================
     SEEN MEMORY
  ======================= */

  private async recordSeen(ids: string[]) {
    const now = Date.now();
    ids.forEach(id => {
      if (!this.seenMoments[id]) {
        this.seenMoments[id] = now;
      }
    });

    await AsyncStorage.setItem(
      STORAGE_KEYS.seen,
      JSON.stringify(this.seenMoments)
    );
  }

  /* =======================
     PERSISTENCE
  ======================= */

  private async loadPersistence() {
    try {
      const [notified, seen, stepStats] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.notified),
        AsyncStorage.getItem(STORAGE_KEYS.seen),
        AsyncStorage.getItem(STORAGE_KEYS.stepStats),
      ]);

      if (notified) this.notifiedMoments = JSON.parse(notified);
      if (seen) this.seenMoments = JSON.parse(seen);
      if (stepStats) {
        const savedStats = JSON.parse(stepStats);
        const now = Date.now();
        // Only load if data is from today
        if (now - savedStats.lastLoadTime < 24 * 60 * 60 * 1000) {
          this.stepStats = savedStats;
        }
      }
    } catch {
      this.notifiedMoments = {};
      this.seenMoments = {};
      this.stepStats = {
        lastActiveHour: -1,
        consecutiveInactiveHours: 0,
        bestTimeForWalking: -1,
        stepsPerHour: new Array(24).fill(0),
        lastLoadTime: Date.now(),
      };
    }
  }

  private async saveStepStats() {
    try {
      this.stepStats.lastLoadTime = Date.now();
      await AsyncStorage.setItem(
        STORAGE_KEYS.stepStats,
        JSON.stringify(this.stepStats)
      );
    } catch (error) {
      console.error('Failed to save step stats:', error);
    }
  }
}

export const momentEngine = new MomentEngine();