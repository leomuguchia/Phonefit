import { TIERS } from '../constants/tiers';
import type { DeviceInfo } from '../types';

export class ScoringEngine {
  static calculatePerformanceTier(deviceInfo: DeviceInfo): number {
    let score = 0;
    
    // CPU Score (0-30 points)
    const cpuCores = deviceInfo.cpuCount || 4;
    const cpuArch = deviceInfo.supportedCpuArchitectures?.[0] || 'armeabi-v7a';
    
    if (cpuArch.includes('arm64')) {
      score += 20;
    } else if (cpuArch.includes('arm')) {
      score += 15;
    } else {
      score += 10;
    }
    
    if (cpuCores >= 8) score += 10;
    else if (cpuCores >= 6) score += 7;
    else if (cpuCores >= 4) score += 5;
    else score += 2;
    
    // RAM Score (0-25 points)
    const totalMemoryGB = (deviceInfo.totalMemory || 2 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024);
    if (totalMemoryGB >= 8) score += 25;
    else if (totalMemoryGB >= 6) score += 20;
    else if (totalMemoryGB >= 4) score += 15;
    else if (totalMemoryGB >= 3) score += 10;
    else score += 5;
    
    // Android Version Score (0-15 points)
    const androidVersion = parseFloat(deviceInfo.osVersion) || 8;
    if (androidVersion >= 14) score += 15;
    else if (androidVersion >= 12) score += 12;
    else if (androidVersion >= 10) score += 9;
    else if (androidVersion >= 8) score += 6;
    else score += 3;
    
    // Storage Type Score (0-15 points)
    // Assume UFS storage for newer devices
    if (androidVersion >= 10) score += 10;
    else score += 5;
    
    // Screen Refresh Rate (0-15 points)
    const refreshRate = deviceInfo.refreshRate || 60;
    if (refreshRate >= 120) score += 15;
    else if (refreshRate >= 90) score += 10;
    else score += 5;
    
    // Determine Tier based on total score (max 100)
    if (score >= 90) return 7; // Flagship
    if (score >= 80) return 6; // Very Strong
    if (score >= 65) return 5; // Strong
    if (score >= 50) return 4; // Capable
    if (score >= 35) return 3; // Comfortable
    if (score >= 20) return 2; // Everyday
    return 1; // Minimal
  }
  
  static calculateGamingTier(deviceInfo: DeviceInfo): number {
    const perfTier = this.calculatePerformanceTier(deviceInfo);
    
    // Gaming tier is usually 1-2 tiers below performance tier for lower tiers
    if (perfTier <= 2) return 1;
    if (perfTier === 3) return 2;
    if (perfTier === 4) return 3;
    if (perfTier === 5) return 4;
    if (perfTier === 6) return 5;
    return 6; // Max gaming tier is 6 (even flagship has some limits)
  }
  
  static getGamingDescription(tier: number): { canRunAAA: boolean; canRunPopular: boolean; description: string } {
    switch (tier) {
      case 1:
        return { canRunAAA: false, canRunPopular: false, description: 'Basic games only' };
      case 2:
        return { canRunAAA: false, canRunPopular: false, description: 'Simple casual games' };
      case 3:
        return { canRunAAA: false, canRunPopular: true, description: 'Most popular games on low settings' };
      case 4:
        return { canRunAAA: false, canRunPopular: true, description: 'Popular games at medium settings' };
      case 5:
        return { canRunAAA: true, canRunPopular: true, description: 'AAA games with reduced graphics' };
      case 6:
        return { canRunAAA: true, canRunPopular: true, description: 'High-end gaming at good settings' };
      default:
        return { canRunAAA: true, canRunPopular: true, description: 'Excellent gaming performance' };
    }
  }
  
  static estimateBatteryUsage(batteryCapacity?: number): { light: string; normal: string; heavy: string } {
    const capacity = batteryCapacity || 4000; // Default 4000mAh
    
    // Rough estimates based on capacity
    const lightHours = Math.round((capacity / 200) * 10) / 10; // 5mA per hour for light
    const normalHours = Math.round((capacity / 300) * 10) / 10; // 7.5mA per hour for normal
    const heavyHours = Math.round((capacity / 500) * 10) / 10; // 12.5mA per hour for heavy
    
    return {
      light: `${lightHours} hours for light use`,
      normal: `${normalHours} hours for typical use`,
      heavy: `${heavyHours} hours for intensive use`,
    };
  }
  
  static calculateStorageHumanReadable(freeBytes: number) {
    const freeGB = freeBytes / (1024 * 1024 * 1024);
    
    // Rough estimates
    const movies = Math.floor(freeGB / 1.5); // 1.5GB per HD movie
    const photos = Math.floor(freeGB * 300); // 3.3MB per photo
    const apps = Math.floor(freeGB / 0.1); // 100MB per app average
    
    return {
      movies: movies > 0 ? `Space for ${movies} HD movies` : 'Limited movie storage',
      photos: photos > 0 ? `Room for ${photos.toLocaleString()} photos` : 'Limited photo storage',
      apps: apps > 0 ? `Fits ${apps} average apps` : 'Limited app storage',
    };
  }
  
  // Update the calculateDailyUsagePattern method:
static calculateDailyUsagePattern(deviceInfo: DeviceInfo): { 
  pattern: 'Light' | 'Moderate' | 'Heavy' | 'Power User'; 
  description: string; 
  screenTime: string; 
} {
  const perfTier = this.calculatePerformanceTier(deviceInfo);
  const memoryGB = (deviceInfo.totalMemory || 2 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024);
  
  if (perfTier >= 6 && memoryGB >= 8) {
    return {
      pattern: 'Power User',
      description: 'Great for multitasking, gaming, and creative work',
      screenTime: '5-8+ hours daily',
    };
  } else if (perfTier >= 4) {
    return {
      pattern: 'Heavy',
      description: 'Good for streaming, social media, and moderate gaming',
      screenTime: '4-6 hours daily',
    };
  } else if (perfTier >= 2) {
    return {
      pattern: 'Moderate',
      description: 'Ideal for browsing, messaging, and light media',
      screenTime: '3-5 hours daily',
    };
  } else {
    return {
      pattern: 'Light',
      description: 'Best for calls, messages, and essential apps',
      screenTime: '2-4 hours daily',
    };
  }
}
  
  static getConfidenceScore(deviceInfo: DeviceInfo): number {
    // Calculate confidence based on how much info we have
    let confidence = 70; // Base confidence
    
    if (deviceInfo.totalMemory) confidence += 10;
    if (deviceInfo.cpuCount) confidence += 10;
    if (deviceInfo.supportedCpuArchitectures?.length) confidence += 5;
    if (deviceInfo.refreshRate) confidence += 5;
    
    return Math.min(confidence, 95); // Cap at 95%
  }
}