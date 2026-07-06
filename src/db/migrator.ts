export interface Migration {
  version: number;
  up: string[];
}

export interface SqlExecutor {
  exec(sql: string, params?: unknown[]): Promise<void>;
  getVersion(): Promise<number>;
  setVersion(v: number): Promise<void>;
}

export interface QueryableExecutor extends SqlExecutor {
  queryAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export async function runMigrations(db: SqlExecutor, defs: Migration[]): Promise<number> {
  const current = await db.getVersion();
  const pending = defs.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
  for (const m of pending) {
    for (const stmt of m.up) {
      await db.exec(stmt);
    }
    await db.setVersion(m.version);
  }
  return pending.length ? pending[pending.length - 1].version : current;
}
