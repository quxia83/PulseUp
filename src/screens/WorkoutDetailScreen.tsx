import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Linking } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWorkoutById, getExercisesForWorkout } from '../db/queries';
import { formatElapsed } from '../hooks/useTimer';
import { isYouTubeUrl, isDirectVideoUrl } from '../utils/videoUtils';
import type { Workout, Exercise } from '../types';
import type { WorkoutDetailScreenProps } from '../navigation/types';

interface ExerciseDetailBlockProps {
  exercise: Exercise;
}

function ExerciseDetailBlock({ exercise }: ExerciseDetailBlockProps) {
  const [playerVisible, setPlayerVisible] = useState(false);

  const directUri =
    exercise.video_uri && isDirectVideoUrl(exercise.video_uri) ? exercise.video_uri : null;
  const player = useVideoPlayer(directUri, p => {
    p.loop = false;
  });

  function handleWatch() {
    const uri = exercise.video_uri;
    if (!uri) return;
    if (isYouTubeUrl(uri)) {
      Linking.openURL(uri);
    } else {
      setPlayerVisible(true);
    }
  }

  return (
    <View style={styles.exerciseBlock}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        {exercise.video_uri ? (
          <Pressable onPress={handleWatch} style={styles.watchBtn}>
            <Text style={styles.watchText}>▶ Watch</Text>
          </Pressable>
        ) : null}
      </View>

      {exercise.sets.map((set, i) => (
        <Text key={i} style={styles.setLine}>
          Set {i + 1}: {set.reps} reps × {set.weight_kg} lbs
        </Text>
      ))}

      <Modal
        visible={playerVisible}
        animationType="slide"
        onRequestClose={() => {
          player.pause();
          setPlayerVisible(false);
        }}
      >
        <View style={styles.playerContainer}>
          <VideoView
            player={player}
            style={styles.videoView}
            allowsFullscreen
            nativeControls
            contentFit="contain"
          />
          <Pressable
            onPress={() => {
              player.pause();
              setPlayerVisible(false);
            }}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>✕  Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

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

      <Text style={styles.sectionTitle}>Exercises</Text>

      {exercises.length === 0 ? (
        <Text style={styles.noExercises}>No exercises logged.</Text>
      ) : (
        exercises.map(ex => <ExerciseDetailBlock key={ex.id} exercise={ex} />)
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', flex: 1 },
  watchBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  watchText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  setLine: { fontSize: 14, color: '#3C3C43', paddingVertical: 2 },
  // Fullscreen player
  playerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  videoView: { flex: 1 },
  closeBtn: { padding: 20, alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 17 },
});
