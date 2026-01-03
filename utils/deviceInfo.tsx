// DeviceProvider.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dimensions, Platform, AppState } from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as Sensors from 'expo-sensors';
import { ScoringEngine } from './scoringEngine';
import { SensorMapper } from './sensorMapper';
import { buildCapabilities } from '../capabilities/capabilityEngine';
import { getStorageInfo } from './storageutils';
import type { DeviceInfo, DeviceCapabilities, RuntimeSignals } from '../types';

interface DeviceContextType {
  deviceInfo: DeviceInfo | null;
  runtimeSignals: RuntimeSignals | null;
  capabilities: DeviceCapabilities | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextType>({
  deviceInfo: null,
  runtimeSignals: null,
  capabilities: null,
  loading: true,
  refresh: async () => {},
});

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [runtimeSignals, setRuntimeSignals] = useState<RuntimeSignals | null>(null);
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  const getDeviceInfo = useCallback(() => {
    const { width, height } = Dimensions.get('screen');
    const pixelDensity = Dimensions.get('screen').scale;
    
    let cpuCount: number | undefined;
    try {
      if (Device.supportedCpuArchitectures?.length) {
        cpuCount = Device.supportedCpuArchitectures.length * 2;
      } else {
        cpuCount = Device.osName === 'Android' ? 
          (Device.brand?.toLowerCase().includes('samsung') ? 8 : 4) : 
          (Device.modelName?.includes('Pro') ? 6 : 4);
      }
    } catch (error) {
      console.warn('Could not get CPU count:', error);
      cpuCount = 4;
    }

    let refreshRate: number | undefined;
    try {
      if (Device.modelName?.match(/Pro|Ultra|Plus/i)) {
        refreshRate = 120;
      } else if (Device.brand?.toLowerCase().includes('samsung')) {
        refreshRate = Device.modelName?.match(/S2[1-9]|Note|Fold/i) ? 120 : 60;
      } else {
        refreshRate = 60;
      }
    } catch (error) {
      console.warn('Could not get refresh rate:', error);
      refreshRate = 60;
    }

    return {
      deviceName: Device.deviceName ?? 'Unknown Device',
      brand: Device.brand ?? 'Unknown',
      model: Device.modelName ?? 'Unknown Model',
      osName: Device.osName ?? 'Android',
      osVersion: Device.osVersion ?? '',
      platformApiLevel: Device.platformApiLevel ?? undefined,
      deviceType: Device.deviceType != null ? Device.DeviceType[Device.deviceType] : 'PHONE',
      totalMemory: Device.totalMemory ?? undefined,
      supportedCpuArchitectures: Device.supportedCpuArchitectures ?? undefined,
      cpuCount,
      screenSize: Math.sqrt(
        Math.pow(width / pixelDensity, 2) + 
        Math.pow(height / pixelDensity, 2)
      ) / 160,
      screenScale: pixelDensity,
      refreshRate,
    };
  }, []);

