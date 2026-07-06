import { QueryableExecutor } from '../migrator';

export interface FoodLogEntry {
  id: string;
  logDate: string;   // 'YYYY-MM-DD'
  meal: string;      // 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  foodId: string | null;
  recipeId: string | null;
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export function insertFoodLogSql(e: FoodLogEntry): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO food_log_entries
      (id, log_date, meal, food_id, recipe_id, grams, kcal, protein, carb, fat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [e.id, e.logDate, e.meal, e.foodId, e.recipeId, e.grams, e.kcal, e.protein, e.carb, e.fat],
  };
}

interface FoodLogRow {
  id: string;
  log_date: string;
  meal: string;
  food_id: string | null;
  recipe_id: string | null;
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

function rowToEntry(r: FoodLogRow): FoodLogEntry {
  return {
    id: r.id,
    logDate: r.log_date,
    meal: r.meal,
    foodId: r.food_id,
    recipeId: r.recipe_id,
    grams: r.grams,
    kcal: r.kcal,
    protein: r.protein,
    carb: r.carb,
    fat: r.fat,
  };
}

export function makeFoodLogRepository(db: QueryableExecutor) {
  return {
    async add(e: FoodLogEntry): Promise<void> {
      const { sql, params } = insertFoodLogSql(e);
      await db.exec(sql, params);
    },
    async addMany(entries: FoodLogEntry[]): Promise<void> {
      if (entries.length === 0) return;
      await db.exec('BEGIN');
      try {
        for (const e of entries) {
          const { sql, params } = insertFoodLogSql(e);
          await db.exec(sql, params);
        }
        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }
    },
    async entriesForDate(logDate: string): Promise<FoodLogEntry[]> {
      const rows = await db.queryAll<FoodLogRow>(
        'SELECT * FROM food_log_entries WHERE log_date = ? ORDER BY rowid',
        [logDate],
      );
      return rows.map(rowToEntry);
    },
  };
}
