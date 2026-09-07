import { QueryableExecutor } from '../migrator';

interface WaterRow {
  glasses: number;
}

// Water intake, one row per day, keyed by 'YYYY-MM-DD'.
export function makeWaterRepository(db: QueryableExecutor) {
  return {
    async getForDate(logDate: string): Promise<number> {
      const rows = await db.queryAll<WaterRow>('SELECT glasses FROM water_log WHERE log_date = ?', [logDate]);
      return rows.length ? rows[0].glasses : 0;
    },
    async setForDate(logDate: string, glasses: number): Promise<void> {
      await db.exec('INSERT OR REPLACE INTO water_log (log_date, glasses) VALUES (?, ?)', [logDate, glasses]);
    },
  };
}
