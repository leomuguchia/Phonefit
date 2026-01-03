// Shared types for all capabilities
export interface DeviceInfo {
  totalMemory?: number;          // bytes
  cpuCount?: number;             // number of CPU cores
  screenSize: number;            // inches (diagonal)
  screenScale: number;           // pixel density
  refreshRate?: number;          // Hz
  osName: string;                // 'iOS' or 'Android'
  platformApiLevel?: number;     // Android API level
  supportedCpuArchitectures?: string[]; // ['arm64-v8a', 'armeabi-v7a', etc.]
}

export interface RuntimeSignals {
  batteryLevel: number;          // 0-1
  freeStorage: number;           // bytes
  hasGyroscope: boolean;
}

export interface CapabilityResult {
  tier: number;                  // 1-5 scale
  score: number;                 // 0-100
  confidence: number;           // 0-100
  why?: string;                 // Human explanation of why this tier
}

export interface FeatureUnlocks {
  unlocked: string[];           // List of unlocked features
  blocked: string[];            // List of blocked features with reasons
}