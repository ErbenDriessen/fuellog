import { Food } from './repositories/foodsRepository';
import { DailyTarget } from './repositories/dailyTargetsRepository';

// A small realistic starter library (per-100g macros) so the app is usable
// before barcode/OCR exist. Deterministic ids make seeding idempotent.
export function starterFoods(now: number): Food[] {
  const mk = (
    slug: string, name: string, kcal: number, protein: number, carb: number, fat: number,
  ): Food => ({
    id: `seed-${slug}`, name, barcode: null,
    kcalPer100: kcal, proteinPer100: protein, carbPer100: carb, fatPer100: fat,
    source: 'seed', createdAt: now,
  });
  return [
    mk('chicken-breast', 'Chicken breast, cooked', 165, 31, 0, 3.6),
    mk('white-rice', 'White rice, cooked', 130, 2.7, 28, 0.3),
    mk('rolled-oats', 'Rolled oats, dry', 379, 13, 67, 6.5),
    mk('whey-protein', 'Whey protein powder', 400, 80, 8, 6),
    mk('greek-yogurt', 'Greek yogurt, 0%', 59, 10, 3.6, 0.4),
    mk('banana', 'Banana', 89, 1.1, 23, 0.3),
    mk('egg', 'Egg, whole', 143, 13, 1.1, 9.5),
    mk('olive-oil', 'Olive oil', 884, 0, 0, 100),
    mk('carrot', 'Carrot', 41, 0.9, 10, 0.2),
    mk('almonds', 'Almonds', 579, 21, 22, 50),
  ];
}

// Idempotent: seeds only when the foods table is empty. Returns rows inserted.
export interface SeedableFoods {
  all(): Promise<Food[]>;
  add(f: Food): Promise<void>;
}
export async function seedFoods(repo: SeedableFoods, now: number): Promise<number> {
  const existing = await repo.all();
  if (existing.length > 0) return 0;
  const foods = starterFoods(now);
  for (const f of foods) await repo.add(f);
  return foods.length;
}

export function defaultDailyTarget(effectiveFrom: string): DailyTarget {
  return { id: `target-${effectiveFrom}`, kcal: 2400, protein: 165, carb: 240, fat: 70, effectiveFrom };
}

export interface SeedableTargets {
  current(): Promise<DailyTarget | null>;
  setTarget(t: DailyTarget): Promise<void>;
}

// Idempotent: seeds the default target only when none exists yet. Returns whether it seeded.
export async function seedDailyTarget(repo: SeedableTargets, effectiveFrom: string): Promise<boolean> {
  const existing = await repo.current();
  if (existing) return false;
  await repo.setTarget(defaultDailyTarget(effectiveFrom));
  return true;
}
