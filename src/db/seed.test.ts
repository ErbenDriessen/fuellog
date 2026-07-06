import { starterFoods, seedFoods, SeedableFoods } from './seed';
import { Food } from './repositories/foodsRepository';

function fakeRepo(initial: Food[] = []): SeedableFoods & { rows: Food[] } {
  const rows = [...initial];
  return { rows, async all() { return rows; }, async add(f) { rows.push(f); } };
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
