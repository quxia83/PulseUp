import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getRoutineById, getRoutineExercises, getProfile } from '../db/queries';
import { useWorkout } from '../context/WorkoutContext';
import type { Routine, RoutineExercise, ExperienceLevel } from '../types';
import type { RoutineDetailScreenProps, RootStackParamList } from '../navigation/types';

function weightMultiplier(level: ExperienceLevel | null): number {
  if (level === 'beginner') return 0.6;
  if (level === 'advanced')  return 1.2;
  return 1.0;
}

function adjustedWeight(raw: number, multiplier: number): number {
  if (raw <= 0) return 0;
  return Math.round(raw * multiplier / 5) * 5;
}

const LEVEL_LABEL: Record<ExperienceLevel, string> = {
  beginner:     'Beginner (60% weight)',
  intermediate: 'Intermediate',
  advanced:     'Advanced (120% weight)',
};

const CATEGORY_COLORS: Record<string, string> = {
  Strength: '#FF6B35',
  Cardio: '#34C759',
  HIIT: '#FF3B30',
  Mobility: '#5AC8FA',
  'Upper Body': '#007AFF',
  'Lower Body': '#AF52DE',
  'Full Body': '#FF9500',
  Core: '#FFCC00',
};

export default function RoutineDetailScreen({ route, navigation }: RoutineDetailScreenProps) {
  const { routineId } = route.params;
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const { state, dispatch } = useWorkout();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const multiplier = weightMultiplier(experienceLevel);

  useEffect(() => {
    (async () => {
      const [r, exs, profile] = await Promise.all([
        getRoutineById(routineId),
        getRoutineExercises(routineId),
        getProfile(),
      ]);
      setRoutine(r);
      setExercises(exs);
      setExperienceLevel(profile.experience_level);
      setLoading(false);
    })();
  }, [routineId]);

  React.useLayoutEffect(() => {
    if (routine) {
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            onPress={() => navigation.navigate('CreateRoutine', { routineId: routine.id })}
          >
            <Text style={{ color: '#FF6B35', fontSize: 16 }}>Edit</Text>
          </Pressable>
        ),
      });
    }
  }, [navigation, routine]);

  const handleStartWorkout = useCallback(() => {
    const doStart = () => {
      dispatch({
        type: 'LOAD_ROUTINE',
        routineName: routine?.name ?? '',
        exercises: exercises.map(ex => ({
          name: ex.name,
          sets: Array.from({ length: ex.suggested_sets }, () => ({
            reps: ex.suggested_reps,
            weight_kg: adjustedWeight(ex.suggested_weight_kg, multiplier),
          })),
          videoUri: ex.video_url,
        })),
      });
      rootNav.navigate('ActiveWorkout');
    };

    if (state.isActive && state.exercises.length > 0) {
      Alert.alert(
        'Replace Current Workout?',
        'You have an active workout. Starting this routine will replace it.',
        [
          { text: 'Keep Current', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: doStart },
        ]
      );
    } else {
      doStart();
    }
  }, [exercises, multiplier, state, dispatch, rootNav]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#8E8E93' }}>Routine not found.</Text>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[routine.category] ?? '#8E8E93';

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <Text style={styles.routineName}>{routine.name}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: catColor + '22' }]}>
            <Text style={[styles.categoryText, { color: catColor }]}>{routine.category}</Text>
          </View>
          {routine.description ? (
            <Text style={styles.description}>{routine.description}</Text>
          ) : null}
        </View>

        {/* Music row */}
        {routine.music_url ? (
          <Pressable
            style={styles.linkRow}
            onPress={() => Linking.openURL(routine.music_url!)}
          >
            <Ionicons name="musical-notes-outline" size={20} color="#FF6B35" />
            <Text style={styles.linkText}>Open Music</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" style={{ marginLeft: 'auto' }} />
          </Pressable>
        ) : null}

        {/* Video row */}
        {routine.video_url ? (
          <Pressable
            style={styles.linkRow}
            onPress={() => Linking.openURL(routine.video_url!)}
          >
            <Ionicons name="play-circle-outline" size={20} color="#FF6B35" />
            <Text style={styles.linkText}>Watch Reference</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" style={{ marginLeft: 'auto' }} />
          </Pressable>
        ) : null}

        {/* Exercise list */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {experienceLevel && experienceLevel !== 'intermediate' && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{LEVEL_LABEL[experienceLevel]}</Text>
            </View>
          )}
        </View>
        {exercises.map((ex, i) => {
          const adj = adjustedWeight(ex.suggested_weight_kg, multiplier);
          const weightChanged = adj !== ex.suggested_weight_kg && ex.suggested_weight_kg > 0;
          return (
            <View key={ex.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseIndex}>{i + 1}</Text>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.exerciseMeta}>
                    {ex.suggested_sets}×{ex.suggested_reps}
                    {adj > 0 ? ` @ ${adj} lbs` : ' · Bodyweight'}
                  </Text>
                  {weightChanged && (
                    <Text style={styles.originalWeight}>was {ex.suggested_weight_kg} lbs</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Start Workout button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.startBtn} onPress={handleStartWorkout}>
          <Text style={styles.startText}>Start Workout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  routineName: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  categoryBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { fontSize: 13, fontWeight: '600' },
  description: { fontSize: 15, color: '#3C3C43', lineHeight: 20 },
  linkRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkText: { fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  levelBadge: { backgroundColor: '#FFF4F0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  levelBadgeText: { fontSize: 12, fontWeight: '600', color: '#FF6B35' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  originalWeight: { fontSize: 11, color: '#C7C7CC', textDecorationLine: 'line-through' },
  exerciseRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseIndex: { fontSize: 15, fontWeight: '700', color: '#8E8E93', width: 20, textAlign: 'center' },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  exerciseMeta: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#F2F2F7' },
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
  startText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
