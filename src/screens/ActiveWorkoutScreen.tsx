import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkout } from '../context/WorkoutContext';
import { useTimer } from '../hooks/useTimer';
import { useReminderSettings } from '../hooks/useReminderSettings';
import Timer from '../components/Timer';
import ExerciseCard from '../components/ExerciseCard';
import { insertWorkout, insertExercisesForWorkout } from '../db/queries';
import { scheduleInactivityReminder } from '../services/notifications';
import type { ActiveWorkoutScreenProps } from '../navigation/types';
// ActiveWorkout is now a root-level modal screen

export default function ActiveWorkoutScreen({ navigation }: ActiveWorkoutScreenProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useWorkout();
  const { elapsed } = useTimer(state.isActive);
  const { settings } = useReminderSettings();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state.isActive) {
      dispatch({ type: 'START_WORKOUT' });
    }
  }, []);

  async function handleFinish() {
    if (state.exercises.length === 0) {
      Alert.alert(t('workout.no_exercises'), t('workout.no_exercises_msg'));
      return;
    }
    if (saving) return;
    setSaving(true);

    try {
      const workoutId = await insertWorkout({
        duration_seconds: elapsed,
        notes: state.notes || undefined,
        source_routine: state.routineName ?? undefined,
      });

      await insertExercisesForWorkout(
        workoutId,
        state.exercises.map((ex, i) => ({
          name: ex.name,
          order_index: i,
          sets: ex.sets,
          video_uri: ex.videoUri,
        })),
      );

      dispatch({ type: 'FINISH_WORKOUT' });

      if (settings.enabled) {
        await scheduleInactivityReminder(settings.thresholdDays);
      }

      navigation.goBack();
    } catch (e) {
      setSaving(false);
      Alert.alert(t('common.error'), t('workout.save_error'));
      console.error(e);
    }
  }

  function handleDiscard() {
    Alert.alert(t('workout.discard_title'), t('workout.discard_message'), [
      { text: t('workout.keep_going'), style: 'cancel' },
      {
        text: t('workout.discard'),
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'FINISH_WORKOUT' });
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleDiscard}>
            <Text style={styles.discardText}>{t('workout.discard')}</Text>
          </Pressable>
          <Timer elapsed={elapsed} />
          <Pressable
            style={[styles.finishBtn, saving && styles.finishBtnDisabled]}
            onPress={handleFinish}
            disabled={saving}
          >
            <Text style={styles.finishText}>{saving ? t('workout.saving') : t('workout.finish')}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {state.exercises.map(ex => (
            <ExerciseCard key={ex.localId} exercise={ex} />
          ))}

          <Pressable
            style={styles.addExBtn}
            onPress={() => dispatch({ type: 'ADD_EXERCISE', name: '' })}
          >
            <Text style={styles.addExText}>{t('workout.add_exercise')}</Text>
          </Pressable>

          <TextInput
            style={styles.notesInput}
            placeholder={t('workout.notes_placeholder')}
            multiline
            numberOfLines={3}
            value={state.notes}
            onChangeText={notes => dispatch({ type: 'SET_NOTES', notes })}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  discardText: { color: '#FF3B30', fontSize: 16 },
  finishBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  finishBtnDisabled: { backgroundColor: '#ccc' },
  finishText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  scroll: { padding: 16 },
  addExBtn: {
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  addExText: { color: '#FF6B35', fontSize: 16, fontWeight: '600' },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    marginVertical: 8,
  },
});
