import React, { createContext, useContext, useReducer } from 'react';
import type { ActiveWorkoutState, ActiveWorkoutAction, ActiveExercise } from '../types';

const initialState: ActiveWorkoutState = {
  isActive: false,
  startedAt: null,
  exercises: [],
  notes: '',
  videoUri: null,
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function reducer(state: ActiveWorkoutState, action: ActiveWorkoutAction): ActiveWorkoutState {
  switch (action.type) {
    case 'START_WORKOUT':
      return { ...initialState, isActive: true, startedAt: Date.now() };

    case 'ADD_EXERCISE': {
      const newEx: ActiveExercise = {
        localId: generateId(),
        name: action.name,
        sets: [{ reps: 0, weight_kg: 0 }],
      };
      return { ...state, exercises: [...state.exercises, newEx] };
    }

    case 'REMOVE_EXERCISE':
      return { ...state, exercises: state.exercises.filter(e => e.localId !== action.localId) };

    case 'UPDATE_EXERCISE_NAME':
      return {
        ...state,
        exercises: state.exercises.map(e =>
          e.localId === action.localId ? { ...e, name: action.name } : e
        ),
      };

    case 'ADD_SET':
      return {
        ...state,
        exercises: state.exercises.map(e =>
          e.localId === action.localId
            ? { ...e, sets: [...e.sets, { reps: 0, weight_kg: 0 }] }
            : e
        ),
      };

    case 'REMOVE_SET':
      return {
        ...state,
        exercises: state.exercises.map(e =>
          e.localId === action.localId
            ? { ...e, sets: e.sets.filter((_, i) => i !== action.setIndex) }
            : e
        ),
      };

    case 'UPDATE_SET':
      return {
        ...state,
        exercises: state.exercises.map(e => {
          if (e.localId !== action.localId) return e;
          const newSets = [...e.sets];
          newSets[action.setIndex] = { ...newSets[action.setIndex], [action.field]: action.value };
          return { ...e, sets: newSets };
        }),
      };

    case 'SET_NOTES':
      return { ...state, notes: action.notes };

    case 'ATTACH_VIDEO':
      return { ...state, videoUri: action.uri };

    case 'DETACH_VIDEO':
      return { ...state, videoUri: null };

    case 'FINISH_WORKOUT':
      return initialState;

    default:
      return state;
  }
}

interface WorkoutContextValue {
  state: ActiveWorkoutState;
  dispatch: React.Dispatch<ActiveWorkoutAction>;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <WorkoutContext.Provider value={{ state, dispatch }}>{children}</WorkoutContext.Provider>;
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
  return ctx;
}
