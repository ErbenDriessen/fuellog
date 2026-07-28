import { QueryableExecutor } from '../migrator';
import { Routine, RoutineDay, RoutineExercise } from '../../gym/routine';
import { Exercise } from '../../gym/exercises';

export function insertRoutineSql(r: Routine): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO routines (id, name, rotation_pointer, created_at) VALUES (?, ?, ?, ?)`,
    params: [r.id, r.name, r.rotationPointer, r.createdAt],
  };
}

export function insertRoutineDaySql(d: RoutineDay): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO routine_days (id, routine_id, name, sequence, pinned_weekday) VALUES (?, ?, ?, ?, ?)`,
    params: [d.id, d.routineId, d.name, d.sequence, d.pinnedWeekday],
  };
}

export function insertRoutineExerciseSql(e: RoutineExercise): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO routine_exercises (id, routine_day_id, exercise_id, target_sets, target_reps, position)
          VALUES (?, ?, ?, ?, ?, ?)`,
    params: [e.id, e.routineDayId, e.exerciseId, e.targetSets, e.targetReps, e.position],
  };
}

export function insertExerciseSql(e: Exercise): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO exercises (id, slug, name, muscle_group, equipment) VALUES (?, ?, ?, ?, ?)`,
    params: [e.id, e.slug, e.name, e.muscleGroup, e.equipment],
  };
}

interface RoutineRow { id: string; name: string; rotation_pointer: number; created_at: number }
interface RoutineDayRow { id: string; routine_id: string; name: string; sequence: number; pinned_weekday: number | null }
interface RoutineExerciseRow {
  id: string; routine_day_id: string; exercise_id: string; target_sets: number; target_reps: number; position: number;
}
interface ExerciseRow { id: string; slug: string; name: string; muscle_group: string; equipment: string }

function rowToRoutine(r: RoutineRow): Routine {
  return { id: r.id, name: r.name, rotationPointer: r.rotation_pointer, createdAt: r.created_at };
}
function rowToDay(r: RoutineDayRow): RoutineDay {
  return { id: r.id, routineId: r.routine_id, name: r.name, sequence: r.sequence, pinnedWeekday: r.pinned_weekday };
}
function rowToRoutineExercise(r: RoutineExerciseRow): RoutineExercise {
  return {
    id: r.id, routineDayId: r.routine_day_id, exerciseId: r.exercise_id,
    targetSets: r.target_sets, targetReps: r.target_reps, position: r.position,
  };
}
function rowToExercise(r: ExerciseRow): Exercise {
  return { id: r.id, slug: r.slug, name: r.name, muscleGroup: r.muscle_group, equipment: r.equipment };
}

export function makeGymRepository(db: QueryableExecutor) {
  return {
    // Atomic: the routine plus every day and planned exercise in one transaction.
    async saveRoutine(routine: Routine, days: RoutineDay[], exercises: RoutineExercise[]): Promise<void> {
      await db.exec('BEGIN');
      try {
        const r = insertRoutineSql(routine);
        await db.exec(r.sql, r.params);
        for (const d of days) {
          const q = insertRoutineDaySql(d);
          await db.exec(q.sql, q.params);
        }
        for (const e of exercises) {
          const q = insertRoutineExerciseSql(e);
          await db.exec(q.sql, q.params);
        }
        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }
    },
    async routines(): Promise<Routine[]> {
      const rows = await db.queryAll<RoutineRow>('SELECT * FROM routines ORDER BY created_at DESC', []);
      return rows.map(rowToRoutine);
    },
    async daysFor(routineId: string): Promise<RoutineDay[]> {
      const rows = await db.queryAll<RoutineDayRow>(
        'SELECT * FROM routine_days WHERE routine_id = ? ORDER BY sequence',
        [routineId],
      );
      return rows.map(rowToDay);
    },
    async exercisesFor(routineDayId: string): Promise<RoutineExercise[]> {
      const rows = await db.queryAll<RoutineExerciseRow>(
        'SELECT * FROM routine_exercises WHERE routine_day_id = ? ORDER BY position',
        [routineDayId],
      );
      return rows.map(rowToRoutineExercise);
    },
    async setRotationPointer(routineId: string, pointer: number): Promise<void> {
      await db.exec('UPDATE routines SET rotation_pointer = ? WHERE id = ?', [pointer, routineId]);
    },
    async allExercises(): Promise<Exercise[]> {
      const rows = await db.queryAll<ExerciseRow>('SELECT * FROM exercises ORDER BY name', []);
      return rows.map(rowToExercise);
    },
    async addExercise(e: Exercise): Promise<void> {
      const q = insertExerciseSql(e);
      await db.exec(q.sql, q.params);
    },
  };
}
