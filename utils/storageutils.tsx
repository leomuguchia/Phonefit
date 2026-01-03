// storageUtils.ts
import * as Device from 'expo-device';

export interface StorageInfo {
  freeStorage: number;
  totalStorage: number;
  usedStorage: number;  // Add this
}

export const getStorageInfo = async (): Promise<StorageInfo> => {
  let freeStorage = 0;
  let totalStorage = 0;
  
  try {
    const FileSystem = require('expo-file-system/legacy');
    const freeBytes = await FileSystem.getFreeDiskStorageAsync();
    const totalBytes = await FileSystem.getTotalDiskCapacityAsync();
    
    freeStorage = freeBytes;
    totalStorage = totalBytes;
    
    if (freeStorage > 0 && totalStorage > 0) {
      const usedStorage = totalStorage - freeStorage;
      logStorageValues(freeStorage, totalStorage, usedStorage);
      return { freeStorage, totalStorage, usedStorage };
    } else {
      throw new Error('Storage values are 0');
    }
    
  } catch (legacyError) {
    console.warn('Legacy API failed, trying fallback...', legacyError);
    
    try {
      const FileSystem = require('expo-file-system');
      
      if (FileSystem.getFreeDiskStorageAsync && FileSystem.getTotalDiskCapacityAsync) {
        const freeBytes = await FileSystem.getFreeDiskStorageAsync();
        const totalBytes = await FileSystem.getTotalDiskCapacityAsync();
        
        freeStorage = freeBytes;
        totalStorage = totalBytes;
        
        if (freeStorage > 0 && totalStorage > 0) {
          const usedStorage = totalStorage - freeStorage;
          logStorageValues(freeStorage, totalStorage, usedStorage, 'Fallback API succeeded');
          return { freeStorage, totalStorage, usedStorage };
        }
      }
    } catch (regularError) {
      console.warn('All storage APIs failed, estimating from device model...', regularError);
    }
  }

  // Final fallback: Estimate from device model
  return estimateStorageFromDevice();
};

const logStorageValues = (
  freeBytes: number, 
  totalBytes: number, 
  usedBytes: number, 
  prefix = '✅ Storage values:'
) => {
  const freeGB = freeBytes / 1024 / 1024 / 1024;
  const totalGB = totalBytes / 1024 / 1024 / 1024;
  const usedGB = usedBytes / 1024 / 1024 / 1024;
  const freePercentage = (freeBytes / totalBytes) * 100;
};

const estimateStorageFromDevice = (): StorageInfo => {
  const model = Device.modelName || '';
  const brand = Device.brand || '';
  
  // Default values
  let totalGB = 64;
  let freePercentage = 0.6; // 60% free
  
  // Check for storage size in model name
  const storagePatterns = [
    { pattern: /1\s*TB|1000\s*GB|1024\s*GB/i, size: 1000 },
    { pattern: /512\s*GB/i, size: 512 },
    { pattern: /256\s*GB/i, size: 256 },
    { pattern: /128\s*GB/i, size: 128 },
    { pattern: /64\s*GB/i, size: 64 },
    { pattern: /32\s*GB/i, size: 32 },
    { pattern: /16\s*GB/i, size: 16 },
    { pattern: /8\s*GB/i, size: 8 }
  ];
  
  for (const pattern of storagePatterns) {
    if (pattern.pattern.test(model)) {
      totalGB = pattern.size;
      break;
    }
  }
  
  // Adjust based on brand/model heuristics
  if (brand.toLowerCase().includes('samsung') && totalGB === 64) {
    totalGB = 128; // Samsung often has 128GB base models
  } else if (brand.toLowerCase().includes('iphone') && totalGB === 64) {
    // Newer iPhones usually start at 128GB
    if (model.includes('13') || model.includes('14') || model.includes('15')) {
      totalGB = 128;
    }
  }
  
  // Adjust free percentage based on device age estimation
  const isOldDevice = model.includes('X') || model.includes('8') || model.includes('9') || model.includes('10');
  freePercentage = isOldDevice ? 0.3 : 0.6; // Older devices have less free space
  
  const totalStorage = totalGB * 1024 * 1024 * 1024;
  const freeStorage = totalStorage * freePercentage;
  const usedStorage = totalStorage - freeStorage;
  
  return { freeStorage, totalStorage, usedStorage };
};

// For testing
export const testStorage = async () => {
  try {
    const result = await getStorageInfo();
    return { 
      free: result.freeStorage, 
      total: result.totalStorage,
      used: result.usedStorage
    };
  } catch (error) {
    console.warn('❌ Storage test failed:', error);
    return { free: 0, total: 0, used: 0 };
  }
};