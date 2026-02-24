import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWorkouts } from '../hooks/useWorkouts';
import { useReminderSettings } from '../hooks/useReminderSettings';
import { scheduleInactivityReminder } from '../services/notifications';
import type { HomeScreenProps } from '../navigation/types';
import type { RootStackParamList } from '../navigation/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { workouts } = useWorkouts();
  const { settings } = useReminderSettings();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (settings.enabled) {
      scheduleInactivityReminder(settings.thresholdDays).catch(console.error);
    }
  }, [settings]);

  const lastWorkout = workouts[0] ?? null;
  const lastWorkoutLabel = lastWorkout
    ? new Date(lastWorkout.created_at * 1000).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : null;

  // Days since last workout
  const daysSince = lastWorkout
    ? Math.floor((Date.now() / 1000 - lastWorkout.created_at) / 86400)
    : null;

  const motivationLine =
    daysSince === null ? "Let's get started — log your first session!" :
    daysSince === 0   ? 'You trained today. Keep the streak alive!' :
    daysSince === 1   ? 'You trained yesterday. Stay consistent!' :
                        `${daysSince} days since your last session. Time to go!`;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Top section */}
      <View style={styles.body}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.motivation}>{motivationLine}</Text>

        {lastWorkoutLabel && (
          <View style={styles.lastCard}>
            <Text style={styles.lastLabel}>Last workout</Text>
            <Text style={styles.lastDate}>{lastWorkoutLabel}</Text>
          </View>
        )}
      </View>

      {/* Bottom actions */}
      <View style={styles.footer}>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('ReminderSettings')}
        >
          <Text style={styles.settingsText}>🔔  Reminder Settings</Text>
        </Pressable>

        <Pressable
          style={styles.startBtn}
          onPress={() => rootNav.navigate('ActiveWorkout')}
        >
          <Text style={styles.startText}>Start Workout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  motivation: {
    fontSize: 15,
    color: '#6E6E73',
    textAlign: 'center',
    lineHeight: 22,
  },
  lastCard: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lastLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.4 },
  lastDate: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginTop: 2 },
  footer: { padding: 16, gap: 12 },
  startBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  settingsBtn: { alignItems: 'center' },
  settingsText: { color: '#FF6B35', fontSize: 15 },
});
