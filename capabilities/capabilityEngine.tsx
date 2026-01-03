import { DeviceInfo, RuntimeSignals } from './types';
import { calculatePerformanceCapability } from './performanceCapability';
import { calculateGamingCapability, GamingCapability } from './gamingCapability';
import { calculateVideoRecordingCapability, VideoRecordingCapability } from './videoRecordingCapability';
import { calculateBatteryStressCapability, BatteryStressCapability } from './batteryStressCapability';
import { calculateDailyUsageCapability, DailyUsageCapability } from './dailyUsageCapability';

export interface DeviceCapabilities {
  performance: ReturnType<typeof calculatePerformanceCapability>;
  gaming: GamingCapability;
  videoRecording: VideoRecordingCapability;
  batteryStress: BatteryStressCapability;
  dailyUsage: DailyUsageCapability;
  featureUnlocks: FeatureUnlocks;
  lastUpdated: Date;
}

export interface FeatureUnlocks {
  unlocked: Array<{
    feature: string;
    tierRequired: number;
    confidence: number;
  }>;
  blocked: Array<{
    feature: string;
    reason: string;
    tierRequired?: number;
  }>;
}

// Type guard to check if an object has a tier property
function hasTier(obj: any): obj is { tier: number; [key: string]: any } {
  return obj && typeof obj === 'object' && 'tier' in obj;
}

// Type guard to check if an object has a why property
function hasWhy(obj: any): obj is { why: string; [key: string]: any } {
  return obj && typeof obj === 'object' && 'why' in obj;
}

/**
 * Main Capability Engine
 * Aggregates all capability calculations into a single interface
 * Pure functions only - no side effects, no React dependencies
 */
export function buildCapabilities(
  deviceInfo: DeviceInfo,
  runtime: RuntimeSignals
): DeviceCapabilities {
  // Calculate all capabilities
  const performance = calculatePerformanceCapability(deviceInfo);
  const gaming = calculateGamingCapability(deviceInfo, runtime);
  const videoRecording = calculateVideoRecordingCapability(deviceInfo, runtime);
  const batteryStress = calculateBatteryStressCapability(deviceInfo, runtime);
  const dailyUsage = calculateDailyUsageCapability(deviceInfo, runtime);

  // Determine feature unlocks based on capabilities
  const featureUnlocks = calculateFeatureUnlocks({
    performance,
    gaming,
    videoRecording,
    batteryStress,
  });

  return {
    performance,
    gaming,
    videoRecording,
    batteryStress,
    dailyUsage,
    featureUnlocks,
    lastUpdated: new Date(),
  };
}

/**
 * Feature Unlock System
 * Determines which features are available based on capability tiers
 */
function calculateFeatureUnlocks(capabilities: {
  performance: ReturnType<typeof calculatePerformanceCapability>;
  gaming: GamingCapability;
  videoRecording: VideoRecordingCapability;
  batteryStress: BatteryStressCapability;
}): FeatureUnlocks {
  const unlocked: FeatureUnlocks['unlocked'] = [];
  const blocked: FeatureUnlocks['blocked'] = [];

  // 1. Performance-based unlocks
  if (capabilities.performance.tier >= 3) {
    unlocked.push({
      feature: 'Smooth Multitasking',
      tierRequired: 3,
      confidence: capabilities.performance.confidence,
    });
  } else {
    blocked.push({
      feature: 'Smooth Multitasking',
      reason: 'Insufficient RAM or CPU performance',
      tierRequired: 3,
    });
  }

  if (capabilities.performance.tier >= 4) {
    unlocked.push({
      feature: 'Heavy App Performance',
      tierRequired: 4,
      confidence: capabilities.performance.confidence,
    });
  }

  // 2. Gaming unlocks
  if (capabilities.gaming.canRunPopular) {
    unlocked.push({
      feature: 'Popular Mobile Gaming',
      tierRequired: capabilities.gaming.tier,
      confidence: capabilities.gaming.confidence,
    });
  } else {
    blocked.push({
      feature: 'Popular Mobile Gaming',
      reason: 'Hardware not sufficient for gaming performance',
    });
  }

  if (capabilities.gaming.canRunAAA) {
    unlocked.push({
      feature: 'AAA Game Compatibility',
      tierRequired: 4,
      confidence: capabilities.gaming.confidence,
    });
  }

  // 3. Video recording unlocks
  if (capabilities.videoRecording.tier >= 3) {
    unlocked.push({
      feature: 'Stable 4K Recording',
      tierRequired: 3,
      confidence: capabilities.videoRecording.confidence,
    });
  } else {
    blocked.push({
      feature: 'Stable 4K Recording',
      reason: capabilities.videoRecording.limitations[0] || 'Insufficient performance or storage',
    });
  }

  // 4. Battery-based unlocks
  if (capabilities.batteryStress.tier >= 3) {
    unlocked.push({
      feature: 'All-Day Battery Life',
      tierRequired: 3,
      confidence: capabilities.batteryStress.confidence,
    });
  } else {
    blocked.push({
      feature: 'All-Day Battery Life',
      reason: `Battery stress level: ${capabilities.batteryStress.stressLevel}`,
    });
  }

  return { unlocked, blocked };
}

