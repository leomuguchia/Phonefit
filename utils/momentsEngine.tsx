import type { DeviceInfo, DeviceCapabilities, RuntimeSignals } from '../types';
import type { PhoneMoment } from '../types';
import { notificationEngine } from './notificationsEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SeenMomentsMap = Record<string, number>;

const STORAGE_KEYS = {
  notified: '@moment_notification_history',
  seen: '@moment_seen_history',
  stepStats: '@moment_step_stats',
};

type StepStats = {
  lastActiveHour: number;
  consecutiveInactiveHours: number;
  bestTimeForWalking: number;
  stepsPerHour: number[];
  lastLoadTime: number;
};

const createEmptyStepStats = (): StepStats => ({
  lastActiveHour: -1,
  consecutiveInactiveHours: 0,
  bestTimeForWalking: -1,
  stepsPerHour: new Array(24).fill(0),
  lastLoadTime: Date.now(),
});

export class MomentEngine {
  private lastGeneratedMoments: PhoneMoment[] = [];
  private lastGenerationTime = 0;

  private lastStepsCheck = 0;
  private lastStepsCount = 0;
  private stepHistory: { timestamp: number; steps: number }[] = [];

  private readonly GENERATION_INTERVAL = 30 * 60 * 1000;
  private readonly NOTIFICATION_COOLDOWN = 4 * 60 * 60 * 1000;
  private readonly STEPS_CHECK_INTERVAL = 15 * 60 * 1000;
  private readonly STEP_GOAL = 5000;

  private notifiedMoments: Record<string, number> = {};
  private seenMoments: SeenMomentsMap = {};
  private stepStats: StepStats = createEmptyStepStats();

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

    const moments = this.resolveConflicts(
      this.generateMoments(info, caps, runtime)
    );

    this.lastGeneratedMoments = moments;
    this.lastGenerationTime = now;

    let notificationsSent = 0;

    for (const moment of moments) {
      if (!this.isNotificationCandidate(moment, now)) continue;

      try {
        const sent = await notificationEngine.sendMomentNotification(moment);
        if (sent) {
          notificationsSent++;
          await this.recordNotification(moment.id);
        }
      } catch (e) {
        console.warn('Moment notification failed:', moment.id, e);
      }
    }

    await this.recordSeen(moments.map(m => m.id));
    await this.saveStepStats();

