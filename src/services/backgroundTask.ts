import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLastWorkoutTimestamp } from '../db/queries';
import { scheduleInactivityReminder } from './notifications';

export const BACKGROUND_TASK_NAME = 'PULSEUP_INACTIVITY_CHECK';
const REMINDER_SETTINGS_KEY = '@reminder_settings';

// MUST be called at module scope (before registerRootComponent)
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    const settingsJson = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
    const settings = settingsJson
      ? JSON.parse(settingsJson)
      : { thresholdDays: 3, enabled: true };

    if (!settings.enabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const lastWorkoutTs = await getLastWorkoutTimestamp();
    if (!lastWorkoutTs) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const daysSince = (nowSec - lastWorkoutTs) / 86400;

    if (daysSince >= settings.thresholdDays) {
      await scheduleInactivityReminder(0);
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
    minimumInterval: 60 * 60 * 6, // 6 hours
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
  }
}
