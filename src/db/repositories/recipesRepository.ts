import { QueryableExecutor } from '../migrator';

export interface Recipe {
  id: string;
  name: string;
  createdAt: number;
}

export interface RecipeItem {
  id: string;
  recipeId: string;
  foodId: string;
  grams: number;
}

export function insertRecipeSql(r: Recipe): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO recipes (id, name, created_at) VALUES (?, ?, ?)`,
    params: [r.id, r.name, r.createdAt],
  };
}

export function insertRecipeItemSql(it: RecipeItem): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO recipe_items (id, recipe_id, food_id, grams) VALUES (?, ?, ?, ?)`,
    params: [it.id, it.recipeId, it.foodId, it.grams],
  };
}

interface RecipeRow {
  id: string;
  name: string;
  created_at: number;
}

interface RecipeItemRow {
  id: string;
  recipe_id: string;
  food_id: string;
  grams: number;
}

function rowToRecipe(r: RecipeRow): Recipe {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}

function rowToItem(r: RecipeItemRow): RecipeItem {
  return { id: r.id, recipeId: r.recipe_id, foodId: r.food_id, grams: r.grams };
}

export function makeRecipesRepository(db: QueryableExecutor) {
  return {
    // Atomic: recipe + all its items in one transaction.
    async save(recipe: Recipe, items: RecipeItem[]): Promise<void> {
      await db.exec('BEGIN');
      try {
        const r = insertRecipeSql(recipe);
        await db.exec(r.sql, r.params);
        for (const it of items) {
          const q = insertRecipeItemSql(it);
          await db.exec(q.sql, q.params);
        }
        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }
    },
    async all(): Promise<Recipe[]> {
      const rows = await db.queryAll<RecipeRow>('SELECT * FROM recipes ORDER BY name', []);
      return rows.map(rowToRecipe);
    },
    async itemsFor(recipeId: string): Promise<RecipeItem[]> {
      const rows = await db.queryAll<RecipeItemRow>(
        'SELECT * FROM recipe_items WHERE recipe_id = ? ORDER BY rowid',
        [recipeId],
      );
      return rows.map(rowToItem);
    },
  };
}
