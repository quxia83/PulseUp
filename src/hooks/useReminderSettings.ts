import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReminderSettings } from '../types';

const STORAGE_KEY = '@reminder_settings';
const DEFAULT: ReminderSettings = { thresholdDays: 3, enabled: true };

export function useReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(json => {
      if (json) setSettings(JSON.parse(json));
      setLoaded(true);
    });
  }, []);

  async function save(next: ReminderSettings) {
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return { settings, save, loaded };
}
