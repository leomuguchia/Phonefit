import { DeviceInfo, RuntimeSignals, CapabilityResult } from './types';
import { calculatePerformanceCapability } from './performanceCapability';

export interface BatteryStressCapability extends CapabilityResult {
  stressLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  estimatedHeavyUsageMinutes: number;
  riskFactors: string[];
}

/**
 * Battery Stress Capability
 * How well the battery can handle sustained heavy usage
 * Based on current battery level and device characteristics
 */
export function calculateBatteryStressCapability(
  deviceInfo: DeviceInfo,
  runtime: RuntimeSignals
): BatteryStressCapability {
  const performance = calculatePerformanceCapability(deviceInfo);
  const riskFactors: string[] = [];
  let stressMultiplier = 1.0;

  // 1. CURRENT BATTERY LEVEL (primary factor)
  const batteryLevel = runtime.batteryLevel;
  let baseMinutes: number;
  
  if (batteryLevel >= 0.8) {
    baseMinutes = 180; // 3 hours at full
  } else if (batteryLevel >= 0.5) {
    baseMinutes = 120; // 2 hours
  } else if (batteryLevel >= 0.3) {
    baseMinutes = 60; // 1 hour
    riskFactors.push('Battery level moderate');
  } else if (batteryLevel >= 0.15) {
    baseMinutes = 30; // 30 minutes
    riskFactors.push('Battery level low');
  } else {
    baseMinutes = 10; // 10 minutes
    riskFactors.push('Battery critically low');
  }

  // 2. PERFORMANCE TIER IMPACT (higher performance = more power draw)
  if (performance.tier >= 4) {
    stressMultiplier *= 1.3; // 30% faster drain
    riskFactors.push('High-performance mode increases power draw');
  } else if (performance.tier <= 2) {
    stressMultiplier *= 0.8; // 20% slower drain
  }

  // 3. SCREEN SIZE IMPACT (larger screen = more power)
  if (deviceInfo.screenSize >= 6.5) {
    stressMultiplier *= 1.2; // 20% faster drain
    riskFactors.push('Large screen increases power consumption');
  }

  // 4. REFRESH RATE IMPACT (higher refresh = more power)
  if (deviceInfo.refreshRate && deviceInfo.refreshRate >= 90) {
    stressMultiplier *= 1.15; // 15% faster drain
    riskFactors.push('High refresh rate increases power draw');
  }

  // 5. BRIGHTNESS ESTIMATE (proxy via pixel density)
  if (deviceInfo.screenScale >= 3) {
    stressMultiplier *= 1.1; // 10% faster drain
  }

  // Calculate final estimated minutes
  let estimatedMinutes = Math.round(baseMinutes / stressMultiplier);
  
  // Ensure reasonable minimum
  estimatedMinutes = Math.max(10, estimatedMinutes);

  // Determine stress level
  let stressLevel: BatteryStressCapability['stressLevel'];
  let tier: number;
  let confidence = 85; // Battery estimates have moderate confidence

  if (estimatedMinutes <= 20) {
    stressLevel = 'Critical';
    tier = 1;
  } else if (estimatedMinutes <= 45) {
    stressLevel = 'High';
    tier = 2;
  } else if (estimatedMinutes <= 90) {
    stressLevel = 'Moderate';
    tier = 3;
  } else {
    stressLevel = 'Low';
    tier = 4;
  }

  // Calculate capability score (inverse of stress)
  const score = Math.min(100, estimatedMinutes * 0.8); // Cap at 100

  return {
    tier,
    score,
    confidence,
    stressLevel,
    estimatedHeavyUsageMinutes: estimatedMinutes,
    riskFactors,
    why: riskFactors.length > 0 ? 
      `Battery stress factors: ${riskFactors.join(', ')}` :
      'Battery in good condition for heavy use',
  };
}