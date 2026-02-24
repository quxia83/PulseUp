// --- DB row shapes (match SQLite columns exactly) ---

export interface Workout {
  id: number;
  created_at: number; // Unix seconds
  duration_seconds: number;
  notes: string | null;
  video_uri: string | null;
  source_routine: string | null;
  exercise_summary: string | null; // first 3 exercise names, comma-separated
}

export interface Exercise {
  id: number;
  workout_id: number;
  name: string;
  order_index: number;
  sets: SetData[];
  video_uri: string | null;
}

export interface SetData {
  reps: number;
  weight_kg: number;
}

// --- Input types for inserts ---

export interface NewWorkoutInput {
  duration_seconds: number;
  notes?: string;
  source_routine?: string;
}

export interface NewExerciseInput {
  workout_id: number;
  name: string;
  order_index: number;
  sets: SetData[];
  video_uri?: string | null;
}

// --- Active workout state (in-memory only, during a session) ---

export interface ActiveExercise {
  localId: string;
  name: string;
  sets: SetData[];
  videoUri: string | null;
}

export interface ActiveWorkoutState {
  isActive: boolean;
  startedAt: number | null; // Date.now() ms
  exercises: ActiveExercise[];
  notes: string;
  routineName: string | null;
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
  | { type: 'SET_EXERCISE_VIDEO'; localId: string; uri: string | null }
  | { type: 'FINISH_WORKOUT' }
  | { type: 'LOAD_ROUTINE'; routineName: string; exercises: Array<{ name: string; sets: SetData[]; videoUri: string | null }> };

export interface ReminderSettings {
  thresholdDays: number;
  enabled: boolean;
  scheduledEnabled: boolean;
  scheduledDays: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  scheduledHour: number;    // 0-23
  scheduledMinute: number;  // 0 or 30
}

// --- Routines ---

export type RoutineCategory =
  | 'Strength' | 'Cardio' | 'HIIT' | 'Mobility'
  | 'Upper Body' | 'Lower Body' | 'Full Body' | 'Core';

export interface RoutineExercise {
  id: number;
  routine_id: number;
  name: string;
  order_index: number;
  suggested_sets: number;
  suggested_reps: number;
  suggested_weight_kg: number;
  video_url: string | null;
}

export interface Routine {
  id: number;
  name: string;
  category: RoutineCategory;
  description: string | null;
  video_url: string | null;
  music_url: string | null;
  is_builtin: number; // 0 | 1
}

export interface NewRoutineInput {
  name: string;
  category: RoutineCategory;
  description?: string;
  video_url?: string;
  music_url?: string;
}

export interface NewRoutineExerciseInput {
  name: string;
  order_index: number;
  suggested_sets: number;
  suggested_reps: number;
  suggested_weight_kg: number;
  video_url?: string;
}

// --- Stats ---

export interface WorkoutStats {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number;
}

export interface WeeklyWorkoutCount {
  weekLabel: string;
  count: number;
}

export interface MonthlyVolume {
  monthLabel: string;
  volume: number;
}

export interface ExerciseFrequency {
  name: string;
  count: number;
}

export interface PersonalRecord {
  name: string;
  max_weight_kg: number;
}

// --- User Profile ---

export type FitnessGoal = 'lose_weight' | 'build_muscle' | 'maintain' | 'improve_endurance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  weight_kg: number | null;
  target_weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  fitness_goal: FitnessGoal | null;
  experience_level: ExperienceLevel | null;
}
