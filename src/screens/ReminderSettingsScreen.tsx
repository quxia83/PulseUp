import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReminderSettings } from '../hooks/useReminderSettings';
import {
  scheduleInactivityReminder,
  cancelInactivityReminder,
  scheduleWorkoutReminders,
  cancelWorkoutReminders,
} from '../services/notifications';
import type { ReminderSettingsScreenProps } from '../navigation/types';

const THRESHOLD_OPTIONS = [1, 2, 3, 5, 7, 14];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function ReminderSettingsScreen(_: ReminderSettingsScreenProps) {
  const { settings, save } = useReminderSettings();
  const insets = useSafeAreaInsets();

  // ---- Scheduled reminders ----

  async function handleScheduledToggle(val: boolean) {
    const next = { ...settings, scheduledEnabled: val };
    await save(next);
    if (val) {
      await scheduleWorkoutReminders(next.scheduledDays, next.scheduledHour, next.scheduledMinute);
    } else {
      await cancelWorkoutReminders();
    }
  }

  async function handleToggleDay(day: number) {
    const days = settings.scheduledDays.includes(day)
      ? settings.scheduledDays.filter(d => d !== day)
      : [...settings.scheduledDays, day].sort((a, b) => a - b);
    const next = { ...settings, scheduledDays: days };
    await save(next);
    if (next.scheduledEnabled) {
      await scheduleWorkoutReminders(days, next.scheduledHour, next.scheduledMinute);
    }
  }

  async function adjustTime(field: 'hour' | 'minute', delta: number) {
    let h = settings.scheduledHour;
    let m = settings.scheduledMinute;
    if (field === 'hour') {
      h = (h + delta + 24) % 24;
    } else {
      // step in 15-minute increments
      m = (m + delta * 15 + 60) % 60;
    }
    const next = { ...settings, scheduledHour: h, scheduledMinute: m };
    await save(next);
    if (next.scheduledEnabled) {
      await scheduleWorkoutReminders(next.scheduledDays, h, m);
    }
  }

  // ---- Inactivity reminders ----

  async function handleInactivityToggle(val: boolean) {
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

  const { scheduledHour: h, scheduledMinute: m } = settings;
  const ampm = h < 12 ? 'AM' : 'PM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      {/* ── Planned Workout Reminders ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Planned Workouts</Text>
            <Text style={styles.cardSubtitle}>Remind me on my workout days</Text>
          </View>
          <Switch
            value={settings.scheduledEnabled}
            onValueChange={handleScheduledToggle}
            trackColor={{ true: '#FF6B35' }}
          />
        </View>

        <Text style={styles.fieldLabel}>Workout Days</Text>
        <View style={styles.dayGrid}>
          {DAYS.map((label, i) => {
            const active = settings.scheduledDays.includes(i);
            return (
              <Pressable
                key={i}
                style={[styles.dayPill, active && styles.dayPillActive]}
                onPress={() => handleToggleDay(i)}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Reminder Time</Text>
        <View style={styles.timePicker}>
          {/* Hours */}
          <View style={styles.timeUnit}>
            <Pressable style={styles.timeBtn} onPress={() => adjustTime('hour', 1)}>
              <Text style={styles.timeBtnText}>▲</Text>
            </Pressable>
            <Text style={styles.timeValue}>{pad(displayHour)}</Text>
            <Pressable style={styles.timeBtn} onPress={() => adjustTime('hour', -1)}>
              <Text style={styles.timeBtnText}>▼</Text>
            </Pressable>
          </View>
          <Text style={styles.timeSep}>:</Text>
          {/* Minutes */}
          <View style={styles.timeUnit}>
            <Pressable style={styles.timeBtn} onPress={() => adjustTime('minute', 1)}>
              <Text style={styles.timeBtnText}>▲</Text>
            </Pressable>
            <Text style={styles.timeValue}>{pad(m)}</Text>
            <Pressable style={styles.timeBtn} onPress={() => adjustTime('minute', -1)}>
              <Text style={styles.timeBtnText}>▼</Text>
            </Pressable>
          </View>
          <Text style={styles.ampm}>{ampm}</Text>
        </View>

        {settings.scheduledEnabled && settings.scheduledDays.length > 0 && (
          <Text style={styles.hint}>
            You'll be reminded every{' '}
            {settings.scheduledDays.map(d => DAYS[d]).join(', ')} at {pad(displayHour)}:{pad(m)} {ampm}.
          </Text>
        )}
        {settings.scheduledEnabled && settings.scheduledDays.length === 0 && (
          <Text style={[styles.hint, { color: '#FF3B30' }]}>Select at least one day.</Text>
        )}
      </View>

      {/* ── Inactivity Reminders ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Inactivity Reminder</Text>
            <Text style={styles.cardSubtitle}>Alert when I haven't trained in a while</Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={handleInactivityToggle}
            trackColor={{ true: '#FF6B35' }}
          />
        </View>

        <Text style={styles.fieldLabel}>Remind me after (days without a workout)</Text>
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

        {settings.enabled && (
          <Text style={styles.hint}>
            You'll get a reminder if you haven't logged a workout in{' '}
            {settings.thresholdDays} day{settings.thresholdDays !== 1 ? 's' : ''}.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  cardSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayGrid: { flexDirection: 'row', gap: 6 },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
  },
  dayPillActive: { backgroundColor: '#FF6B35' },
  dayText: { fontSize: 12, fontWeight: '600', color: '#3C3C43' },
  dayTextActive: { color: '#fff' },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeUnit: { alignItems: 'center', gap: 4 },
  timeBtn: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  timeBtnText: { fontSize: 12, color: '#3C3C43', fontWeight: '700' },
  timeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    width: 56,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeSep: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  ampm: { fontSize: 18, fontWeight: '600', color: '#8E8E93', marginLeft: 4, marginTop: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
  },
  pillActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  pillText: { fontSize: 15, color: '#1C1C1E' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 13, color: '#8E8E93', lineHeight: 18 },
});
