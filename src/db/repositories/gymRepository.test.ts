import {
  insertRoutineSql,
  insertRoutineDaySql,
  insertRoutineExerciseSql,
  insertExerciseSql,
  makeGymRepository,
} from './gymRepository';
import { Routine, RoutineDay, RoutineExercise } from '../../gym/routine';
import { Exercise } from '../../gym/exercises';
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
