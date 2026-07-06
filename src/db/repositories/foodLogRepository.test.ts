import {
  insertFoodLogSql,
  updateFoodLogSql,
  deleteFoodLogSql,
  makeFoodLogRepository,
  FoodLogEntry,
} from './foodLogRepository';
import { QueryableExecutor } from '../migrator';

const sample: FoodLogEntry = {
  id: 'e1', logDate: '2026-07-06', meal: 'Lunch', foodId: 'seed-white-rice', recipeId: null,
  grams: 160, kcal: 208, protein: 4.3, carb: 44.8, fat: 0.5,
};

const sample2: FoodLogEntry = {
  id: 'e2', logDate: '2026-07-06', meal: 'Lunch', foodId: 'seed-chicken', recipeId: null,
  grams: 100, kcal: 165, protein: 31, carb: 0, fat: 3.6,
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

describe('foodLogRepository', () => {
  it('builds a parameterized insert with columns in order', () => {
    const { sql, params } = insertFoodLogSql(sample);
    expect(sql).toContain('INSERT INTO food_log_entries');
    expect(params).toEqual(['e1', '2026-07-06', 'Lunch', 'seed-white-rice', null, 160, 208, 4.3, 44.8, 0.5]);
  });

  it('add() forwards the parameterized insert', async () => {
    const { db, execCalls } = fakeExecutor([]);
    const repo = makeFoodLogRepository(db);
    await repo.add(sample);
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0].params).toEqual(['e1', '2026-07-06', 'Lunch', 'seed-white-rice', null, 160, 208, 4.3, 44.8, 0.5]);
  });

  describe('addMany()', () => {
    it('wraps inserts in a BEGIN...COMMIT transaction', async () => {
      const { db, execCalls } = fakeExecutor([]);
      const repo = makeFoodLogRepository(db);
      await repo.addMany([sample, sample2]);

      expect(execCalls).toHaveLength(4);
      expect(execCalls[0].sql).toBe('BEGIN');
      expect(execCalls[1].sql).toContain('INSERT INTO food_log_entries');
      expect(execCalls[1].params).toEqual(['e1', '2026-07-06', 'Lunch', 'seed-white-rice', null, 160, 208, 4.3, 44.8, 0.5]);
      expect(execCalls[2].sql).toContain('INSERT INTO food_log_entries');
      expect(execCalls[2].params).toEqual(['e2', '2026-07-06', 'Lunch', 'seed-chicken', null, 100, 165, 31, 0, 3.6]);
      expect(execCalls[3].sql).toBe('COMMIT');
    });

    it('rolls back and rethrows if an insert fails', async () => {
      // 1st exec call is BEGIN, 2nd is the first INSERT, 3rd (the 2nd INSERT) fails.
      const { db, execCalls } = fakeExecutor([], 3);
      const repo = makeFoodLogRepository(db);

      await expect(repo.addMany([sample, sample2])).rejects.toThrow('insert failed');

      expect(execCalls[0].sql).toBe('BEGIN');
      expect(execCalls[execCalls.length - 1].sql).toBe('ROLLBACK');
    });

    it('is a no-op for an empty entry list (no BEGIN issued)', async () => {
      const { db, execCalls } = fakeExecutor([]);
      const repo = makeFoodLogRepository(db);
      await repo.addMany([]);
      expect(execCalls).toHaveLength(0);
    });
  });

  it('entriesForDate() filters by date and maps rows back', async () => {
    const { db, queryCalls } = fakeExecutor([
      { id: 'e1', log_date: '2026-07-06', meal: 'Lunch', food_id: 'seed-white-rice', recipe_id: null,
        grams: 160, kcal: 208, protein: 4.3, carb: 44.8, fat: 0.5 },
    ]);
    const repo = makeFoodLogRepository(db);
    const rows = await repo.entriesForDate('2026-07-06');
    expect(queryCalls[0].params).toEqual(['2026-07-06']);
    expect(rows[0]).toEqual(sample);
  });

  it('updateFoodLogSql() builds a parameterized update in [grams,kcal,protein,carb,fat,id] order', () => {
    const { sql, params } = updateFoodLogSql(sample);
    expect(sql).toContain('UPDATE food_log_entries');
    expect(sql).toContain('WHERE id = ?');
    expect(params).toEqual([160, 208, 4.3, 44.8, 0.5, 'e1']);
  });

  it('deleteFoodLogSql() builds a parameterized delete keyed by id', () => {
    const { sql, params } = deleteFoodLogSql('e1');
    expect(sql).toContain('DELETE FROM food_log_entries');
    expect(sql).toContain('WHERE id = ?');
    expect(params).toEqual(['e1']);
  });

  describe('byId()', () => {
    it('maps the found row back to a FoodLogEntry', async () => {
      const { db, queryCalls } = fakeExecutor([
        { id: 'e1', log_date: '2026-07-06', meal: 'Lunch', food_id: 'seed-white-rice', recipe_id: null,
          grams: 160, kcal: 208, protein: 4.3, carb: 44.8, fat: 0.5 },
      ]);
      const repo = makeFoodLogRepository(db);
      const found = await repo.byId('e1');
      expect(queryCalls[0].params).toEqual(['e1']);
      expect(found).toEqual(sample);
    });

    it('returns null when no row is found', async () => {
      const { db } = fakeExecutor([]);
      const repo = makeFoodLogRepository(db);
      const found = await repo.byId('missing');
      expect(found).toBeNull();
    });
  });

  it('update() forwards the parameterized update to exec', async () => {
    const { db, execCalls } = fakeExecutor([]);
    const repo = makeFoodLogRepository(db);
    await repo.update(sample);
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0].sql).toContain('UPDATE food_log_entries');
    expect(execCalls[0].params).toEqual([160, 208, 4.3, 44.8, 0.5, 'e1']);
  });

  it('remove() forwards the parameterized delete to exec', async () => {
    const { db, execCalls } = fakeExecutor([]);
    const repo = makeFoodLogRepository(db);
    await repo.remove('e1');
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0].sql).toContain('DELETE FROM food_log_entries');
    expect(execCalls[0].params).toEqual(['e1']);
  });
});
