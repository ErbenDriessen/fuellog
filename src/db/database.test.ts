import { makeExecutor, openDatabase, RawSqlite } from './database';

function fakeRaw(): RawSqlite & { calls: string[]; store: Record<string, number> } {
  const store: Record<string, number> = {};
  const calls: string[] = [];
  return {
    calls, store,
    async execAsync(sql: string) { calls.push(sql); },
    async getFirstAsync<T>(sql: string) {
      if (sql.includes('user_version')) return { user_version: store.v ?? 0 } as unknown as T;
      return null;
    },
  };
}

describe('sqlite adapter', () => {
  it('exec forwards SQL to the raw handle', async () => {
    const raw = fakeRaw();
    const exec = makeExecutor(raw);
    await exec.exec('CREATE TABLE t (id INTEGER)');
    expect(raw.calls).toContain('CREATE TABLE t (id INTEGER)');
  });

  it('openDatabase runs migrations and creates core tables', async () => {
    const raw = fakeRaw();
    await openDatabase(raw);
    const joined = raw.calls.join('\n');
    expect(joined).toContain('CREATE TABLE IF NOT EXISTS foods');
    expect(joined).toContain('CREATE TABLE IF NOT EXISTS logged_sets');
  });
});
