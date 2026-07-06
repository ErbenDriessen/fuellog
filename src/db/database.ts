import { Migration, SqlExecutor, runMigrations } from './migrator';
import { migrations } from './schema';

export interface RawSqlite {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
}

export function makeExecutor(raw: RawSqlite): SqlExecutor {
  return {
    exec: (sql) => raw.execAsync(sql),
    async getVersion() {
      const row = await raw.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      return row?.user_version ?? 0;
    },
    async setVersion(v: number) {
      await raw.execAsync(`PRAGMA user_version = ${v}`);
    },
  };
}

export async function openDatabase(
  raw: RawSqlite,
  defs: Migration[] = migrations,
): Promise<SqlExecutor> {
  const exec = makeExecutor(raw);
  await runMigrations(exec, defs);
  return exec;
}
