import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FocusLockService from '../services/focus-lock.service';
import * as AchievementsService from '../services/achievements.service';
import { useAuth } from './AuthContext';

const AUTH_CACHE_KEY = 'focuslock_authorized';

interface FocusLockContextType {
  isSupported: boolean;
  isAuthorized: boolean;
  isLocked: boolean;
  appCount: number;
  appNames: string[];
  unlockedToday: boolean;
  loading: boolean;
  requestAuthorization: () => Promise<boolean>;
  openAppPicker: () => Promise<void>;
  lockApps: () => Promise<void>;
  unlockApps: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const FocusLockContext = createContext<FocusLockContextType | undefined>(undefined);

export function FocusLockProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [appCount, setAppCount] = useState(0);
  const [appNames, setAppNames] = useState<string[]>([]);
  const [unlockedToday, setUnlockedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSupported = FocusLockService.isFocusLockSupported();

  const refreshStatus = useCallback(async () => {
    if (!isSupported) return;

    const [authStatus, lockStatus, names] = await Promise.all([
      FocusLockService.getAuthorizationStatus(),
      FocusLockService.getLockStatus(),
      FocusLockService.getSelectedAppNames(),
    ]);

    console.log('[FocusLock] refreshStatus — authStatus:', authStatus, 'lockStatus:', JSON.stringify(lockStatus), 'names:', names);

    // Only update auth state for definitive responses from the native module
    if (authStatus === 'approved') {
      setIsAuthorized(true);
      AsyncStorage.setItem(AUTH_CACHE_KEY, 'true');
    } else if (authStatus === 'denied') {
      setIsAuthorized(false);
      AsyncStorage.setItem(AUTH_CACHE_KEY, 'false');
    }
    // For 'unknown'/'notDetermined'/'unsupported', keep the cached value

    setIsLocked(lockStatus.isEnabled);
    setAppCount(lockStatus.appCount);
    setAppNames(names);

    if (lockStatus.unlockedDate) {
      const today = new Date().toISOString().split('T')[0];
      const unlockDay = lockStatus.unlockedDate.split('T')[0];
      setUnlockedToday(today === unlockDay);
    } else {
      setUnlockedToday(false);
    }
  }, [isSupported]);

  // Load cached auth state first, then refresh from native module
  useEffect(() => {
    const init = async () => {
      const cached = await AsyncStorage.getItem(AUTH_CACHE_KEY);
      if (cached === 'true') {
        setIsAuthorized(true);
      }
      await refreshStatus();
      setLoading(false);
    };
    init();
  }, [refreshStatus]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        refreshStatus();
      }
    });
    return () => subscription.remove();
  }, [refreshStatus]);

  const requestAuthorization = useCallback(async () => {
    const result = await FocusLockService.requestFocusLockAuthorization();
    setIsAuthorized(result);
    AsyncStorage.setItem(AUTH_CACHE_KEY, result ? 'true' : 'false');
    return result;
  }, []);

  const openAppPicker = useCallback(async () => {
    const result = await FocusLockService.presentAppPicker();
    console.log('[FocusLock] openAppPicker result:', JSON.stringify(result));
    if (result) {
      setAppCount(result.appCount);
      // Native side auto-locks on selection — update locked state
      if (result.appCount > 0) {
        setIsLocked(true);
        setUnlockedToday(false);
      } else {
        setIsLocked(false);
      }
      const names = await FocusLockService.getSelectedAppNames();
      console.log('[FocusLock] openAppPicker — appCount:', result.appCount, 'names:', names);
      setAppNames(names);
    }
  }, []);

  const lockAppsHandler = useCallback(async () => {
    const success = await FocusLockService.lockApps();
    if (success) {
      setIsLocked(true);
      if (user) {
        AchievementsService.checkAchievements(user.id, 'focus').catch(console.error);
      }
    }
  }, [user]);

  const unlockAppsHandler = useCallback(async () => {
    const success = await FocusLockService.unlockApps();
    if (success) {
      setIsLocked(false);
      setUnlockedToday(true);
    }
  }, []);

  return (
    <FocusLockContext.Provider
      value={{
        isSupported,
        isAuthorized,
        isLocked,
        appCount,
        appNames,
        unlockedToday,
        loading,
        requestAuthorization,
        openAppPicker,
        lockApps: lockAppsHandler,
        unlockApps: unlockAppsHandler,
        refreshStatus,
      }}
    >
      {children}
    </FocusLockContext.Provider>
  );
}

export function useFocusLock() {
  const context = useContext(FocusLockContext);
  if (!context) {
    throw new Error('useFocusLock must be used within FocusLockProvider');
  }
  return context;
}
