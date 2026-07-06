import { insertFoodLogSql, makeFoodLogRepository, FoodLogEntry } from './foodLogRepository';
import { QueryableExecutor } from '../migrator';

const sample: FoodLogEntry = {
  id: 'e1', logDate: '2026-07-06', meal: 'Lunch', foodId: 'seed-white-rice', recipeId: null,
  grams: 160, kcal: 208, protein: 4.3, carb: 44.8, fat: 0.5,
};

function fakeExecutor(rows: unknown[]) {
  const execCalls: { sql: string; params: unknown[] }[] = [];
  const queryCalls: { sql: string; params: unknown[] }[] = [];
  const db: QueryableExecutor = {
    async exec(sql: string, params: unknown[] = []) { execCalls.push({ sql, params }); },
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
});
