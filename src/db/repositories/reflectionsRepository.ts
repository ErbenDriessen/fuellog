import { QueryableExecutor } from '../migrator';

interface ReflectionRow {
  body: string;
}

// An evening reflection, one row per day keyed by 'YYYY-MM-DD'. An empty body
// clears the row so a wiped note doesn't linger.
export function makeReflectionsRepository(db: QueryableExecutor) {
  return {
    async getForDate(logDate: string): Promise<string | null> {
      const rows = await db.queryAll<ReflectionRow>('SELECT body FROM reflections WHERE log_date = ?', [logDate]);
      return rows.length ? rows[0].body : null;
    },
    async setForDate(logDate: string, body: string, now: number): Promise<void> {
      if (body.trim().length === 0) {
        await db.exec('DELETE FROM reflections WHERE log_date = ?', [logDate]);
        return;
      }
      await db.exec(
        'INSERT OR REPLACE INTO reflections (log_date, body, created_at) VALUES (?, ?, ?)',
        [logDate, body, now],
      );
    },
  };
}
