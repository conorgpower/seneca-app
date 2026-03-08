import { NativeModules, Platform } from 'react-native';

interface FocusLockNativeModule {
  requestAuthorization(): Promise<boolean>;
  getAuthorizationStatus(): Promise<'approved' | 'denied' | 'notDetermined' | 'unknown'>;
  presentAppPicker(): Promise<{ appCount: number } | null>;
  lockApps(): Promise<boolean>;
  unlockApps(): Promise<boolean>;
  relockIfNewDay(): Promise<boolean>;
  getLockStatus(): Promise<{
    isEnabled: boolean;
    appCount: number;
    unlockedDate: string | null;
  }>;
  getSelectedAppNames(): Promise<string[]>;
}

const { FocusLockModule } = NativeModules as {
  FocusLockModule?: FocusLockNativeModule;
};

const isSupported = Platform.OS === 'ios' && !!FocusLockModule;

export function isFocusLockSupported(): boolean {
  return isSupported;
}

export async function requestFocusLockAuthorization(): Promise<boolean> {
  if (!isSupported) return false;
  try {
    return await FocusLockModule!.requestAuthorization();
  } catch (error) {
    console.error('[FocusLock] Authorization error:', error);
    return false;
  }
}

export async function getAuthorizationStatus(): Promise<string> {
  if (!isSupported) return 'unsupported';
  try {
    return await FocusLockModule!.getAuthorizationStatus();
  } catch (error) {
    console.error('[FocusLock] Status check error:', error);
    return 'unknown';
  }
}

export async function presentAppPicker(): Promise<{ appCount: number } | null> {
  if (!isSupported) return null;
  try {
    return await FocusLockModule!.presentAppPicker();
  } catch (error) {
    console.error('[FocusLock] App picker error:', error);
    return null;
  }
}

export async function lockApps(): Promise<boolean> {
  if (!isSupported) return false;
  try {
    return await FocusLockModule!.lockApps();
  } catch (error) {
    console.error('[FocusLock] Lock error:', error);
    return false;
  }
}

export async function unlockApps(): Promise<boolean> {
  if (!isSupported) return false;
  try {
    return await FocusLockModule!.unlockApps();
  } catch (error) {
    console.error('[FocusLock] Unlock error:', error);
    return false;
  }
}

export async function getLockStatus(): Promise<{
  isEnabled: boolean;
  appCount: number;
  unlockedDate: string | null;
}> {
  if (!isSupported) return { isEnabled: false, appCount: 0, unlockedDate: null };
  try {
    return await FocusLockModule!.getLockStatus();
  } catch (error) {
    console.error('[FocusLock] Get status error:', error);
    return { isEnabled: false, appCount: 0, unlockedDate: null };
  }
}

export async function relockIfNewDay(): Promise<boolean> {
  if (!isSupported) return false;
  try {
    return await FocusLockModule!.relockIfNewDay();
  } catch (error) {
    console.error('[FocusLock] Relock error:', error);
    return false;
  }
}

export async function getSelectedAppNames(): Promise<string[]> {
  if (!isSupported) return [];
  try {
    return await FocusLockModule!.getSelectedAppNames();
  } catch (error) {
    console.error('[FocusLock] Get app names error:', error);
    return [];
  }
}
