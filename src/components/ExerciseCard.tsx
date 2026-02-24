import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import SetRow from './SetRow';
import { useWorkout } from '../context/WorkoutContext';
import type { ActiveExercise } from '../types';

interface Props {
  exercise: ActiveExercise;
}

export default function ExerciseCard({ exercise }: Props) {
  const { dispatch } = useWorkout();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TextInput
          style={styles.nameInput}
          placeholder="Exercise name"
          value={exercise.name}
          onChangeText={name =>
            dispatch({ type: 'UPDATE_EXERCISE_NAME', localId: exercise.localId, name })
          }
        />
        <Pressable onPress={() => dispatch({ type: 'REMOVE_EXERCISE', localId: exercise.localId })}>
          <Text style={styles.deleteText}>Remove</Text>
        </Pressable>
      </View>

      {exercise.sets.map((set, i) => (
        <SetRow
          key={i}
          setIndex={i}
          data={set}
          onUpdate={(field, value) =>
            dispatch({ type: 'UPDATE_SET', localId: exercise.localId, setIndex: i, field, value })
          }
          onRemove={() =>
            dispatch({ type: 'REMOVE_SET', localId: exercise.localId, setIndex: i })
          }
        />
      ))}

      <Pressable
        style={styles.addSetBtn}
        onPress={() => dispatch({ type: 'ADD_SET', localId: exercise.localId })}
      >
        <Text style={styles.addSetText}>+ Add Set</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
    paddingBottom: 4,
    marginRight: 12,
  },
  deleteText: { color: '#FF3B30', fontSize: 13 },
  addSetBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
  addSetText: { color: '#FF6B35', fontSize: 15 },
});
