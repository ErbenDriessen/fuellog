import { Migration, QueryableExecutor, runMigrations } from './migrator';
import { migrations } from './schema';

// The subset of the expo-sqlite database handle we depend on. execAsync runs
// param-less DDL (and multi-statement scripts); runAsync is the parameterized
// write API; getFirstAsync/getAllAsync are parameterized reads.
export interface RawSqlite {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export function makeExecutor(raw: RawSqlite): QueryableExecutor {
  return {
    async exec(sql: string, params?: unknown[]) {
      if (params && params.length > 0) {
        await raw.runAsync(sql, params);
      } else {
        await raw.execAsync(sql);
      }
    },
    async getVersion() {
      const row = await raw.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      return row?.user_version ?? 0;
    },
    async setVersion(v: number) {
      await raw.execAsync(`PRAGMA user_version = ${v}`);
    },
    queryAll: (sql, params) => raw.getAllAsync(sql, params ?? []),
  };
}

export async function openDatabase(
  raw: RawSqlite,
  defs: Migration[] = migrations,
): Promise<QueryableExecutor> {
  const exec = makeExecutor(raw);
  await runMigrations(exec, defs);
  return exec;
}
