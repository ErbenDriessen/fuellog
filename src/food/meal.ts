import { Food } from '../db/repositories/foodsRepository';
import { FoodLogEntry } from '../db/repositories/foodLogRepository';
import { Macros, scaleMacros, sumMacros, roundMacros } from './macros';

export interface MealIngredient {
  food: Food;
  grams: number;
}

// Live per-ingredient contribution (unrounded — round only for display).
export function ingredientMacros(ing: MealIngredient): Macros {
  return scaleMacros(ing.food, ing.grams);
}

// Running total across all ingredients.
export function mealTotal(items: MealIngredient[]): Macros {
  return sumMacros(items.map(ingredientMacros));
}

// Convert the built meal into persistable log entries (one per ingredient),
// each carrying a rounded macro snapshot. `makeId` supplies unique ids.
export function buildLogEntries(
  items: MealIngredient[],
  ctx: { meal: string; logDate: string; makeId: (index: number) => string },
): FoodLogEntry[] {
  return items.map((ing, i) => {
    const m = roundMacros(ingredientMacros(ing));
    return {
      id: ctx.makeId(i),
      logDate: ctx.logDate,
      meal: ctx.meal,
      foodId: ing.food.id,
      recipeId: null,
      grams: ing.grams,
      kcal: m.kcal,
      protein: m.protein,
      carb: m.carb,
      fat: m.fat,
    };
  });
}
