import * as Notifications from 'expo-notifications';

const INACTIVITY_NOTIFICATION_ID = 'inactivity-reminder';
const SCHEDULED_PREFIX = 'scheduled-workout-';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleInactivityReminder(thresholdDays: number): Promise<void> {
  await cancelInactivityReminder();

  const secondsUntilFire = Math.max(1, thresholdDays * 24 * 60 * 60);

  await Notifications.scheduleNotificationAsync({
    identifier: INACTIVITY_NOTIFICATION_ID,
    content: {
      title: 'Time to get your pulse up!',
      body: `It's been ${thresholdDays} day${thresholdDays !== 1 ? 's' : ''} since your last workout. Keep the momentum going!`,
      data: { type: 'inactivity' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilFire,
      repeats: false,
    },
  });
}

export async function cancelInactivityReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(INACTIVITY_NOTIFICATION_ID);
  } catch {
    // Notification may not exist — safe to ignore
  }
}

export async function scheduleWorkoutReminders(
  days: number[],  // 0=Sun, 1=Mon, ..., 6=Sat
  hour: number,
  minute: number,
): Promise<void> {
  await cancelWorkoutReminders();
  for (const day of days) {
    // expo-notifications weekday: 1=Sun, 2=Mon, ..., 7=Sat
    await Notifications.scheduleNotificationAsync({
      identifier: `${SCHEDULED_PREFIX}${day}`,
      content: {
        title: "Workout time!",
        body: "You planned a workout today — let's get it done!",
        data: { type: 'scheduled' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day + 1,
        hour,
        minute,
        repeats: true,
      } as any,
    });
  }
}

export async function cancelWorkoutReminders(): Promise<void> {
  for (let d = 0; d <= 6; d++) {
    try {
      await Notifications.cancelScheduledNotificationAsync(`${SCHEDULED_PREFIX}${d}`);
    } catch { /* ignore */ }
  }
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
