import { makeSettingsRepository } from './settingsRepository';
import { QueryableExecutor } from '../migrator';

// A minimal in-memory fake of the settings table, enough to exercise the
// repository's typed helpers and defaults without the native SQLite module.
function fakeExecutor(): QueryableExecutor {
  const store = new Map<string, string>();
  return {
    async exec(sql: string, params: unknown[] = []): Promise<void> {
      if (/INSERT OR REPLACE INTO settings/i.test(sql)) {
        store.set(String(params[0]), String(params[1]));
      }
    },
    async queryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      if (/SELECT value FROM settings WHERE key/i.test(sql)) {
        const key = String(params[0]);
        return store.has(key) ? ([{ value: store.get(key) }] as unknown as T[]) : [];
      }
      return [];
    },
    async getVersion() {
      return 0;
    },
    async setVersion() {},
  };
}

describe('settingsRepository', () => {
  it('defaults numbers mode to gentle and round-trips a change', async () => {
    const repo = makeSettingsRepository(fakeExecutor());
    expect(await repo.getNumbersMode()).toBe('gentle');
    await repo.setNumbersMode('exact');
    expect(await repo.getNumbersMode()).toBe('exact');
    await repo.setNumbersMode('gentle');
    expect(await repo.getNumbersMode()).toBe('gentle');
  });

  it('defaults the water goal to 8 and ignores invalid stored values', async () => {
    const repo = makeSettingsRepository(fakeExecutor());
    expect(await repo.getWaterGoal()).toBe(8);
    await repo.setWaterGoal(6);
    expect(await repo.getWaterGoal()).toBe(6);
    await repo.set('water_goal', 'nonsense');
    expect(await repo.getWaterGoal()).toBe(8);
  });

  it('reports onboarded only after it is set true', async () => {
    const repo = makeSettingsRepository(fakeExecutor());
    expect(await repo.isOnboarded()).toBe(false);
    await repo.setOnboarded(true);
    expect(await repo.isOnboarded()).toBe(true);
    await repo.setOnboarded(false);
    expect(await repo.isOnboarded()).toBe(false);
  });

  it('defaults the reflection time to 21:00', async () => {
    const repo = makeSettingsRepository(fakeExecutor());
    expect(await repo.getReflectionTime()).toBe('21:00');
    await repo.setReflectionTime('20:30');
    expect(await repo.getReflectionTime()).toBe('20:30');
  });

  it('returns null for an unset raw key', async () => {
    const repo = makeSettingsRepository(fakeExecutor());
    expect(await repo.get('missing')).toBeNull();
  });
});
