import { MealIngredient } from './meal';
import { Recipe, RecipeItem } from '../db/repositories/recipesRepository';

export function buildRecipe(
  name: string,
  ingredients: MealIngredient[],
  recipeId: string,
  makeItemId: (i: number) => string,
  createdAt: number,
): { recipe: Recipe; items: RecipeItem[] } {
  return {
    recipe: { id: recipeId, name: name.trim(), createdAt },
    items: ingredients.map((ing, i) => ({
      id: makeItemId(i),
      recipeId,
      foodId: ing.food.id,
      grams: ing.grams,
    })),
  };
}
