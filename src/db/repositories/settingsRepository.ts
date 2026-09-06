import { QueryableExecutor } from '../migrator';
import { NumbersMode } from '../../food/phrasing';

// Defaults for first launch, before onboarding writes anything.
export const DEFAULT_NUMBERS_MODE: NumbersMode = 'gentle';
export const DEFAULT_WATER_GOAL = 8;
export const DEFAULT_REFLECTION_TIME = '21:00';

interface SettingRow {
  value: string;
}

export function makeSettingsRepository(db: QueryableExecutor) {
  async function get(key: string): Promise<string | null> {
    const rows = await db.queryAll<SettingRow>('SELECT value FROM settings WHERE key = ?', [key]);
    return rows.length ? rows[0].value : null;
  }

  async function set(key: string, value: string): Promise<void> {
    await db.exec('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }

  return {
    get,
    set,

    async getNumbersMode(): Promise<NumbersMode> {
      return (await get('numbers_mode')) === 'exact' ? 'exact' : 'gentle';
    },
    async setNumbersMode(mode: NumbersMode): Promise<void> {
      await set('numbers_mode', mode);
    },

    async getWaterGoal(): Promise<number> {
      const raw = await get('water_goal');
      const n = raw === null ? NaN : Number(raw);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_WATER_GOAL;
    },
    async setWaterGoal(glasses: number): Promise<void> {
      await set('water_goal', String(glasses));
    },

    async isOnboarded(): Promise<boolean> {
      return (await get('onboarded')) === 'true';
    },
    async setOnboarded(value: boolean): Promise<void> {
      await set('onboarded', value ? 'true' : 'false');
    },

    async getReflectionTime(): Promise<string> {
      return (await get('reflection_time')) ?? DEFAULT_REFLECTION_TIME;
    },
    async setReflectionTime(time: string): Promise<void> {
      await set('reflection_time', time);
    },
  };
}

export type SettingsRepository = ReturnType<typeof makeSettingsRepository>;
