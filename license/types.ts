// utils/license/types.ts
export interface LicenseFeature {
  id: string;
  name: string;
  description: string;
  tierRequired: number;
  requiresCode: boolean;
}

export interface LicenseType {
  id: 'free' | 'basic' | 'premium' | 'ultimate';
  name: string;
  price: number; // In USD
  features: string[]; // Feature IDs
  codePrefix: string;
}

export interface LicenseStatus {
  type: LicenseType['id'];
  isActive: boolean;
  activatedAt: Date | null;
  expiresAt: Date | null;
  code: string | null;
  unlockedFeatures: string[];
}

export interface MotionPath {
  id: string;
  name: string;
  steps: MotionStep[];
  startTime: Date;
  endTime: Date;
  distance: number; // Estimated meters
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface MotionStep {
  timestamp: number;
  heading: number; // Degrees from north (0-360)
  acceleration: { x: number; y: number; z: number };
  rotation: { alpha: number; beta: number; gamma: number }; // Gyroscope
  confidence: number; // 0-100 how certain we are about this reading
}