import { DeviceInfo, CapabilityResult } from './types';

/**
 * Overall Performance Capability
 * Measures general responsiveness & multitasking ability
 * Conservative by design - assumes baseline performance for safety
 */
export function calculatePerformanceCapability(
  deviceInfo: DeviceInfo
): CapabilityResult {
  let score = 0;
  let confidence = 100;
  const explanations: string[] = [];

  // 1. Memory Score (0-40 points)
  if (deviceInfo.totalMemory) {
    const memoryGB = deviceInfo.totalMemory / (1024 * 1024 * 1024);
    if (memoryGB >= 8) {
      score += 40;
      explanations.push('Plenty of RAM for heavy multitasking');
    } else if (memoryGB >= 6) {
      score += 30;
      explanations.push('Good RAM for most daily tasks');
    } else if (memoryGB >= 4) {
      score += 20;
      explanations.push('Adequate RAM for basic multitasking');
    } else if (memoryGB >= 3) {
      score += 10;
      explanations.push('Limited RAM may slow multitasking');
    } else {
      score += 5;
      explanations.push('Very limited RAM - keep few apps open');
    }
  } else {
    confidence -= 20;
    explanations.push('RAM info unavailable - assuming baseline');
    score += 5; // Minimum baseline
  }

  // 2. CPU Score (0-35 points)
  if (deviceInfo.cpuCount) {
    const cores = deviceInfo.cpuCount;
    const is64Bit = deviceInfo.supportedCpuArchitectures?.some(arch => 
      arch.includes('64') || arch.includes('arm64')
    ) || false;

    if (cores >= 8 && is64Bit) {
      score += 35;
      explanations.push('Modern multi-core 64-bit processor');
    } else if (cores >= 6) {
      score += 25;
      explanations.push('Good CPU for most tasks');
    } else if (cores >= 4) {
      score += 15;
      explanations.push('Standard quad-core processor');
    } else {
      score += 8;
      explanations.push('Basic processor - may struggle with complex tasks');
    }
  } else {
    confidence -= 20;
    explanations.push('CPU info unavailable - assuming baseline');
    score += 8;
  }

  // 3. Display Complexity Score (0-25 points)
  // Higher pixel density = more GPU load
  const pixelDensity = deviceInfo.screenScale;
  if (pixelDensity >= 3) {
    score += 15; // Slightly penalize ultra-high density for performance
    explanations.push('Very high resolution - may impact performance');
  } else if (pixelDensity >= 2) {
    score += 20;
    explanations.push('Standard high-resolution display');
  } else {
    score += 25;
    explanations.push('Efficient display resolution');
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine tier (1-5)
  let tier: number;
  if (score >= 85) tier = 5;
  else if (score >= 70) tier = 4;
  else if (score >= 50) tier = 3;
  else if (score >= 30) tier = 2;
  else tier = 1;

  // Adjust confidence based on missing data
  if (!deviceInfo.totalMemory || !deviceInfo.cpuCount) {
    confidence = Math.max(confidence, 60); // Cap at 60 if missing critical data
  }

  return {
    tier,
    score,
    confidence,
    why: explanations.join(' '),
  };
}