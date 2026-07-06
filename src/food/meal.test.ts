import { Food } from '../db/repositories/foodsRepository';
import { ingredientMacros, mealTotal, buildLogEntries, MealIngredient } from './meal';

const rice: Food = {
  id: 'food-rice',
  name: 'Rice',
  barcode: null,
  kcalPer100: 130,
  proteinPer100: 2.7,
  carbPer100: 28,
  fatPer100: 0.3,
  source: 'seed',
  createdAt: 0,
};

const chicken: Food = {
  id: 'food-chicken',
  name: 'Chicken breast',
  barcode: null,
  kcalPer100: 165,
  proteinPer100: 31,
  carbPer100: 0,
  fatPer100: 3.6,
  source: 'seed',
  createdAt: 0,
};

describe('ingredientMacros', () => {
  it('scales a single ingredient by its grams', () => {
    const ing: MealIngredient = { food: rice, grams: 60 };
    const m = ingredientMacros(ing);
    expect(m.kcal).toBeCloseTo(78);
    expect(m.protein).toBeCloseTo(1.62);
    expect(m.carb).toBeCloseTo(16.8);
    expect(m.fat).toBeCloseTo(0.18);
  });
});

describe('mealTotal', () => {
  it('sums the scaled contributions of multiple ingredients', () => {
    const items: MealIngredient[] = [
      { food: rice, grams: 60 },
      { food: chicken, grams: 100 },
    ];
    const total = mealTotal(items);
    // rice@60g: 78 kcal, 1.62 protein, 16.8 carb, 0.18 fat
    // chicken@100g: 165 kcal, 31 protein, 0 carb, 3.6 fat
    expect(total.kcal).toBeCloseTo(243);
    expect(total.protein).toBeCloseTo(32.62);
    expect(total.carb).toBeCloseTo(16.8);
    expect(total.fat).toBeCloseTo(3.78);
  });

  it('totals to zero for an empty ingredient list', () => {
    expect(mealTotal([])).toEqual({ kcal: 0, protein: 0, carb: 0, fat: 0 });
  });
});

describe('buildLogEntries', () => {
  const items: MealIngredient[] = [
    { food: rice, grams: 60 },
    { food: chicken, grams: 100 },
  ];

  it('produces one entry per ingredient with the right identity fields', () => {
    const entries = buildLogEntries(items, {
      meal: 'Lunch',
      logDate: '2026-07-06',
      makeId: (i) => `id-${i}`,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('id-0');
    expect(entries[0].foodId).toBe('food-rice');
    expect(entries[0].grams).toBe(60);
    expect(entries[0].meal).toBe('Lunch');
    expect(entries[0].logDate).toBe('2026-07-06');
    expect(entries[0].recipeId).toBeNull();

    expect(entries[1].id).toBe('id-1');
    expect(entries[1].foodId).toBe('food-chicken');
    expect(entries[1].grams).toBe(100);
  });

  it('carries a rounded macro snapshot per entry', () => {
    const entries = buildLogEntries(items, {
      meal: 'Lunch',
      logDate: '2026-07-06',
      makeId: (i) => `id-${i}`,
    });

    // rice@60g rounded: kcal 78, protein 1.6, carb 16.8, fat 0.2
    expect(entries[0].kcal).toBe(78);
    expect(entries[0].protein).toBe(1.6);
    expect(entries[0].carb).toBe(16.8);
    expect(entries[0].fat).toBe(0.2);

    // chicken@100g rounded: kcal 165, protein 31, carb 0, fat 3.6
    expect(entries[1].kcal).toBe(165);
    expect(entries[1].protein).toBe(31);
    expect(entries[1].carb).toBe(0);
    expect(entries[1].fat).toBe(3.6);
  });

  it('uses makeId to assign unique ids across many ingredients', () => {
    const many: MealIngredient[] = [rice, chicken, rice].map((food) => ({ food, grams: 50 }));
    const entries = buildLogEntries(many, {
      meal: 'Snack',
      logDate: '2026-07-06',
      makeId: (i) => `unique-${i}`,
    });
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
  });
});