/**
 * Confidence Bar Generator
 * Converts confidence scores to visual bar representation
 */
export function generateConfidenceBars(capabilities: DeviceCapabilities) {
  return {
    performance: {
      score: capabilities.performance.score,
      confidence: capabilities.performance.confidence,
      bars: Math.ceil(capabilities.performance.confidence / 20), // 1-5 bars
      color: getConfidenceColor(capabilities.performance.confidence),
    },
    gaming: {
      score: capabilities.gaming.score,
      confidence: capabilities.gaming.confidence,
      bars: Math.ceil(capabilities.gaming.confidence / 20),
      color: getConfidenceColor(capabilities.gaming.confidence),
    },
    videoRecording: {
      score: capabilities.videoRecording.score,
      confidence: capabilities.videoRecording.confidence,
      bars: Math.ceil(capabilities.videoRecording.confidence / 20),
      color: getConfidenceColor(capabilities.videoRecording.confidence),
    },
    batteryStress: {
      score: capabilities.batteryStress.score,
      confidence: capabilities.batteryStress.confidence,
      bars: Math.ceil(capabilities.batteryStress.confidence / 20),
      color: getConfidenceColor(capabilities.batteryStress.confidence),
    },
    dailyUsage: {
      score: capabilities.dailyUsage.score,
      confidence: capabilities.dailyUsage.confidence,
      bars: Math.ceil(capabilities.dailyUsage.confidence / 20),
      color: getConfidenceColor(capabilities.dailyUsage.confidence),
    },
  };
}

/**
 * Helper: Get confidence color for visual indicators
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return '#10B981'; // Green - High confidence
  if (confidence >= 60) return '#F59E0B'; // Yellow - Medium confidence
  return '#EF4444'; // Red - Low confidence
}

/**
 * Helper: Get "Why?" explanation for any capability
 */
export function getCapabilityExplanation(
  capabilityName: keyof DeviceCapabilities,
  capabilities: DeviceCapabilities
): string {
  const capability = capabilities[capabilityName];
  
  // Use type guard to safely access properties
  if (hasWhy(capability)) {
    return capability.why;
  }

  // Fallback explanations based on capability type
  switch (capabilityName) {
    case 'performance':
      const perf = capabilities.performance;
      return `Performance tier ${perf.tier} based on available hardware metrics`;
    case 'gaming':
      const gaming = capabilities.gaming;
      return `Gaming capability determined by performance, memory, and current battery`;
    case 'videoRecording':
      const video = capabilities.videoRecording;
      return `Video recording assessment based on storage, battery, and stabilization`;
    case 'batteryStress':
      const battery = capabilities.batteryStress;
      return `Battery stress calculated from current level and device characteristics`;
    case 'dailyUsage':
      const daily = capabilities.dailyUsage;
      return `Usage pattern derived from performance and battery capabilities`;
    case 'featureUnlocks':
      return `${capabilities.featureUnlocks.unlocked.length} features available, ${capabilities.featureUnlocks.blocked.length} limited`;
    case 'lastUpdated':
      return `Last updated: ${capabilities.lastUpdated.toLocaleTimeString()}`;
    default:
      return 'Capability assessment based on available device information';
  }
}

/**
 * Get tier from any capability that has one
 */
export function getCapabilityTier(
  capabilityName: keyof DeviceCapabilities,
  capabilities: DeviceCapabilities
): number | null {
  const capability = capabilities[capabilityName];
  
  // Check specific capabilities first
  switch (capabilityName) {
    case 'performance':
      return capabilities.performance.tier;
    case 'gaming':
      return capabilities.gaming.tier;
    case 'videoRecording':
      return capabilities.videoRecording.tier;
    case 'batteryStress':
      return capabilities.batteryStress.tier;
    case 'dailyUsage':
      return capabilities.dailyUsage.tier;
    default:
      // Generic check for other objects that might have tier
      if (hasTier(capability)) {
        return capability.tier;
      }
      return null;
  }
}

/**
 * Get score from any capability that has one
 */
export function getCapabilityScore(
  capabilityName: keyof DeviceCapabilities,
  capabilities: DeviceCapabilities
): number | null {
  const capability = capabilities[capabilityName];
  
  // Check specific capabilities first
  switch (capabilityName) {
    case 'performance':
      return capabilities.performance.score;
    case 'gaming':
      return capabilities.gaming.score;
    case 'videoRecording':
      return capabilities.videoRecording.score;
    case 'batteryStress':
      return capabilities.batteryStress.score;
    case 'dailyUsage':
      return capabilities.dailyUsage.score;
    default:
      // Generic check for score property
      if (capability && typeof capability === 'object' && 'score' in capability) {
        const scoreObj = capability as { score: number };
        return scoreObj.score;
      }
      return null;
  }
}