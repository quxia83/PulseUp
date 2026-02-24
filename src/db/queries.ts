import { getDatabase } from './client';
import type {
  Workout, Exercise, NewWorkoutInput, SetData,
  Routine, RoutineExercise, NewRoutineInput, NewRoutineExerciseInput,
  WorkoutStats, WeeklyWorkoutCount, MonthlyVolume, ExerciseFrequency, PersonalRecord,
} from '../types';

// ---- Workouts ----

export async function insertWorkout(input: NewWorkoutInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO workouts (created_at, duration_seconds, notes) VALUES (?, ?, ?)`,
    Math.floor(Date.now() / 1000),
    input.duration_seconds,
    input.notes ?? null,
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
    video_uri: string | null;
  }>(`SELECT * FROM exercises WHERE workout_id = ? ORDER BY order_index ASC`, workoutId);
  return rows.map(row => ({
    ...row,
    sets: JSON.parse(row.sets) as SetData[],
  }));
}

export async function insertExercisesForWorkout(
  workoutId: number,
  exercises: Array<{ name: string; order_index: number; sets: SetData[]; video_uri?: string | null }>,
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < exercises.length; i++) {
      await db.runAsync(
        `INSERT INTO exercises (workout_id, name, order_index, sets, video_uri) VALUES (?, ?, ?, ?, ?)`,
        workoutId,
        exercises[i].name,
        exercises[i].order_index,
        JSON.stringify(exercises[i].sets),
        exercises[i].video_uri ?? null,
      );
    }
  });
}

// ---- Exercise autocomplete ----

export async function getExerciseNameSuggestions(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name, COUNT(*) as cnt FROM exercises WHERE name LIKE ? GROUP BY name ORDER BY cnt DESC LIMIT 6`,
    `${query}%`
  );
  return rows.map(r => r.name);
}

export async function getLastSetsForExercise(name: string): Promise<SetData[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ sets: string }>(
    `SELECT e.sets FROM exercises e
     JOIN workouts w ON w.id = e.workout_id
     WHERE e.name = ?
     ORDER BY w.created_at DESC LIMIT 1`,
    name
  );
  if (!row) return [];
  return JSON.parse(row.sets) as SetData[];
}

// ---- Routines ----

export async function getAllRoutines(): Promise<Routine[]> {
  const db = await getDatabase();
  return db.getAllAsync<Routine>(
    `SELECT * FROM routines ORDER BY is_builtin DESC, name ASC`
  );
}

export async function getRoutinesByCategory(category: string): Promise<Routine[]> {
  const db = await getDatabase();
  return db.getAllAsync<Routine>(
    `SELECT * FROM routines WHERE category = ? ORDER BY is_builtin DESC, name ASC`,
    category
  );
}

export async function getRoutineById(id: number): Promise<Routine | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Routine>(`SELECT * FROM routines WHERE id = ?`, id);
}

export async function getRoutineExercises(routineId: number): Promise<RoutineExercise[]> {
  const db = await getDatabase();
  return db.getAllAsync<RoutineExercise>(
    `SELECT * FROM routine_exercises WHERE routine_id = ? ORDER BY order_index ASC`,
    routineId
  );
}

export async function insertRoutine(
  input: NewRoutineInput,
  exercises: NewRoutineExerciseInput[],
): Promise<number> {
  const db = await getDatabase();
  let routineId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO routines (name, category, description, video_url, music_url, is_builtin) VALUES (?, ?, ?, ?, ?, 0)`,
      input.name,
      input.category,
      input.description ?? null,
      input.video_url ?? null,
      input.music_url ?? null,
    );
    routineId = result.lastInsertRowId;
    for (const ex of exercises) {
      await db.runAsync(
        `INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg, video_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        routineId,
        ex.name,
        ex.order_index,
        ex.suggested_sets,
        ex.suggested_reps,
        ex.suggested_weight_kg,
        ex.video_url ?? null,
      );
    }
  });
  return routineId;
}

export async function updateRoutine(
  id: number,
  input: NewRoutineInput,
  exercises: NewRoutineExerciseInput[],
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE routines SET name=?, category=?, description=?, video_url=?, music_url=? WHERE id=?`,
      input.name,
      input.category,
      input.description ?? null,
      input.video_url ?? null,
      input.music_url ?? null,
      id,
    );
    await db.runAsync(`DELETE FROM routine_exercises WHERE routine_id=?`, id);
    for (const ex of exercises) {
      await db.runAsync(
        `INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg, video_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        ex.name,
        ex.order_index,
        ex.suggested_sets,
        ex.suggested_reps,
        ex.suggested_weight_kg,
        ex.video_url ?? null,
      );
    }
  });
}

