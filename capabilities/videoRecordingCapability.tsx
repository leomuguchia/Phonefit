import { DeviceInfo, RuntimeSignals, CapabilityResult } from './types';
import { calculatePerformanceCapability } from './performanceCapability';

export interface VideoRecordingCapability extends CapabilityResult {
  status: 'Excellent' | 'Good' | 'Risky' | 'Not Recommended';
  limitations: string[];
  recommendations: string[];
}

/**
 * 4K Video Recording Capability
 * Real-world camera usability assessment, not camera specs
 * Conservative assessment focusing on practical constraints
 */
export function calculateVideoRecordingCapability(
  deviceInfo: DeviceInfo,
  runtime: RuntimeSignals
): VideoRecordingCapability {
  const performance = calculatePerformanceCapability(deviceInfo);
  const limitations: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0; // Lower is better

  // 1. HARD REQUIREMENTS (any fails = "Risky" or worse)
  
  // Free storage minimum: 10GB for 4K recording
  const freeStorageGB = runtime.freeStorage / (1024 * 1024 * 1024);
  if (freeStorageGB < 10) {
    riskScore += 50;
    limitations.push(`Only ${freeStorageGB.toFixed(1)}GB free - 4K video requires 10GB+`);
    recommendations.push('Free up storage space');
  }

  // Battery minimum: 30% for reliable recording
  if (runtime.batteryLevel < 0.3) {
    riskScore += 40;
    limitations.push(`Low battery (${Math.round(runtime.batteryLevel * 100)}%) - may interrupt recording`);
    recommendations.push('Charge to at least 50% before recording');
  }

  // Performance requirement: Tier 3+ for 4K processing
  if (performance.tier < 3) {
    riskScore += 30;
    limitations.push('Processor may struggle with 4K encoding');
    recommendations.push('Consider recording in 1080p instead');
  }

  // Gyroscope for stabilization (not required but important)
  if (!runtime.hasGyroscope) {
    riskScore += 20;
    limitations.push('No gyroscope - video stabilization limited');
    recommendations.push('Use a tripod or stable surface');
  }

  // 2. ADDITIONAL FACTORS
  
  // Memory for video buffer
  if (deviceInfo.totalMemory) {
    const memoryGB = deviceInfo.totalMemory / (1024 * 1024 * 1024);
    if (memoryGB < 3) {
      riskScore += 15;
      limitations.push('Limited RAM may cause dropped frames');
    }
  }

  // Thermal considerations (proxy: screen size * performance)
  const thermalRisk = deviceInfo.screenSize * performance.tier;
  if (thermalRisk > 20) {
    riskScore += 10;
    limitations.push('Device may heat up during extended 4K recording');
    recommendations.push('Record in shorter clips');
  }

  // 3. CALCULATE FINAL STATUS
  
  let status: VideoRecordingCapability['status'];
  let tier: number;
  let confidence: number;

  if (riskScore >= 80) {
    status = 'Not Recommended';
    tier = 1;
    confidence = 90; // High confidence it won't work well
  } else if (riskScore >= 50) {
    status = 'Risky';
    tier = 2;
    confidence = 75;
  } else if (riskScore >= 25) {
    status = 'Good';
    tier = 3;
    confidence = 85;
  } else {
    status = 'Excellent';
    tier = 4;
    confidence = 90;
  }

  // Convert risk score to capability score (inverse)
  const score = Math.max(0, 100 - riskScore);

  return {
    tier,
    score,
    confidence,
    status,
    limitations,
    recommendations,
    why: riskScore > 0 ? 
      `Recording capability affected by: ${limitations.join(', ')}` :
      'All requirements met for stable 4K recording',
  };
}