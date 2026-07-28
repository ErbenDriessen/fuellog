import {
  insertRoutineSql,
  insertRoutineDaySql,
  insertRoutineExerciseSql,
  insertExerciseSql,
  insertWorkoutSessionSql,
  insertLoggedSetSql,
  makeGymRepository,
} from './gymRepository';
import { Routine, RoutineDay, RoutineExercise } from '../../gym/routine';
import { Exercise } from '../../gym/exercises';
import { WorkoutSession, LoggedSet } from '../../gym/session';
import { QueryableExecutor } from '../migrator';

const routine: Routine = { id: 'r1', name: 'My PPL', rotationPointer: 0, createdAt: 1000 };
const days: RoutineDay[] = [
  { id: 'd0', routineId: 'r1', name: 'Push', sequence: 0, pinnedWeekday: null },
  { id: 'd1', routineId: 'r1', name: 'Pull', sequence: 1, pinnedWeekday: 3 },
];
const exercises: RoutineExercise[] = [
  { id: 're0', routineDayId: 'd0', exerciseId: 'ex-bench-press', targetSets: 3, targetReps: 8, position: 0 },
];
const exercise: Exercise = {
  id: 'ex-bench-press', slug: 'bench-press', name: 'Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell',
};

function fakeExecutor(rows: unknown[], failOnExecCall?: number) {
  const execCalls: { sql: string; params: unknown[] }[] = [];
  const queryCalls: { sql: string; params: unknown[] }[] = [];
  const db: QueryableExecutor = {
    async exec(sql: string, params: unknown[] = []) {
      execCalls.push({ sql, params });
      if (failOnExecCall !== undefined && execCalls.length === failOnExecCall) {
        throw new Error('insert failed');
      }
    },
    async getVersion() { return 1; },
    async setVersion() {},
    async queryAll<T>(sql: string, params: unknown[] = []) { queryCalls.push({ sql, params }); return rows as T[]; },
  };
  return { db, execCalls, queryCalls };
}

describe('gymRepository sql builders', () => {
  it('insertRoutineSql builds [id, name, rotation_pointer, created_at]', () => {
    const { sql, params } = insertRoutineSql(routine);
    expect(sql).toContain('INSERT INTO routines');
    expect(params).toEqual(['r1', 'My PPL', 0, 1000]);
  });

  it('insertRoutineDaySql builds [id, routine_id, name, sequence, pinned_weekday]', () => {
    expect(insertRoutineDaySql(days[1]).params).toEqual(['d1', 'r1', 'Pull', 1, 3]);
  });

  it('insertRoutineExerciseSql builds [id, routine_day_id, exercise_id, target_sets, target_reps, position]', () => {
    expect(insertRoutineExerciseSql(exercises[0]).params).toEqual(['re0', 'd0', 'ex-bench-press', 3, 8, 0]);
  });

  it('insertExerciseSql builds [id, slug, name, muscle_group, equipment]', () => {
    expect(insertExerciseSql(exercise).params).toEqual([
      'ex-bench-press', 'bench-press', 'Barbell Bench Press', 'Chest', 'Barbell',
    ]);
  });
});

describe('gymRepository.saveRoutine', () => {
  it('writes the routine, days, and exercises in one transaction', async () => {
    const { db, execCalls } = fakeExecutor([]);
    await makeGymRepository(db).saveRoutine(routine, days, exercises);
    expect(execCalls[0].sql).toBe('BEGIN');
    expect(execCalls.map((c) => c.sql).filter((s) => s.includes('INSERT INTO routines'))).toHaveLength(1);
    expect(execCalls.map((c) => c.sql).filter((s) => s.includes('INSERT INTO routine_days'))).toHaveLength(2);
    expect(execCalls.map((c) => c.sql).filter((s) => s.includes('INSERT INTO routine_exercises'))).toHaveLength(1);
    expect(execCalls[execCalls.length - 1].sql).toBe('COMMIT');
  });

  it('rolls back and rethrows when a write fails', async () => {
    const { db, execCalls } = fakeExecutor([], 2); // fail on the routine insert
    await expect(makeGymRepository(db).saveRoutine(routine, days, exercises)).rejects.toThrow('insert failed');
    expect(execCalls[execCalls.length - 1].sql).toBe('ROLLBACK');
  });
});

