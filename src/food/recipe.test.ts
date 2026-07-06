import { Food } from '../db/repositories/foodsRepository';
import { MealIngredient } from './meal';
import { buildRecipe } from './recipe';

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

describe('buildRecipe', () => {
  const items: MealIngredient[] = [
    { food: rice, grams: 150 },
    { food: chicken, grams: 120 },
  ];

  it('trims the recipe name', () => {
    const { recipe } = buildRecipe('  Chicken and rice  ', items, 'recipe-1', (i) => `item-${i}`, 1000);
    expect(recipe.name).toBe('Chicken and rice');
    expect(recipe.id).toBe('recipe-1');
    expect(recipe.createdAt).toBe(1000);
  });

  it('produces one item per ingredient with the right recipeId/foodId/grams', () => {
    const { items: recipeItems } = buildRecipe('Chicken and rice', items, 'recipe-1', (i) => `item-${i}`, 1000);

    expect(recipeItems).toHaveLength(2);
    expect(recipeItems[0].recipeId).toBe('recipe-1');
    expect(recipeItems[0].foodId).toBe('food-rice');
    expect(recipeItems[0].grams).toBe(150);
    expect(recipeItems[1].recipeId).toBe('recipe-1');
    expect(recipeItems[1].foodId).toBe('food-chicken');
    expect(recipeItems[1].grams).toBe(120);
  });

  it('assigns unique item ids via makeItemId', () => {
    const many: MealIngredient[] = [rice, chicken, rice].map((food) => ({ food, grams: 50 }));
    const { items: recipeItems } = buildRecipe('Big batch', many, 'recipe-2', (i) => `unique-${i}`, 2000);
    const ids = recipeItems.map((it) => it.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toEqual(['unique-0', 'unique-1', 'unique-2']);
  });

  it('returns an empty items array for an empty ingredient list', () => {
    const { recipe, items: recipeItems } = buildRecipe('Empty', [], 'recipe-3', (i) => `item-${i}`, 3000);
    expect(recipe.name).toBe('Empty');
    expect(recipeItems).toEqual([]);
  });
});
