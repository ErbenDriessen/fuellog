import { Migration } from './migrator';

export const migrations: Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS foods (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, barcode TEXT,
        kcal_per_100 REAL NOT NULL, protein_per_100 REAL NOT NULL,
        carb_per_100 REAL NOT NULL, fat_per_100 REAL NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual', created_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS recipe_items (
        id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, food_id TEXT NOT NULL,
        grams REAL NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS food_log_entries (
        id TEXT PRIMARY KEY, log_date TEXT NOT NULL, meal TEXT NOT NULL,
        food_id TEXT, recipe_id TEXT, grams REAL NOT NULL,
        kcal REAL NOT NULL, protein REAL NOT NULL, carb REAL NOT NULL, fat REAL NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS daily_targets (
        id TEXT PRIMARY KEY, kcal REAL NOT NULL, protein REAL NOT NULL,
        carb REAL NOT NULL, fat REAL NOT NULL, effective_from TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, muscle_group TEXT, equipment TEXT)`,
      `CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, rotation_pointer INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS routine_days (
        id TEXT PRIMARY KEY, routine_id TEXT NOT NULL, name TEXT NOT NULL,
        sequence INTEGER NOT NULL, pinned_weekday INTEGER)`,
      `CREATE TABLE IF NOT EXISTS routine_exercises (
        id TEXT PRIMARY KEY, routine_day_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
        target_sets INTEGER NOT NULL, target_reps INTEGER NOT NULL, position INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY, routine_day_id TEXT, started_at INTEGER NOT NULL,
        finished_at INTEGER)`,
      `CREATE TABLE IF NOT EXISTS logged_sets (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
        set_number INTEGER NOT NULL, reps INTEGER NOT NULL, weight REAL NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS body_metrics (
        id TEXT PRIMARY KEY, metric_date TEXT NOT NULL, weight REAL NOT NULL)`,
    ],
  },
  {
    // Exercises carry a stable slug so seeded library entries round-trip and can
    // be reconciled by slug when the built-in catalogue grows in later versions.
    version: 2,
    up: [`ALTER TABLE exercises ADD COLUMN slug TEXT`],
  },
  {
    // Kind redesign: a simple key/value settings store. Holds numbers_mode
    // ('gentle' | 'exact'), water_goal, onboarded and reflection_time.
    version: 3,
    up: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
    ],
  },
  {
    // Kind redesign, Today screen: gentle daily self-care logs, one row per day.
    version: 4,
    up: [
      `CREATE TABLE IF NOT EXISTS water_log (
        log_date TEXT PRIMARY KEY, glasses INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS energy_checkins (
        log_date TEXT PRIMARY KEY, level TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS reflections (
        log_date TEXT PRIMARY KEY, body TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    ],
  },
];