describe('gymRepository reads', () => {
  it('routines() maps rows and orders by newest first', async () => {
    const { db, queryCalls } = fakeExecutor([
      { id: 'r1', name: 'My PPL', rotation_pointer: 2, created_at: 1000 },
    ]);
    const rows = await makeGymRepository(db).routines();
    expect(queryCalls[0].sql).toContain('ORDER BY created_at DESC');
    expect(rows).toEqual([{ id: 'r1', name: 'My PPL', rotationPointer: 2, createdAt: 1000 }]);
  });

  it('daysFor() filters by routine and orders by sequence', async () => {
    const { db, queryCalls } = fakeExecutor([
      { id: 'd1', routine_id: 'r1', name: 'Pull', sequence: 1, pinned_weekday: 3 },
    ]);
    const rows = await makeGymRepository(db).daysFor('r1');
    expect(queryCalls[0].params).toEqual(['r1']);
    expect(queryCalls[0].sql).toContain('ORDER BY sequence');
    expect(rows).toEqual([{ id: 'd1', routineId: 'r1', name: 'Pull', sequence: 1, pinnedWeekday: 3 }]);
  });

  it('daysFor() maps a null pinned_weekday back to null', async () => {
    const { db } = fakeExecutor([
      { id: 'd0', routine_id: 'r1', name: 'Push', sequence: 0, pinned_weekday: null },
    ]);
    const rows = await makeGymRepository(db).daysFor('r1');
    expect(rows[0].pinnedWeekday).toBeNull();
  });

  it('exercisesFor() filters by day and orders by position', async () => {
    const { db, queryCalls } = fakeExecutor([
      { id: 're0', routine_day_id: 'd0', exercise_id: 'ex-bench-press', target_sets: 3, target_reps: 8, position: 0 },
    ]);
    const rows = await makeGymRepository(db).exercisesFor('d0');
    expect(queryCalls[0].params).toEqual(['d0']);
    expect(queryCalls[0].sql).toContain('ORDER BY position');
    expect(rows).toEqual([exercises[0]]);
  });
});

describe('gymRepository.setRotationPointer', () => {
  it('updates the pointer for the routine', async () => {
    const { db, execCalls } = fakeExecutor([]);
    await makeGymRepository(db).setRotationPointer('r1', 2);
    expect(execCalls[0].sql).toContain('UPDATE routines');
    expect(execCalls[0].sql).toContain('rotation_pointer');
    expect(execCalls[0].params).toEqual([2, 'r1']);
  });
});