    return { moments, newNotificationsSent: notificationsSent };
  }

  getRecentMoments(): PhoneMoment[] {
    return this.lastGeneratedMoments;
  }

  clearCache() {
    this.lastGeneratedMoments = [];
    this.lastGenerationTime = 0;
    this.notifiedMoments = {};
    this.seenMoments = {};
    this.stepStats = createEmptyStepStats();
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
    const date = new Date();
    const hour = date.getHours();
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    const endOfDay = new Date().setHours(23, 59, 59, 999);

    const moments: PhoneMoment[] = [];

    const sensors = Array.isArray(caps.sensors) ? caps.sensors : [];

    /* ---------- Steps ---------- */

    let currentSteps = 0;

    if (sensors.length && this.shouldCheckSteps(now)) {
      this.lastStepsCheck = now;
      currentSteps = this.simulateStepCount(hour, isWeekend);
      this.updateStepStats(currentSteps, hour);
    }

    moments.push(
      ...this.generateStepMoments(currentSteps, hour, day, isWeekend, sensors)
    );

    /* ---------- Context Moments ---------- */

    if (hour >= 6 && hour <= 11 && runtime.batteryLevel >= 0.9) {
      moments.push({
        id: 'morning-charge-ready',
        emoji: '☀️',
        title: 'Phone fully charged',
        description:
          currentSteps < 100
            ? 'Perfect for tracking your morning walk!'
            : 'Start your day without worrying about battery.',
        priority: 3,
        expiresAt: endOfDay,
        category: 'morning',
        notifyEligible: false,
      });
    }

    if (hour >= 18 && hour <= 23 && caps.performance?.tier >= 3) {
      const stepsLeft = this.STEP_GOAL - currentSteps;
      moments.push({
        id: 'evening-entertainment',
        emoji: '🎬',
        title:
          stepsLeft > 0
            ? 'Walk before entertainment?'
            : 'Perfect for movies or gaming',
        description:
          stepsLeft > 0 && stepsLeft <= 1000
            ? `Just ${stepsLeft} steps to reach your goal before movie time!`
            : 'Your phone can handle longer sessions tonight.',
        priority: 4,
        expiresAt: endOfDay,
        category: 'entertainment',
        notifyEligible: false,
      });
    }

    const activeSensors = sensors.filter(s => s?.available);
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
     STEPS
  ======================= */

  private shouldCheckSteps(now: number) {
    return now - this.lastStepsCheck > this.STEPS_CHECK_INTERVAL;
  }

  private updateStepStats(currentSteps: number, hour: number) {
    if (
      !Array.isArray(this.stepStats.stepsPerHour) ||
      this.stepStats.stepsPerHour.length !== 24
    ) {
      this.stepStats = createEmptyStepStats();
    }

    if (currentSteps > this.lastStepsCount) {
      const delta = currentSteps - this.lastStepsCount;
      this.stepStats.stepsPerHour[hour] += delta;
      this.stepStats.lastActiveHour = hour;
      this.stepStats.consecutiveInactiveHours = 0;

      if (delta > 500) this.stepStats.bestTimeForWalking = hour;
    } else if (hour !== this.stepStats.lastActiveHour) {
      this.stepStats.consecutiveInactiveHours++;
    }

    this.lastStepsCount = currentSteps;
  }

  private generateStepMoments(
    currentSteps: number,
    hour: number,
    _day: number,
    isWeekend: boolean,
    sensors: any[]
  ): PhoneMoment[] {
    const hasPedometer = sensors.some(s =>
      s.name?.toLowerCase().includes('step')
    );

    if (!hasPedometer) return [];

    const now = Date.now();
    const endOfDay = new Date().setHours(23, 59, 59, 999);
    const moments: PhoneMoment[] = [];

    if (currentSteps >= this.STEP_GOAL) {
      moments.push({
        id: 'step-goal-achieved',
        emoji: '🏆',
        title: 'Step Goal Achieved!',
        description: `You've reached ${currentSteps.toLocaleString()} steps today!`,
        priority: 4,
        expiresAt: endOfDay,
        category: 'fitness',
        notifyEligible: true,
      });
    }

    if (hour >= 17 && hour <= 19 && currentSteps < this.STEP_GOAL * 0.7) {
      moments.push({
        id: 'evening-stroll',
        emoji: '🌇',
        title: 'Evening stroll time',
        description: 'Perfect time to clear your mind with a walk.',
        priority: 3,
        expiresAt: endOfDay,
        category: 'evening',
        notifyEligible: false,
      });
    }

    return moments;
  }

  /* =======================
     CONFLICTS & NOTIFS
  ======================= */

  private resolveConflicts(moments: PhoneMoment[]) {
    const hasCritical = moments.some(m => m.priority === 5);
    return (hasCritical
      ? moments.filter(m => m.priority >= 4)
      : moments
    )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4);
  }

  private isNotificationCandidate(moment: PhoneMoment, now: number) {
    if (!moment.notifyEligible || moment.priority < 4) return false;
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

  private async recordSeen(ids: string[]) {
    const now = Date.now();
    ids.forEach(id => {
      if (!this.seenMoments[id]) this.seenMoments[id] = now;
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
        const parsed = JSON.parse(stepStats);
        if (
          parsed &&
          Array.isArray(parsed.stepsPerHour) &&
          parsed.stepsPerHour.length === 24
        ) {
          this.stepStats = parsed;
        }
      }
    } catch {
      this.notifiedMoments = {};
      this.seenMoments = {};
      this.stepStats = createEmptyStepStats();
    }
  }

  private async saveStepStats() {
    this.stepStats.lastLoadTime = Date.now();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.stepStats,
        JSON.stringify(this.stepStats)
      );
    } catch (e) {
      console.warn('Failed to save step stats', e);
    }
  }

  /* =======================
     SIMULATION
  ======================= */

  private simulateStepCount(hour: number, isWeekend: boolean) {
    let base =
      hour < 6 ? 100 : hour < 12 ? 1500 : hour < 18 ? 3000 : 4000;
    if (isWeekend) base += 1000;
    return base + Math.floor(Math.random() * 500);
  }
}

export const momentEngine = new MomentEngine();