  const getBatteryInfo = useCallback(async () => {
    let batteryLevel = 1;
    let batteryState = null;
    
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
      batteryState = await Battery.getBatteryStateAsync();
    } catch (batteryError) {
      console.warn('Battery info unavailable:', batteryError);
      // Estimate based on device age
      const model = Device.modelName || '';
      const isNewDevice = !model.match(/X|8|9|10/i);
      batteryLevel = isNewDevice ? 0.85 : 0.65;
    }
    
    return { batteryLevel, batteryState };
  }, []);

  const getSensorInfo = useCallback(async (deviceModel: string) => {
    let hasGyroscope = false;
    let hasAccelerometer = false;
    
    try {
      hasGyroscope = await Sensors.Gyroscope.isAvailableAsync();
      hasAccelerometer = await Sensors.Accelerometer.isAvailableAsync();
    } catch (sensorError) {
      console.warn('Sensor detection failed:', sensorError);
      hasGyroscope = !deviceModel?.match(/lite|a[0-9]|e[0-9]/i);
      hasAccelerometer = true;
    }

    let sensors: { name: string; available: boolean; benefit: string; icon: string; }[] = [];
    try {
      const rawSensors = await SensorMapper.detectAvailableSensors();
      sensors = await Promise.all(rawSensors.map(async (sensor) => {
        try {
          const available = await Promise.resolve(sensor.available).catch(() => false);
          return { ...sensor, available };
        } catch {
          return { ...sensor, available: false };
        }
      }));
    } catch (sensorError) {
      console.warn('Sensor detection failed:', sensorError);
      sensors = [
        { name: 'Accelerometer', available: hasAccelerometer, benefit: 'Motion detection', icon: 'move' },
        { name: 'Gyroscope', available: hasGyroscope, benefit: 'Rotation sensing', icon: 'refresh' },
        { name: 'Magnetometer', available: false, benefit: 'Compass functionality', icon: 'compass' },
      ];
    }

    return { hasGyroscope, sensors };
  }, []);

  const getCapabilities = useCallback((
    info: DeviceInfo, 
    runtime: RuntimeSignals, 
    sensors: { name: string; available: boolean; benefit: string; icon: string; }[]
  ): DeviceCapabilities => {
    try {
      const newCapabilities = buildCapabilities(info, runtime);
      
      const patternMap: { [key: string]: 'Light' | 'Moderate' | 'Heavy' | 'Power User' } = {
        'Light': 'Light',
        'Moderate': 'Moderate',
        'Power': 'Power User',
        'Extreme': 'Power User',
      };
      
      // Calculate human readable storage info
      const humanReadable = ScoringEngine.calculateStorageHumanReadable(runtime.freeStorage);
      
      return {
        performance: {
          tier: newCapabilities.performance.tier,
          score: newCapabilities.performance.score,
          description: newCapabilities.performance.why || `Your phone is ${newCapabilities.performance.tier >= 4 ? 'quite' : ''} capable`,
          confidence: newCapabilities.performance.confidence,
        },
        gaming: {
          tier: newCapabilities.gaming.tier,
          description: newCapabilities.gaming.description,
          confidence: newCapabilities.gaming.confidence,
          canRunAAA: newCapabilities.gaming.canRunAAA,
          canRunPopular: newCapabilities.gaming.canRunPopular,
        },
        battery: {
          estimatedUsage: ScoringEngine.estimateBatteryUsage(4000),
          health: runtime.batteryLevel > 0.8 ? 'Excellent' : 
                 runtime.batteryLevel > 0.6 ? 'Good' : 
                 runtime.batteryLevel > 0.4 ? 'Fair' : 'Poor',
          capacity: 4000,
          level: runtime.batteryLevel,
          batteryState: runtime.batteryState
        },
        storage: {
          total: runtime.totalStorage,
          free: runtime.freeStorage,
          used: runtime.usedStorage,  // Now using runtime.usedStorage
          humanReadable: humanReadable,  // Use the calculated human readable
          percentageFree: (runtime.freeStorage / runtime.totalStorage) * 100
        },
        sensors,
        dailyUsage: {
          pattern: patternMap[newCapabilities.dailyUsage.pattern] || 'Moderate',
          description: newCapabilities.dailyUsage.why || 'Daily usage pattern',
          screenTime: newCapabilities.dailyUsage.screenTime,
        },
      };
    } catch (error) {
      console.warn('New capability engine failed, using fallback:', error);
      
      // Fallback to old scoring engine
      const perfTier = ScoringEngine.calculatePerformanceTier(info);
      const gamingTier = ScoringEngine.calculateGamingTier(info);
      const gamingInfo = ScoringEngine.getGamingDescription(gamingTier);
      const confidence = ScoringEngine.getConfidenceScore(info);
      const dailyUsage = ScoringEngine.calculateDailyUsagePattern(info);
      
      // Calculate human readable storage info for fallback
      const humanReadable = ScoringEngine.calculateStorageHumanReadable(runtime.freeStorage);

      return {
        performance: {
          tier: perfTier,
          score: confidence,
          description: `Your phone is ${perfTier >= 4 ? 'quite' : ''} capable`,
          confidence,
        },
        gaming: {
          tier: gamingTier,
          description: gamingInfo.description,
          confidence: Math.max(confidence - 10, 60),
          canRunAAA: gamingInfo.canRunAAA,
          canRunPopular: gamingInfo.canRunPopular,
        },
        battery: {
          estimatedUsage: ScoringEngine.estimateBatteryUsage(4000),
          health: runtime.batteryLevel > 0.8 ? 'Excellent' : 
                 runtime.batteryLevel > 0.6 ? 'Good' : 
                 runtime.batteryLevel > 0.4 ? 'Fair' : 'Poor',
          capacity: 4000,
          level: runtime.batteryLevel,
          batteryState: runtime.batteryState
        },
        storage: {
          total: runtime.totalStorage,
          free: runtime.freeStorage,
          used: runtime.usedStorage,  // Now using runtime.usedStorage
          humanReadable: humanReadable,  // Use the calculated human readable
          percentageFree: (runtime.freeStorage / runtime.totalStorage) * 100
        },
        sensors,
        dailyUsage,
      };
    }
  }, []);

  const loadDeviceInfo = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Get device hardware info
      const info = getDeviceInfo();
      setDeviceInfo(info);

      // 2. Get battery info
      const { batteryLevel, batteryState } = await getBatteryInfo();
      
      // 3. Get storage info (using the separate utility)
      const { freeStorage, totalStorage, usedStorage } = await getStorageInfo();
      
      // 4. Get sensor info
      const { hasGyroscope, sensors } = await getSensorInfo(info.model);
      
      // 5. Create runtime signals
      const runtime: RuntimeSignals = {
        batteryLevel,
        freeStorage,
        totalStorage,
        usedStorage,  // Add this
        hasGyroscope,
        batteryState: batteryState || 'unknown'
      };
      setRuntimeSignals(runtime);

      // 6. Calculate capabilities
      const caps = getCapabilities(info, runtime, sensors);
      setCapabilities(caps);
      
      // Log final storage values for debugging
      console.log('📱 Device info loaded successfully');
      console.log('📊 Final storage values:', {
        freeGB: (freeStorage / (1024 * 1024 * 1024)).toFixed(2),
        totalGB: (totalStorage / (1024 * 1024 * 1024)).toFixed(2),
        usedGB: (usedStorage / (1024 * 1024 * 1024)).toFixed(2),
        freePercentage: ((freeStorage / totalStorage) * 100).toFixed(1) + '%'
      });
      
    } catch (error) {
      console.error('Critical error loading device info:', error);
      
      // Provide minimal fallback data
      const total = 64 * 1024 * 1024 * 1024;
      const free = 32 * 1024 * 1024 * 1024;
      const used = 32 * 1024 * 1024 * 1024;
      const humanReadable = ScoringEngine.calculateStorageHumanReadable(free);
      
      const minimalInfo: DeviceInfo = {
        deviceName: 'Unknown Device',
        brand: 'Unknown',
        model: 'Unknown',
        osName: Platform.OS === 'ios' ? 'iOS' : 'Android',
        osVersion: '',
        deviceType: 'PHONE',
        cpuCount: 4,
        screenSize: 6,
        screenScale: 2,
        refreshRate: 60,
      };
      
      const minimalCaps: DeviceCapabilities = {
        performance: {
          tier: 3,
          score: 70,
          description: 'Standard smartphone capabilities',
          confidence: 70,
        },
        gaming: {
          tier: 3,
          description: 'Can run most mobile games',
          confidence: 65,
          canRunAAA: false,
          canRunPopular: true,
        },
        battery: {
          estimatedUsage: {
            light: '10 hrs',
            normal: '7 hrs',
            heavy: '4 hrs',
          },
          health: 'Good',
          capacity: 4000,
          level: 0.75,
          batteryState: Battery.BatteryState.UNPLUGGED
        },
        storage: {
          total,
          free,
          used,
          humanReadable,  // Now includes movies, photos, apps
          percentageFree: 50
        },
        sensors: [],
        dailyUsage: {
          pattern: 'Moderate',
          description: 'Average smartphone usage',
          screenTime: 4,
        },
      };
      
      setDeviceInfo(minimalInfo);
      setCapabilities(minimalCaps);
    } finally {
      setLoading(false);
    }
  }, [getDeviceInfo, getBatteryInfo, getSensorInfo, getCapabilities]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadDeviceInfo();
      }
    });

    return () => subscription.remove();
  }, [loadDeviceInfo]);

  // Initial load
  useEffect(() => {
    loadDeviceInfo();
  }, [loadDeviceInfo]);

  return (
    <DeviceContext.Provider value={{ 
      deviceInfo, 
      runtimeSignals, 
      capabilities, 
      loading, 
      refresh: loadDeviceInfo 
    }}>
      {children}
    </DeviceContext.Provider>
  );
};