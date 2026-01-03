import { DeviceInfo, RuntimeSignals, CapabilityResult } from './types';
import { calculatePerformanceCapability } from './performanceCapability';

export interface GamingCapability extends CapabilityResult {
  description: string;
  canRunAAA: boolean;
  canRunPopular: boolean;
  recommendedSettings: string[];
}

/**
 * Gaming Capability
 * Can this device handle modern gaming workloads?
 * Factors in both hardware capability and runtime constraints
 */
export function calculateGamingCapability(
  deviceInfo: DeviceInfo,
  runtime: RuntimeSignals
): GamingCapability {
  // Start with base performance capability
  const performance = calculatePerformanceCapability(deviceInfo);
  
  let gamingScore = performance.score;
  let gamingConfidence = performance.confidence;
  const explanations: string[] = [];
  const recommendedSettings: string[] = [];

  // 1. Memory impact on gaming (penalize low RAM)
  if (deviceInfo.totalMemory) {
    const memoryGB = deviceInfo.totalMemory / (1024 * 1024 * 1024);
    if (memoryGB < 3) {
      gamingScore *= 0.6; // Heavy penalty for <3GB
      explanations.push('Very limited RAM for gaming');
      recommendedSettings.push('Close all background apps');
    } else if (memoryGB < 4) {
      gamingScore *= 0.8;
      explanations.push('Limited RAM may cause stutters');
      recommendedSettings.push('Use low texture settings');
    } else if (memoryGB >= 6) {
      explanations.push('Ample RAM for gaming');
    }
  }

  // 2. Refresh rate bonus (if available)
  if (deviceInfo.refreshRate) {
    if (deviceInfo.refreshRate >= 90) {
      gamingScore += 5; // Small bonus for high refresh
      explanations.push('High refresh rate display');
      recommendedSettings.push('Enable high refresh mode if supported');
    }
  }

  // 3. Battery constraint - gaming drains battery fast
  if (runtime.batteryLevel < 0.2) {
    gamingScore *= 0.7; // Severe penalty for low battery
    explanations.push('Very low battery - plug in for gaming');
    recommendedSettings.push('Charge device before gaming');
  } else if (runtime.batteryLevel < 0.5) {
    gamingScore *= 0.9;
    explanations.push('Moderate battery - gaming may drain quickly');
  }

  // 4. Storage space - games need space
  const freeStorageGB = runtime.freeStorage / (1024 * 1024 * 1024);
  if (freeStorageGB < 5) {
    gamingScore *= 0.8;
    explanations.push('Limited storage for game installations');
    recommendedSettings.push('Free up space for game data');
  }

  // Determine capabilities
  const canRunAAA = gamingScore >= 60; // Requires decent performance
  const canRunPopular = gamingScore >= 40; // Lower threshold for popular games

  // Cap scores
  gamingScore = Math.min(Math.max(gamingScore, 0), 100);
  gamingConfidence = Math.min(Math.max(gamingConfidence, 0), 100);

  // Determine tier
  let tier: number;
  if (gamingScore >= 75) tier = 5;
  else if (gamingScore >= 60) tier = 4;
  else if (gamingScore >= 45) tier = 3;
  else if (gamingScore >= 30) tier = 2;
  else tier = 1;

  // Build description
  let description = '';
  if (tier >= 4) {
    description = 'Great for gaming - most games run well';
  } else if (tier >= 3) {
    description = 'Good for casual gaming - popular games work with adjustments';
  } else if (tier >= 2) {
    description = 'Limited gaming - simple games only';
  } else {
    description = 'Not suitable for gaming';
  }

  return {
    tier,
    score: gamingScore,
    confidence: gamingConfidence,
    description,
    canRunAAA,
    canRunPopular,
    recommendedSettings,
    why: explanations.join(' '),
  };
}