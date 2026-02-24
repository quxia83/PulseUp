// --- DB row shapes (match SQLite columns exactly) ---

export interface Workout {
  id: number;
  created_at: number; // Unix seconds
  duration_seconds: number;
  notes: string | null;
  video_uri: string | null;
}

export interface Exercise {
  id: number;
  workout_id: number;
  name: string;
  order_index: number;
  sets: SetData[];
}

export interface SetData {
  reps: number;
  weight_kg: number;
}

// --- Input types for inserts ---

export interface NewWorkoutInput {
  duration_seconds: number;
  notes?: string;
  video_uri?: string;
}

export interface NewExerciseInput {
  workout_id: number;
  name: string;
  order_index: number;
  sets: SetData[];
}

// --- Active workout state (in-memory only, during a session) ---

export interface ActiveExercise {
  localId: string;
  name: string;
  sets: SetData[];
}

export interface ActiveWorkoutState {
  isActive: boolean;
  startedAt: number | null; // Date.now() ms
  exercises: ActiveExercise[];
  notes: string;
  videoUri: string | null;
}

export type ActiveWorkoutAction =
  | { type: 'START_WORKOUT' }
  | { type: 'ADD_EXERCISE'; name: string }
  | { type: 'REMOVE_EXERCISE'; localId: string }
  | { type: 'UPDATE_EXERCISE_NAME'; localId: string; name: string }
  | { type: 'ADD_SET'; localId: string }
  | { type: 'REMOVE_SET'; localId: string; setIndex: number }
  | { type: 'UPDATE_SET'; localId: string; setIndex: number; field: 'reps' | 'weight_kg'; value: number }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'ATTACH_VIDEO'; uri: string }
  | { type: 'DETACH_VIDEO' }
  | { type: 'FINISH_WORKOUT' };

export interface ReminderSettings {
  thresholdDays: number;
  enabled: boolean;
}
