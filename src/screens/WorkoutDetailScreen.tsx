import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWorkoutById, getExercisesForWorkout } from '../db/queries';
import VideoAttachment from '../components/VideoAttachment';
import { formatElapsed } from '../hooks/useTimer';
import type { Workout, Exercise } from '../types';
import type { WorkoutDetailScreenProps } from '../navigation/types';

export default function WorkoutDetailScreen({ route }: WorkoutDetailScreenProps) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const [w, exs] = await Promise.all([
        getWorkoutById(workoutId),
        getExercisesForWorkout(workoutId),
      ]);
      setWorkout(w);
      setExercises(exs);
    })();
  }, [workoutId]);

  if (!workout) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const date = new Date(workout.created_at * 1000).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={styles.date}>{date}</Text>
      <Text style={styles.duration}>Duration: {formatElapsed(workout.duration_seconds)}</Text>

      {workout.notes ? <Text style={styles.notes}>{workout.notes}</Text> : null}

      {workout.video_uri ? (
        <VideoAttachment
          videoUri={workout.video_uri}
          thumbnailUri={null}
          onAttach={() => {}}
          onDetach={() => {}}
          readOnly
        />
      ) : null}

      <Text style={styles.sectionTitle}>Exercises</Text>

      {exercises.length === 0 ? (
        <Text style={styles.noExercises}>No exercises logged.</Text>
      ) : (
        exercises.map(ex => (
          <View key={ex.id} style={styles.exerciseBlock}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            {ex.sets.map((set, i) => (
              <Text key={i} style={styles.setLine}>
                Set {i + 1}: {set.reps} reps × {set.weight_kg} kg
              </Text>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8E8E93' },
  date: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  duration: { fontSize: 15, color: '#3C3C43', marginBottom: 8 },
  notes: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#3C3C43',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12,
    color: '#1C1C1E',
  },
  noExercises: { color: '#8E8E93', fontSize: 14 },
  exerciseBlock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  exerciseName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 6 },
  setLine: { fontSize: 14, color: '#3C3C43', paddingVertical: 2 },
});
