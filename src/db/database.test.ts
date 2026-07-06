import { makeExecutor, openDatabase, RawSqlite } from './database';

function fakeRaw(): RawSqlite & { execCalls: string[]; runCalls: { sql: string; params: unknown[] }[] } {
  const execCalls: string[] = [];
  const runCalls: { sql: string; params: unknown[] }[] = [];
  return {
    execCalls,
    runCalls,
    async execAsync(sql: string) { execCalls.push(sql); },
    async runAsync(sql: string, params: unknown[] = []) { runCalls.push({ sql, params }); return undefined; },
    async getFirstAsync<T>(sql: string) {
      if (sql.includes('user_version')) return { user_version: 0 } as unknown as T;
      return null;
    },
    async getAllAsync<T>() { return [] as unknown as T[]; },
  };
}

describe('sqlite adapter', () => {
  it('exec forwards param-less SQL to execAsync', async () => {
    const raw = fakeRaw();
    const exec = makeExecutor(raw);
    await exec.exec('CREATE TABLE t (id INTEGER)');
    expect(raw.execCalls).toContain('CREATE TABLE t (id INTEGER)');
  });

  it('exec routes parameterized SQL to runAsync', async () => {
    const raw = fakeRaw();
    const exec = makeExecutor(raw);
    await exec.exec('INSERT INTO t (id) VALUES (?)', [7]);
    expect(raw.runCalls).toEqual([{ sql: 'INSERT INTO t (id) VALUES (?)', params: [7] }]);
    expect(raw.execCalls).toEqual([]); // did NOT go through execAsync
  });

  it('openDatabase runs migrations and creates core tables', async () => {
    const raw = fakeRaw();
    await openDatabase(raw);
    const joined = raw.execCalls.join('\n');
    expect(joined).toContain('CREATE TABLE IF NOT EXISTS foods');
    expect(joined).toContain('CREATE TABLE IF NOT EXISTS logged_sets');
  });
});