describe('gymRepository exercise catalogue', () => {
  it('allExercises() maps rows back to Exercise objects', async () => {
    const { db } = fakeExecutor([
      { id: 'ex-bench-press', slug: 'bench-press', name: 'Barbell Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
    ]);
    const rows = await makeGymRepository(db).allExercises();
    expect(rows).toEqual([exercise]);
  });

  it('addExercise() inserts one exercise row', async () => {
    const { db, execCalls } = fakeExecutor([]);
    await makeGymRepository(db).addExercise(exercise);
    expect(execCalls[0].sql).toContain('INSERT INTO exercises');
    expect(execCalls[0].params).toEqual(['ex-bench-press', 'bench-press', 'Barbell Bench Press', 'Chest', 'Barbell']);
  });
});

describe('gym sessions', () => {
  const session: WorkoutSession = { id: 's1', routineDayId: 'd0', startedAt: 2000, finishedAt: 3000 };
  const sets: LoggedSet[] = [
    { id: 'ls0', sessionId: 's1', exerciseId: 'ex-bench-press', setNumber: 0, reps: 8, weight: 60 },
    { id: 'ls1', sessionId: 's1', exerciseId: 'ex-bench-press', setNumber: 1, reps: 7, weight: 60 },
  ];

  describe('sql builders', () => {
    it('insertWorkoutSessionSql builds [id, routine_day_id, started_at, finished_at]', () => {
      const { sql, params } = insertWorkoutSessionSql(session);
      expect(sql).toContain('INSERT INTO workout_sessions');
      expect(params).toEqual(['s1', 'd0', 2000, 3000]);
    });

    it('insertLoggedSetSql builds [id, session_id, exercise_id, set_number, reps, weight]', () => {
      const { sql, params } = insertLoggedSetSql(sets[0]);
      expect(sql).toContain('INSERT INTO logged_sets');
      expect(params).toEqual(['ls0', 's1', 'ex-bench-press', 0, 8, 60]);
    });
  });

  describe('saveSession', () => {
    it('writes the session and every logged set in one transaction', async () => {
      const { db, execCalls } = fakeExecutor([]);
      await makeGymRepository(db).saveSession(session, sets);
      expect(execCalls[0].sql).toBe('BEGIN');
      expect(execCalls.map((c) => c.sql).filter((s) => s.includes('INSERT INTO workout_sessions'))).toHaveLength(1);
      expect(execCalls.map((c) => c.sql).filter((s) => s.includes('INSERT INTO logged_sets'))).toHaveLength(2);
      expect(execCalls[execCalls.length - 1].sql).toBe('COMMIT');
    });

    it('rolls back and rethrows when a write fails', async () => {
      const { db, execCalls } = fakeExecutor([], 2); // fail on the session insert
      await expect(makeGymRepository(db).saveSession(session, sets)).rejects.toThrow('insert failed');
      expect(execCalls[execCalls.length - 1].sql).toBe('ROLLBACK');
    });
  });

  describe('reads', () => {
    it('sessions() maps rows and orders by newest first', async () => {
      const { db, queryCalls } = fakeExecutor([
        { id: 's1', routine_day_id: 'd0', started_at: 2000, finished_at: 3000 },
      ]);
      const rows = await makeGymRepository(db).sessions();
      expect(queryCalls[0].sql).toContain('ORDER BY started_at DESC');
      expect(rows).toEqual([session]);
    });

    it('sessions() maps a null finished_at back to null', async () => {
      const { db } = fakeExecutor([
        { id: 's2', routine_day_id: null, started_at: 4000, finished_at: null },
      ]);
      const rows = await makeGymRepository(db).sessions();
      expect(rows[0].finishedAt).toBeNull();
      expect(rows[0].routineDayId).toBeNull();
    });

    it('setsForSession() passes [id] and maps rows in set order', async () => {
      const { db, queryCalls } = fakeExecutor([
        { id: 'ls0', session_id: 's1', exercise_id: 'ex-bench-press', set_number: 0, reps: 8, weight: 60 },
        { id: 'ls1', session_id: 's1', exercise_id: 'ex-bench-press', set_number: 1, reps: 7, weight: 60 },
      ]);
      const rows = await makeGymRepository(db).setsForSession('s1');
      expect(queryCalls[0].params).toEqual(['s1']);
      expect(queryCalls[0].sql).toContain('ORDER BY set_number');
      expect(rows).toEqual(sets);
    });

    it('lastSetsForExercise() passes [id, id] and maps rows', async () => {
      const { db, queryCalls } = fakeExecutor([
        { id: 'ls0', session_id: 's1', exercise_id: 'ex-bench-press', set_number: 0, reps: 8, weight: 60 },
      ]);
      const rows = await makeGymRepository(db).lastSetsForExercise('ex-bench-press');
      expect(queryCalls[0].params).toEqual(['ex-bench-press', 'ex-bench-press']);
      expect(queryCalls[0].sql).toContain('ORDER BY set_number');
      expect(rows).toEqual([sets[0]]);
    });
  });
});
