import { getDatabase } from './client';
import type { Workout, Exercise, NewWorkoutInput, SetData } from '../types';

// ---- Workouts ----

export async function insertWorkout(input: NewWorkoutInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO workouts (created_at, duration_seconds, notes, video_uri) VALUES (?, ?, ?, ?)`,
    Math.floor(Date.now() / 1000),
    input.duration_seconds,
    input.notes ?? null,
    input.video_uri ?? null,
  );
  return result.lastInsertRowId;
}

export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDatabase();
  return db.getAllAsync<Workout>(`SELECT * FROM workouts ORDER BY created_at DESC`);
}

export async function getWorkoutById(id: number): Promise<Workout | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Workout>(`SELECT * FROM workouts WHERE id = ?`, id);
}

export async function getLastWorkoutTimestamp(): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ created_at: number }>(
    `SELECT created_at FROM workouts ORDER BY created_at DESC LIMIT 1`
  );
  return row?.created_at ?? null;
}

export async function deleteWorkout(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM workouts WHERE id = ?`, id);
}

// ---- Exercises ----

export async function getExercisesForWorkout(workoutId: number): Promise<Exercise[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    workout_id: number;
    name: string;
    order_index: number;
    sets: string;
  }>(`SELECT * FROM exercises WHERE workout_id = ? ORDER BY order_index ASC`, workoutId);
  return rows.map(row => ({
    ...row,
    sets: JSON.parse(row.sets) as SetData[],
  }));
}

export async function insertExercisesForWorkout(
  workoutId: number,
  exercises: Array<{ name: string; order_index: number; sets: SetData[] }>,
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < exercises.length; i++) {
      await db.runAsync(
        `INSERT INTO exercises (workout_id, name, order_index, sets) VALUES (?, ?, ?, ?)`,
        workoutId,
        exercises[i].name,
        exercises[i].order_index,
        JSON.stringify(exercises[i].sets),
      );
    }
  });
}