export async function deleteRoutine(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM routines WHERE id=? AND is_builtin=0`, id);
}

// ---- Stats ----

export async function getWorkoutStats(): Promise<WorkoutStats> {
  const db = await getDatabase();

  const countRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total FROM workouts`
  );
  const totalWorkouts = countRow?.total ?? 0;

  const volumeRow = await db.getFirstAsync<{ vol: number }>(`
    SELECT COALESCE(SUM(CAST(json_extract(s.value, '$.reps') AS REAL) * CAST(json_extract(s.value, '$.weight_kg') AS REAL)), 0) as vol
    FROM exercises e, json_each(e.sets) s
  `);
  const totalVolume = Math.round(volumeRow?.vol ?? 0);

  // Fetch all distinct workout dates for streak calculation
  const dateRows = await db.getAllAsync<{ d: string }>(
    `SELECT DISTINCT date(created_at, 'unixepoch') as d FROM workouts ORDER BY d ASC`
  );
  const dateSet = new Set(dateRows.map(r => r.d));

  // Calculate streaks walking backwards from today
  const today = new Date();
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  let checkDate = new Date(today);

  // Walk back from today to calculate current streak
  while (true) {
    const ds = checkDate.toISOString().slice(0, 10);
    if (dateSet.has(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  currentStreak = streak;

  // Calculate longest streak by walking all dates
  const allDates = dateRows.map(r => r.d).sort();
  if (allDates.length > 0) {
    let maxStreak = 1;
    let runStreak = 1;
    for (let i = 1; i < allDates.length; i++) {
      const prev = new Date(allDates[i - 1]);
      const curr = new Date(allDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        runStreak++;
        if (runStreak > maxStreak) maxStreak = runStreak;
      } else {
        runStreak = 1;
      }
    }
    longestStreak = maxStreak;
  }

  return { totalWorkouts, currentStreak, longestStreak, totalVolume };
}

export async function getWeeklyWorkoutCounts(weeksBack = 8): Promise<WeeklyWorkoutCount[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ weekStart: string; count: number }>(`
    SELECT
      date(created_at, 'unixepoch', 'weekday 0', '-6 days') as weekStart,
      COUNT(*) as count
    FROM workouts
    WHERE created_at >= strftime('%s', date('now', '-${weeksBack} weeks'))
    GROUP BY weekStart
    ORDER BY weekStart ASC
  `);

  // Build a map for quick lookup
  const rowMap = new Map<string, number>(rows.map(r => [r.weekStart, r.count]));

  // Generate labels for exactly weeksBack weeks
  const result: WeeklyWorkoutCount[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    // Monday of that week
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const label = `${monday.getMonth() + 1}/${monday.getDate()}`;
    result.push({ weekLabel: label, count: rowMap.get(key) ?? 0 });
  }
  return result;
}

export async function getMonthlyVolume(monthsBack = 6): Promise<MonthlyVolume[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ month: string; volume: number }>(`
    SELECT
      strftime('%Y-%m', created_at, 'unixepoch') as month,
      COALESCE(SUM(CAST(json_extract(s.value, '$.reps') AS REAL) * CAST(json_extract(s.value, '$.weight_kg') AS REAL)), 0) as volume
    FROM workouts w
    JOIN exercises e ON e.workout_id = w.id
    , json_each(e.sets) s
    WHERE w.created_at >= strftime('%s', date('now', '-${monthsBack} months'))
    GROUP BY month
    ORDER BY month ASC
  `);

  const rowMap = new Map<string, number>(rows.map(r => [r.month, Math.round(r.volume)]));

  const result: MonthlyVolume[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short' });
    result.push({ monthLabel: label, volume: rowMap.get(key) ?? 0 });
  }
  return result;
}

export async function getTopExercises(limit = 5): Promise<ExerciseFrequency[]> {
  const db = await getDatabase();
  return db.getAllAsync<ExerciseFrequency>(
    `SELECT name, COUNT(*) as count FROM exercises GROUP BY name ORDER BY count DESC LIMIT ?`,
    limit
  );
}

export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<PersonalRecord>(`
    SELECT e.name, MAX(CAST(json_extract(s.value, '$.weight_kg') AS REAL)) as max_weight_kg
    FROM exercises e, json_each(e.sets) s
    WHERE CAST(json_extract(s.value, '$.weight_kg') AS REAL) > 0
    GROUP BY e.name
    ORDER BY max_weight_kg DESC
  `);
}
