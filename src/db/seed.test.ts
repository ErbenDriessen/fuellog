import {
  starterFoods, seedFoods, SeedableFoods, defaultDailyTarget, seedDailyTarget, SeedableTargets,
  seedExercises, SeedableExercises,
} from './seed';
import { Food } from './repositories/foodsRepository';
import { DailyTarget } from './repositories/dailyTargetsRepository';
import { Exercise, EXERCISE_LIBRARY } from '../gym/exercises';

function fakeRepo(initial: Food[] = []): SeedableFoods & { rows: Food[] } {
  const rows = [...initial];
  return { rows, async all() { return rows; }, async add(f) { rows.push(f); } };
}

function fakeTargetsRepo(initial: DailyTarget | null = null): SeedableTargets & { rows: DailyTarget[] } {
  const rows: DailyTarget[] = initial ? [initial] : [];
  return {
    rows,
    async current() { return rows.length ? rows[rows.length - 1] : null; },
    async setTarget(t) { rows.push(t); },
  };
}

function fakeExercisesRepo(initial: Exercise[] = []): SeedableExercises & { rows: Exercise[] } {
  const rows = [...initial];
  return { rows, async all() { return rows; }, async add(e) { rows.push(e); } };
}

describe('starterFoods', () => {
  it('returns a non-empty library of valid seed foods', () => {
    const foods = starterFoods(1000);
    expect(foods.length).toBeGreaterThanOrEqual(8);
    for (const f of foods) {
      expect(f.id.startsWith('seed-')).toBe(true);
      expect(f.source).toBe('seed');
      expect(f.createdAt).toBe(1000);
      for (const v of [f.kcalPer100, f.proteinPer100, f.carbPer100, f.fatPer100]) {
        expect(typeof v).toBe('number');
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('has unique ids', () => {
    const ids = starterFoods(1).map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('seedFoods', () => {
  it('inserts all starter foods into an empty repo', async () => {
    const repo = fakeRepo();
    const n = await seedFoods(repo, 1000);
    expect(n).toBe(starterFoods(1000).length);
    expect(repo.rows.length).toBe(n);
  });

  it('is idempotent — inserts nothing when foods already exist', async () => {
    const repo = fakeRepo(starterFoods(1000));
    const before = repo.rows.length;
    const n = await seedFoods(repo, 2000);
    expect(n).toBe(0);
    expect(repo.rows.length).toBe(before);
  });
});

describe('seedExercises', () => {
  it('inserts the whole exercise library into an empty repo', async () => {
    const repo = fakeExercisesRepo();
    const n = await seedExercises(repo);
    expect(n).toBe(EXERCISE_LIBRARY.length);
    expect(repo.rows).toEqual(EXERCISE_LIBRARY);
  });

  it('is idempotent — inserts nothing when exercises already exist', async () => {
    const repo = fakeExercisesRepo(EXERCISE_LIBRARY);
    const n = await seedExercises(repo);
    expect(n).toBe(0);
    expect(repo.rows.length).toBe(EXERCISE_LIBRARY.length);
  });
});

describe('defaultDailyTarget', () => {
  it('returns the expected macros with a date-derived id', () => {
    const t = defaultDailyTarget('2026-07-06');
    expect(t).toEqual({
      id: 'target-2026-07-06', kcal: 2400, protein: 165, carb: 240, fat: 70, effectiveFrom: '2026-07-06',
    });
  });
});

describe('seedDailyTarget', () => {
  it('inserts the default target when none exists', async () => {
    const repo = fakeTargetsRepo(null);
    const seeded = await seedDailyTarget(repo, '2026-07-06');
    expect(seeded).toBe(true);
    expect(repo.rows).toEqual([defaultDailyTarget('2026-07-06')]);
  });

  it('is a no-op when a target already exists', async () => {
    const existing = defaultDailyTarget('2026-01-01');
    const repo = fakeTargetsRepo(existing);
    const seeded = await seedDailyTarget(repo, '2026-07-06');
    expect(seeded).toBe(false);
    expect(repo.rows).toEqual([existing]);
  });
});
