import { insertFoodSql, makeFoodsRepository, Food } from './foodsRepository';
import { QueryableExecutor } from '../migrator';

const sample: Food = {
  id: 'f1', name: 'Rice', barcode: null, kcalPer100: 130, proteinPer100: 2.7,
  carbPer100: 28, fatPer100: 0.3, source: 'manual', createdAt: 1,
};

// A typed fake executor that records exec() calls and returns canned rows from queryAll().
function fakeExecutor(rows: unknown[]) {
  const execCalls: { sql: string; params: unknown[] }[] = [];
  const db: QueryableExecutor = {
    async exec(sql: string, params: unknown[] = []) { execCalls.push({ sql, params }); },
    async getVersion() { return 1; },
    async setVersion() {},
    async queryAll<T>() { return rows as T[]; },
  };
  return { db, execCalls };
}

describe('foodsRepository', () => {
  it('builds a parameterized insert with columns in order', () => {
    const { sql, params } = insertFoodSql(sample);
    expect(sql).toContain('INSERT INTO foods');
    expect(params).toEqual(['f1', 'Rice', null, 130, 2.7, 28, 0.3, 'manual', 1]);
  });

  it('add() forwards the parameterized insert to the executor', async () => {
    const { db, execCalls } = fakeExecutor([]);
    const repo = makeFoodsRepository(db);
    await repo.add(sample);
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0].sql).toContain('INSERT INTO foods');
    expect(execCalls[0].params).toEqual(['f1', 'Rice', null, 130, 2.7, 28, 0.3, 'manual', 1]);
  });

  it('all() maps snake_case rows back to Food objects', async () => {
    const { db } = fakeExecutor([
      { id: 'f1', name: 'Rice', barcode: null, kcal_per_100: 130, protein_per_100: 2.7,
        carb_per_100: 28, fat_per_100: 0.3, source: 'manual', created_at: 1 },
    ]);
    const repo = makeFoodsRepository(db);
    const rows = await repo.all();
    expect(rows[0]).toEqual(sample);
  });
});
