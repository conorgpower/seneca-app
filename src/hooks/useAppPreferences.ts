import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const PREFS_KEY = '@seneca_appearance_prefs';

interface AppearancePrefs {
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

const DEFAULT_PREFS: AppearancePrefs = {
  theme: 'dark',
  soundEnabled: true,
  hapticsEnabled: true,
};

let cachedPrefs: AppearancePrefs = DEFAULT_PREFS;
let cacheLoaded = false;

// Load prefs eagerly on import so they're available synchronously ASAP
AsyncStorage.getItem(PREFS_KEY).then((stored) => {
  if (stored) {
    cachedPrefs = { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  }
  cacheLoaded = true;
}).catch(() => {});

/**
 * Hook to access appearance preferences (sound, haptics, theme).
 * Uses a module-level cache so preferences are available quickly.
 */
export function useAppPreferences() {
  const [prefs, setPrefs] = useState<AppearancePrefs>(cachedPrefs);

  useEffect(() => {
    if (!cacheLoaded) {
      AsyncStorage.getItem(PREFS_KEY).then((stored) => {
        if (stored) {
          const parsed = { ...DEFAULT_PREFS, ...JSON.parse(stored) };
          cachedPrefs = parsed;
          setPrefs(parsed);
        }
        cacheLoaded = true;
      }).catch(() => {});
    }
  }, []);

  return prefs;
}

/**
 * Trigger haptic feedback if the user has haptics enabled.
 * Can be called outside of React components.
 */
export function triggerHaptic(
  style: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light'
) {
  if (!cachedPrefs.hapticsEnabled) return;

  switch (style) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
}

/**
 * Check if sound is enabled. Can be called outside of React components.
 */
export function isSoundEnabled(): boolean {
  return cachedPrefs.soundEnabled;
}

/**
 * Update the cached prefs (called from AppearanceSettingsScreen on save).
 */
export function updateCachedPrefs(updated: Partial<AppearancePrefs>) {
  cachedPrefs = { ...cachedPrefs, ...updated };
}
