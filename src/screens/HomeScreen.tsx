import React, { useEffect } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkouts } from '../hooks/useWorkouts';
import { useReminderSettings } from '../hooks/useReminderSettings';
import WorkoutCard from '../components/WorkoutCard';
import { scheduleInactivityReminder } from '../services/notifications';
import type { HomeScreenProps } from '../navigation/types';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { workouts, loading } = useWorkouts();
  const { settings } = useReminderSettings();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (settings.enabled) {
      scheduleInactivityReminder(settings.thresholdDays).catch(console.error);
    }
  }, [settings]);

  const recentWorkouts = workouts.slice(0, 5);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        data={recentWorkouts}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => {
              // Navigate to history tab's detail screen
            }}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.subtitle}>Recent Workouts</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyText}>No workouts yet.</Text>
              <Text style={styles.emptyHint}>Tap Start Workout to begin!</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('ReminderSettings')}
        >
          <Text style={styles.settingsText}>🔔  Reminder Settings</Text>
        </Pressable>

        <Pressable
          style={styles.startBtn}
          onPress={() => navigation.navigate('ActiveWorkout')}
        >
          <Text style={styles.startText}>Start Workout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { paddingHorizontal: 4, paddingBottom: 8 },
  subtitle: { fontSize: 15, fontWeight: '600', color: '#6E6E73', textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { padding: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#3C3C43', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: '#8E8E93', fontSize: 14 },
  footer: { padding: 16, gap: 12 },
  startBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    padding: 16,
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
