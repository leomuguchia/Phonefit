import { BatteryState } from "expo-battery";

export interface DeviceInfo {
  deviceName: string;
  brand: string;
  model: string;
  osName: string;
  osVersion: string;
  platformApiLevel?: number;
  deviceType: string;
  totalMemory?: number;
  supportedCpuArchitectures?: string[];
  cpuCount?: number;
  screenSize: number;
  screenScale: number;
  refreshRate?: number;
}

export interface DeviceCapabilities {
  performance: {
    tier: number;
    score: number;
    description: string;
    confidence: number;
  };
  gaming: {
    tier: number;
    description: string;
    confidence: number;
    canRunAAA: boolean;
    canRunPopular: boolean;
  };
  battery: {
    estimatedUsage: {
      light: string;
      normal: string;
      heavy: string;
    };
    health: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    capacity?: number;
    level: number;
    batteryState: BatteryState;
  };
  storage: {
    total: number;
    free: number;
    used: number;
    humanReadable: {
      movies: string;
      photos: string;
      apps: string;
    };
    percentageFree: number;
  };
  sensors: Array<{
    name: string;
    available: boolean;
    benefit: string;
    icon: string;
  }>;
  dailyUsage: {
    pattern: 'Light' | 'Moderate' | 'Heavy' | 'Power User';
    description: string;
    screenTime: number;
  };
}

export interface CapabilityCardProps {
  title: string;
  icon: string;
  tier?: number;
  description: string;
  confidence: number;
  onPress?: () => void;
  color?: string;
}

export interface SensorCardProps {
  name: string;
  benefit: string;
  available: boolean;
  icon: string;
}

export interface RuntimeSignals {
  batteryLevel: number;
  freeStorage: number;
  totalStorage: number; 
  hasGyroscope: boolean;
  batteryState: BatteryState;
  usedStorage: number;
  hasPedometer: boolean;
}

export interface DeviceContextType {
  deviceInfo: DeviceInfo | null;
  runtimeSignals: RuntimeSignals | null; // Add this
  capabilities: DeviceCapabilities | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export interface PhoneMoment {
  id: string;
  emoji: string;
  title: string;
  description: string;
  priority: number;
  expiresAt: number;
  category?: string;
  suggestion?: string;
  notifyEligible?: boolean;
}