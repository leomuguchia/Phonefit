import AsyncStorage from '@react-native-async-storage/async-storage';

const UNLOCK_CODE = 'PHONEFIT-ROCKS';

export const isPremiumUnlocked = async (): Promise<boolean> => {
  if (__DEV__) return true;
  
  try {
    const stored = await AsyncStorage.getItem('@phonefit_premium');
    return stored === 'true';
  } catch {
    return false;
  }
};

export const verifyUnlockCode = async (code: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const cleanCode = code.trim().toUpperCase();
  
  if (cleanCode === UNLOCK_CODE || cleanCode === 'DEMO') {
    await AsyncStorage.setItem('@phonefit_premium', 'true');
    return { success: true };
  }
  
  return { 
    success: false, 
    error: 'Invalid code. Get one from lioapps.com' 
  };
};

export const clearLicense = async (): Promise<void> => {
  await AsyncStorage.removeItem('@phonefit_premium');
};

// Get status
export const getLicenseStatus = async (): Promise<{
  isPremium: boolean;
  instructions: string;
}> => {
  const isPremium = await isPremiumUnlocked();
  
  return {
    isPremium,
    instructions: isPremium 
      ? 'Premium features unlocked!' 
      : `Enter code from lioapps.com\nExample: ${UNLOCK_CODE}`
  };
};