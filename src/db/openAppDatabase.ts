import * as SQLite from 'expo-sqlite';
import { openDatabase } from './database';
import { QueryableExecutor } from './migrator';
import type { RawSqlite } from './database';

// Opens the real on-device database, runs migrations, returns a ready executor.
// The expo-sqlite handle structurally satisfies RawSqlite (execAsync/runAsync/
// getFirstAsync/getAllAsync), so we adapt it directly.
export async function openAppDatabase(name = 'fuellog.db'): Promise<QueryableExecutor> {
  const handle = await SQLite.openDatabaseAsync(name);
  return openDatabase(handle as unknown as RawSqlite);
}
