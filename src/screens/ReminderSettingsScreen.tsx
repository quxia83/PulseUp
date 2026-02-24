import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReminderSettings } from '../hooks/useReminderSettings';
import { scheduleInactivityReminder, cancelInactivityReminder } from '../services/notifications';
import type { ReminderSettingsScreenProps } from '../navigation/types';

const THRESHOLD_OPTIONS = [1, 2, 3, 5, 7, 14];

export default function ReminderSettingsScreen(_: ReminderSettingsScreenProps) {
  const { settings, save } = useReminderSettings();
  const insets = useSafeAreaInsets();

  async function handleToggle(val: boolean) {
    const next = { ...settings, enabled: val };
    await save(next);
    if (val) {
      await scheduleInactivityReminder(next.thresholdDays);
    } else {
      await cancelInactivityReminder();
    }
  }

  async function handleThresholdSelect(days: number) {
    const next = { ...settings, thresholdDays: days };
    await save(next);
    if (next.enabled) {
      await scheduleInactivityReminder(days);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        <Text style={styles.label}>Enable Inactivity Reminders</Text>
        <Switch
          value={settings.enabled}
          onValueChange={handleToggle}
          trackColor={{ true: '#FF6B35' }}
        />
      </View>

      <Text style={styles.sectionTitle}>Remind me after (days without a workout)</Text>
      <View style={styles.pills}>
        {THRESHOLD_OPTIONS.map(d => (
          <Pressable
            key={d}
            style={[styles.pill, settings.thresholdDays === d && styles.pillActive]}
            onPress={() => handleThresholdSelect(d)}
          >
            <Text style={[styles.pillText, settings.thresholdDays === d && styles.pillTextActive]}>
              {d}d
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        You'll get a reminder if you haven't logged a workout in{' '}
        {settings.thresholdDays} day{settings.thresholdDays !== 1 ? 's' : ''}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  label: { fontSize: 16, color: '#1C1C1E' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  pillActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  pillText: { fontSize: 15, color: '#1C1C1E' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  hint: { marginTop: 20, fontSize: 13, color: '#8E8E93', lineHeight: 18 },
});
