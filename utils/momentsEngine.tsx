import type { DeviceInfo, DeviceCapabilities, RuntimeSignals } from '../types';
import type { PhoneMoment } from '../types';
import { notificationEngine } from './notificationsEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SeenMomentsMap = Record<string, number>;

const STORAGE_KEYS = {
  notified: '@moment_notification_history',
  seen: '@moment_seen_history',
};

export class MomentEngine {
  private lastGeneratedMoments: PhoneMoment[] = [];
  private lastGenerationTime = 0;

  private readonly GENERATION_INTERVAL = 30 * 60 * 1000; // 30 min
  private readonly NOTIFICATION_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hrs

  private notifiedMoments: Record<string, number> = {};
  private seenMoments: SeenMomentsMap = {};

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

    /* 🌅 Morning: full battery */
    if (hour >= 6 && hour <= 11 && runtime.batteryLevel >= 0.9) {
      moments.push({
        id: 'morning-charge-ready',
        emoji: '☀️',
        title: 'Phone fully charged',
        description: 'Start your day without worrying about battery.',
        priority: 3,
        expiresAt: endOfDay,
        category: 'morning',
        notifyEligible: false,
      });
    }

    /* 🚇 Commute: smooth experience */
    if (hour >= 7 && hour <= 10 && caps.performance.tier >= 4) {
      moments.push({
        id: 'commute-ready',
        emoji: '🚇',
        title: 'Commute-ready phone',
        description: 'Smooth navigation, streaming, and music for your trip.',
        priority: 4,
        expiresAt: now + 2 * 60 * 60 * 1000,
        category: 'commute',
        notifyEligible: true,
      });
    }

    /* 📈 Productivity: battery & performance check */
    if (hour >= 12 && hour <= 17 && caps.performance.tier >= 4 && runtime.batteryLevel > 0.5) {
      moments.push({
        id: 'productivity-window',
        emoji: '📈',
        title: 'Good time for heavy tasks',
        description: 'Battery and performance are optimal for calls or apps.',
        priority: 4,
        expiresAt: now + 3 * 60 * 60 * 1000,
        category: 'productivity',
        notifyEligible: true,
      });
    }

    /* 🎬 Evening entertainment */
    if (hour >= 18 && hour <= 23 && caps.performance.tier >= 3) {
      moments.push({
        id: 'evening-entertainment',
        emoji: '🎬',
        title: 'Perfect for movies or gaming',
        description: 'Your phone can handle longer sessions tonight.',
        priority: 4,
        expiresAt: endOfDay,
        category: 'entertainment',
        notifyEligible: false,
      });
    }

    /* 💾 Storage alerts */
    const free = caps.storage.free;
    const total = caps.storage.total || 100; // fallback
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
      const [notified, seen] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.notified),
        AsyncStorage.getItem(STORAGE_KEYS.seen),
      ]);

      if (notified) this.notifiedMoments = JSON.parse(notified);
      if (seen) this.seenMoments = JSON.parse(seen);
    } catch {
      this.notifiedMoments = {};
      this.seenMoments = {};
    }
  }
}

export const momentEngine = new MomentEngine();
