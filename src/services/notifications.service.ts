import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NOTIFICATION_CHANNEL_ID = 'daily-reminder';
const NOTIFICATION_TAG = 'seneca-daily-reminder';

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // Notifications don't work on simulators — silently succeed in dev
    return true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Daily Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule repeating daily notifications for each selected day of the week.
 * Cancels any existing Seneca reminders first to avoid duplicates.
 *
 * @param hour      - 0–23 (24-hour)
 * @param minute    - 0–59
 * @param daysOfWeek - array of 1–7 (1 = Monday … 7 = Sunday)
 */
export async function scheduleReminders(
  hour: number,
  minute: number,
  daysOfWeek: number[]
): Promise<void> {
  // Cancel existing reminders before scheduling new ones
  await cancelAllReminders();

  // expo-notifications uses 1=Sunday … 7=Saturday (JS getDay() convention)
  // Our app stores 1=Monday … 7=Sunday, so we need to map:
  const toExpoWeekday = (day: number): number => {
    // app: 1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat,7=Sun
    // expo: 1=Sun,2=Mon,3=Tue,4=Wed,5=Thu,6=Fri,7=Sat
    const map: Record<number, number> = {
      1: 2, // Mon
      2: 3, // Tue
      3: 4, // Wed
      4: 5, // Thu
      5: 6, // Fri
      6: 7, // Sat
      7: 1, // Sun
    };
    return map[day];
  };

  const body = getNotificationBody();

  for (const day of daysOfWeek) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Today's Journey awaits 🔥",
        body,
        sound: true,
        data: { type: NOTIFICATION_TAG },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: toExpoWeekday(day),
        hour,
        minute,
      },
    });
  }
}

/**
 * Cancel all scheduled Seneca reminders.
 */
export async function cancelAllReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const senecaNotifications = scheduled.filter(
    (n) => n.content.data?.type === NOTIFICATION_TAG
  );
  for (const notification of senecaNotifications) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }
}

// Rotate through a few different motivating bodies so it doesn't feel stale
const NOTIFICATION_BODIES = [
  "A few minutes of reflection today shapes who you become tomorrow.",
  "Your daily passage is ready. Take a moment to grow.",
  "Wisdom waits. Complete today's journey and build your streak.",
  "The Stoics practiced daily — so can you. Your practice is ready.",
  "A small act of reflection today compounds into a wiser life.",
];

function getNotificationBody(): string {
  const index = new Date().getDay() % NOTIFICATION_BODIES.length;
  return NOTIFICATION_BODIES[index];
}
