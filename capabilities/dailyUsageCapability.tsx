import { DeviceInfo, RuntimeSignals, CapabilityResult } from './types';
import { calculatePerformanceCapability } from './performanceCapability';
import { calculateBatteryStressCapability } from './batteryStressCapability';

export interface DailyUsageCapability extends CapabilityResult {
  pattern: 'Light' | 'Moderate' | 'Power' | 'Extreme';
  screenTime: string;
  idealUseCase: string;
}

/**
 * Daily Usage Pattern
 * What kind of user experience this device provides day-to-day
 * Combines performance and battery characteristics
 */
export function calculateDailyUsageCapability(
  deviceInfo: DeviceInfo,
  runtime: RuntimeSignals
): DailyUsageCapability {
  const performance = calculatePerformanceCapability(deviceInfo);
  const batteryStress = calculateBatteryStressCapability(deviceInfo, runtime);

  // Determine pattern based on performance and battery
  let pattern: DailyUsageCapability['pattern'];
  let tier: number;
  let screenTime: string;
  let idealUseCase: string;

  // High performance + good battery = Power user
  if (performance.tier >= 4 && batteryStress.stressLevel === 'Low') {
    pattern = 'Power';
    tier = 5;
    screenTime = '6-8+ hours';
    idealUseCase = 'Multitasking, gaming, creative work';
  }
  // Good performance + moderate battery = Moderate user
  else if (performance.tier >= 3 && batteryStress.stressLevel !== 'Critical') {
    pattern = 'Moderate';
    tier = 4;
    screenTime = '4-6 hours';
    idealUseCase = 'Social media, streaming, light gaming';
  }
  // Low performance + poor battery = Light user
  else if (performance.tier <= 2 || batteryStress.stressLevel === 'Critical') {
    pattern = 'Light';
    tier = 2;
    screenTime = '2-4 hours';
    idealUseCase = 'Calls, messaging, essential apps';
  }
  // Extreme case: Very high performance but terrible battery
  else if (performance.tier >= 4 && batteryStress.stressLevel === 'High') {
    pattern = 'Extreme';
    tier = 3;
    screenTime = '1-3 hours (plugged in recommended)';
    idealUseCase = 'Short bursts of intensive use';
  }
  // Default fallback
  else {
    pattern = 'Moderate';
    tier = 3;
    screenTime = '3-5 hours';
    idealUseCase = 'Mixed daily usage';
  }

  // Calculate combined score (weighted average)
  const combinedScore = Math.round(
    (performance.score * 0.6) + (batteryStress.score * 0.4)
  );

  // Confidence is lower of the two
  const confidence = Math.min(performance.confidence, batteryStress.confidence);

  return {
    tier,
    score: combinedScore,
    confidence,
    pattern,
    screenTime,
    idealUseCase,
    why: `Combines ${performance.tier >= 4 ? 'high' : 'adequate'} performance with ${batteryStress.stressLevel} battery stress`,
  };
}