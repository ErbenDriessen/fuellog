import { QueryableExecutor } from '../migrator';

export type EnergyLevel = 'low' | 'okay' | 'good' | 'bright';

export const ENERGY_LEVELS: EnergyLevel[] = ['low', 'okay', 'good', 'bright'];

interface EnergyRow {
  level: string;
}

// A daily energy check-in, one row per day keyed by 'YYYY-MM-DD'.
export function makeEnergyRepository(db: QueryableExecutor) {
  return {
    async getForDate(logDate: string): Promise<EnergyLevel | null> {
      const rows = await db.queryAll<EnergyRow>('SELECT level FROM energy_checkins WHERE log_date = ?', [logDate]);
      if (!rows.length) return null;
      const level = rows[0].level;
      return (ENERGY_LEVELS as string[]).includes(level) ? (level as EnergyLevel) : null;
    },
    async setForDate(logDate: string, level: EnergyLevel): Promise<void> {
      await db.exec('INSERT OR REPLACE INTO energy_checkins (log_date, level) VALUES (?, ?)', [logDate, level]);
    },
  };
}
