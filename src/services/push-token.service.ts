import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Register the device's Expo Push Token with Supabase.
 * Call this after the user signs in or when the app starts.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push tokens are not available on simulators');
    return null;
  }

  try {
    // Get the Expo Push Token
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses the project ID from app.json
    });

    const pushToken = tokenData;
    if (!pushToken) return null;

    // Upsert the token in Supabase
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          push_token: pushToken,
          device_name: Device.deviceName || undefined,
          platform: Platform.OS,
          is_active: true,
        },
        { onConflict: 'user_id,push_token' }
      );

    if (error) {
      console.error('Error registering push token:', error);
      return null;
    }

    console.log('Push token registered successfully');
    return pushToken;
  } catch (err) {
    console.error('Error getting push token:', err);
    return null;
  }
}

/**
 * Deactivate the push token for this device (e.g., on sign out).
 */
export async function deactivatePushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  try {
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });

    if (tokenData) {
      await supabase
        .from('user_push_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('push_token', tokenData);
    }
  } catch (err) {
    console.error('Error deactivating push token:', err);
  }
}

/**
 * Sync notification preferences to Supabase so the server
 * knows who wants which notification types.
 */
export async function syncNotificationPrefs(
  userId: string,
  prefs: {
    pushEnabled: boolean;
    dailyReminder: boolean;
    streakReminder: boolean;
    communityUpdates: boolean;
    reminderHour: number;
    reminderMinute: number;
  }
): Promise<void> {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          push_enabled: prefs.pushEnabled,
          daily_reminder: prefs.dailyReminder,
          streak_reminder: prefs.streakReminder,
          community_updates: prefs.communityUpdates,
          reminder_hour: prefs.reminderHour,
          reminder_minute: prefs.reminderMinute,
          timezone,
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error syncing notification preferences:', error);
    }
  } catch (err) {
    console.error('Error syncing notification preferences:', err);
  }
}
