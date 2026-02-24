import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('pulseup.db');
  await createTables(_db);
  return _db;
}

async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS workouts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at       INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      notes            TEXT,
      video_uri        TEXT
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id   INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      order_index  INTEGER NOT NULL DEFAULT 0,
      sets         TEXT NOT NULL DEFAULT '[]',
      video_uri    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_exercises_workout_id ON exercises(workout_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_created_at  ON workouts(created_at DESC);

    CREATE TABLE IF NOT EXISTS routines (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL,
      description TEXT,
      video_url   TEXT,
      music_url   TEXT,
      is_builtin  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id          INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      name                TEXT NOT NULL,
      order_index         INTEGER NOT NULL DEFAULT 0,
      suggested_sets      INTEGER NOT NULL DEFAULT 3,
      suggested_reps      INTEGER NOT NULL DEFAULT 10,
      suggested_weight_kg REAL NOT NULL DEFAULT 0,
      video_url           TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON routine_exercises(routine_id);
    CREATE INDEX IF NOT EXISTS idx_routines_category ON routines(category);
  `);

  // Migrations for existing installs
  try {
    await db.execAsync(`ALTER TABLE exercises ADD COLUMN video_uri TEXT`);
  } catch { /* already exists */ }
  try {
    await db.execAsync(`ALTER TABLE workouts ADD COLUMN source_routine TEXT`);
  } catch { /* already exists */ }

  // Seed built-in routines idempotently
  await seedBuiltinRoutines(db);
}

async function seedBuiltinRoutines(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM routines WHERE is_builtin=1`
  );
  if (existing && existing.cnt > 0) return;

  await db.withTransactionAsync(async () => {
    // 1. Push Day — Upper Body
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      'Push Day', 'Upper Body', 'Chest, shoulders, triceps'
    );
    const pushDay = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='Push Day' AND is_builtin=1`
    );
    if (pushDay) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, pushDay.id, 'Bench Press', 0, 4, 8, 60);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, pushDay.id, 'Overhead Press', 1, 3, 8, 40);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, pushDay.id, 'Tricep Dip', 2, 3, 10, 0);
    }

    // 2. Pull Day — Upper Body
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      'Pull Day', 'Upper Body', 'Back and biceps'
    );
    const pullDay = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='Pull Day' AND is_builtin=1`
    );
    if (pullDay) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, pullDay.id, 'Pull-Up', 0, 4, 8, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, pullDay.id, 'Barbell Row', 1, 4, 8, 60);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, pullDay.id, 'Bicep Curl', 2, 3, 12, 15);
    }

    // 3. Squat & Hinge — Lower Body
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      'Squat & Hinge', 'Lower Body', 'Quads, hamstrings, glutes'
    );
    const squat = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='Squat & Hinge' AND is_builtin=1`
    );
    if (squat) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, squat.id, 'Back Squat', 0, 4, 5, 70);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, squat.id, 'Romanian Deadlift', 1, 3, 8, 60);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, squat.id, 'Leg Curl', 2, 3, 12, 40);
    }

    // 4. 5×5 Strength — Strength
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      '5×5 Strength', 'Strength', 'Classic compound strength program'
    );
    const fiveByFive = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='5×5 Strength' AND is_builtin=1`
    );
    if (fiveByFive) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, fiveByFive.id, 'Squat', 0, 5, 5, 80);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, fiveByFive.id, 'Bench Press', 1, 5, 5, 60);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, fiveByFive.id, 'Barbell Row', 2, 5, 5, 60);
    }

    // 5. Tabata Blast — HIIT
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      'Tabata Blast', 'HIIT', '20 sec on, 10 sec off intervals'
    );
    const tabata = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='Tabata Blast' AND is_builtin=1`
    );
    if (tabata) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, tabata.id, 'Burpees', 0, 8, 20, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, tabata.id, 'Mountain Climbers', 1, 8, 20, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, tabata.id, 'Jump Squat', 2, 8, 20, 0);
    }

    // 6. LISS Cardio — Cardio
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      'LISS Cardio', 'Cardio', 'Low intensity steady state cardio'
    );
    const liss = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='LISS Cardio' AND is_builtin=1`
    );
    if (liss) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, liss.id, 'Steady Run', 0, 1, 30, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, liss.id, 'Cool-down Walk', 1, 1, 5, 0);
    }

    // 7. Morning Flow — Mobility
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      'Morning Flow', 'Mobility', 'Start your day with movement'
    );
    const flow = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='Morning Flow' AND is_builtin=1`
    );
    if (flow) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, flow.id, 'Cat-Cow', 0, 2, 10, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, flow.id, 'Hip Stretch', 1, 2, 30, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, flow.id, 'Thoracic Rotation', 2, 2, 10, 0);
    }

    // 8. Ab Circuit — Core
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      'Ab Circuit', 'Core', 'Core strength and stability'
    );
    const abs = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='Ab Circuit' AND is_builtin=1`
    );
    if (abs) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, abs.id, 'Plank', 0, 3, 60, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, abs.id, 'Hanging Leg Raise', 1, 3, 12, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, abs.id, 'Cable Crunch', 2, 3, 15, 20);
    }

    // 9. Full Body Compound — Full Body
    await db.runAsync(
      `INSERT INTO routines (name, category, description, is_builtin) VALUES (?, ?, ?, 1)`,
      'Full Body Compound', 'Full Body', 'Total body compound movements'
    );
    const fullBody = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM routines WHERE name='Full Body Compound' AND is_builtin=1`
    );
    if (fullBody) {
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, fullBody.id, 'Deadlift', 0, 3, 5, 100);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, fullBody.id, 'Push-Up', 1, 3, 15, 0);
      await db.runAsync(`INSERT INTO routine_exercises (routine_id, name, order_index, suggested_sets, suggested_reps, suggested_weight_kg) VALUES (?, ?, ?, ?, ?, ?)`, fullBody.id, 'Dumbbell Row', 2, 3, 10, 20);
    }
  });
}
