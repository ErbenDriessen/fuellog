import { insertDailyTargetSql, makeDailyTargetsRepository, DailyTarget } from './dailyTargetsRepository';
import { QueryableExecutor } from '../migrator';

const sample: DailyTarget = {
  id: 'target-2026-07-06', kcal: 2400, protein: 165, carb: 240, fat: 70, effectiveFrom: '2026-07-06',
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

describe('dailyTargetsRepository', () => {
  it('builds a parameterized upsert with columns in order', () => {
    const { sql, params } = insertDailyTargetSql(sample);
    expect(sql).toContain('INSERT OR REPLACE INTO daily_targets');
    expect(params).toEqual(['target-2026-07-06', 2400, 165, 240, 70, '2026-07-06']);
  });

  it('setTarget() forwards the parameterized upsert to the executor', async () => {
    const { db, execCalls } = fakeExecutor([]);
    const repo = makeDailyTargetsRepository(db);
    await repo.setTarget(sample);
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0].sql).toContain('INSERT OR REPLACE INTO daily_targets');
    expect(execCalls[0].params).toEqual(['target-2026-07-06', 2400, 165, 240, 70, '2026-07-06']);
  });

  it('setTarget() called twice for the same id issues INSERT OR REPLACE both times', async () => {
    const { db, execCalls } = fakeExecutor([]);
    const repo = makeDailyTargetsRepository(db);
    await repo.setTarget(sample);
    await repo.setTarget({ ...sample, kcal: 2500 });
    expect(execCalls).toHaveLength(2);
    expect(execCalls[0].sql).toContain('INSERT OR REPLACE');
    expect(execCalls[1].sql).toContain('INSERT OR REPLACE');
    expect(execCalls[1].params).toEqual(['target-2026-07-06', 2500, 165, 240, 70, '2026-07-06']);
  });

  it('current() maps the latest snake_case row to a DailyTarget', async () => {
    const { db } = fakeExecutor([
      { id: 'target-2026-07-06', kcal: 2400, protein: 165, carb: 240, fat: 70, effective_from: '2026-07-06' },
    ]);
    const repo = makeDailyTargetsRepository(db);
    const t = await repo.current();
    expect(t).toEqual(sample);
  });

  it('current() returns null when no target rows exist', async () => {
    const { db } = fakeExecutor([]);
    const repo = makeDailyTargetsRepository(db);
    const t = await repo.current();
    expect(t).toBeNull();
  });
});
