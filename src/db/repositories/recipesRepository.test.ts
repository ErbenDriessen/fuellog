import {
  insertRecipeSql,
  insertRecipeItemSql,
  makeRecipesRepository,
  Recipe,
  RecipeItem,
} from './recipesRepository';
import { QueryableExecutor } from '../migrator';

const sampleRecipe: Recipe = { id: 'recipe-1', name: 'Chicken and rice', createdAt: 1000 };

const sampleItems: RecipeItem[] = [
  { id: 'ritem-1', recipeId: 'recipe-1', foodId: 'food-rice', grams: 150 },
  { id: 'ritem-2', recipeId: 'recipe-1', foodId: 'food-chicken', grams: 120 },
];

function fakeExecutor(rows: unknown[], failOnExecCall?: number) {
  const execCalls: { sql: string; params: unknown[] }[] = [];
  const queryCalls: { sql: string; params: unknown[] }[] = [];
  const db: QueryableExecutor = {
    async exec(sql: string, params: unknown[] = []) {
      execCalls.push({ sql, params });
      if (failOnExecCall !== undefined && execCalls.length === failOnExecCall) {
        throw new Error('insert failed');
      }
    },
    async getVersion() { return 1; },
    async setVersion() {},
    async queryAll<T>(sql: string, params: unknown[] = []) { queryCalls.push({ sql, params }); return rows as T[]; },
  };
  return { db, execCalls, queryCalls };
}

describe('recipesRepository', () => {
  it('insertRecipeSql() builds a parameterized insert in [id, name, created_at] order', () => {
    const { sql, params } = insertRecipeSql(sampleRecipe);
    expect(sql).toContain('INSERT INTO recipes');
    expect(params).toEqual(['recipe-1', 'Chicken and rice', 1000]);
  });

  it('insertRecipeItemSql() builds a parameterized insert in [id, recipe_id, food_id, grams] order', () => {
    const { sql, params } = insertRecipeItemSql(sampleItems[0]);
    expect(sql).toContain('INSERT INTO recipe_items');
    expect(params).toEqual(['ritem-1', 'recipe-1', 'food-rice', 150]);
  });

  describe('save()', () => {
    it('wraps the recipe insert and one insert per item in a BEGIN...COMMIT transaction', async () => {
      const { db, execCalls } = fakeExecutor([]);
      const repo = makeRecipesRepository(db);
      await repo.save(sampleRecipe, sampleItems);

      expect(execCalls).toHaveLength(5);
      expect(execCalls[0].sql).toBe('BEGIN');
      expect(execCalls[1].sql).toContain('INSERT INTO recipes');
      expect(execCalls[1].params).toEqual(['recipe-1', 'Chicken and rice', 1000]);
      expect(execCalls[2].sql).toContain('INSERT INTO recipe_items');
      expect(execCalls[2].params).toEqual(['ritem-1', 'recipe-1', 'food-rice', 150]);
      expect(execCalls[3].sql).toContain('INSERT INTO recipe_items');
      expect(execCalls[3].params).toEqual(['ritem-2', 'recipe-1', 'food-chicken', 120]);
      expect(execCalls[4].sql).toBe('COMMIT');
    });

    it('rolls back and rethrows if an item insert fails', async () => {
      // 1st exec call is BEGIN, 2nd is the recipe insert, 3rd (the 1st item insert) fails.
      const { db, execCalls } = fakeExecutor([], 3);
      const repo = makeRecipesRepository(db);

      await expect(repo.save(sampleRecipe, sampleItems)).rejects.toThrow('insert failed');

      expect(execCalls[0].sql).toBe('BEGIN');
      expect(execCalls[execCalls.length - 1].sql).toBe('ROLLBACK');
    });

    it('commits with no item inserts when the recipe has no items', async () => {
      const { db, execCalls } = fakeExecutor([]);
      const repo = makeRecipesRepository(db);
      await repo.save(sampleRecipe, []);

      expect(execCalls).toHaveLength(3);
      expect(execCalls[0].sql).toBe('BEGIN');
      expect(execCalls[1].sql).toContain('INSERT INTO recipes');
      expect(execCalls[2].sql).toBe('COMMIT');
    });
  });

  it('all() maps rows back to Recipe objects', async () => {
    const { db, queryCalls } = fakeExecutor([
      { id: 'recipe-1', name: 'Chicken and rice', created_at: 1000 },
    ]);
    const repo = makeRecipesRepository(db);
    const rows = await repo.all();
    expect(queryCalls[0].sql).toContain('SELECT * FROM recipes');
    expect(rows).toEqual([sampleRecipe]);
  });

  it('itemsFor() passes the recipe id param and maps rows back to RecipeItem objects', async () => {
    const { db, queryCalls } = fakeExecutor([
      { id: 'ritem-1', recipe_id: 'recipe-1', food_id: 'food-rice', grams: 150 },
    ]);
    const repo = makeRecipesRepository(db);
    const rows = await repo.itemsFor('recipe-1');
    expect(queryCalls[0].params).toEqual(['recipe-1']);
    expect(rows).toEqual([sampleItems[0]]);
  });
});
