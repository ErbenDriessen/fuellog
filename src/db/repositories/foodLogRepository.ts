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

export function updateFoodLogSql(e: FoodLogEntry): { sql: string; params: unknown[] } {
  return {
    sql: `UPDATE food_log_entries SET grams = ?, kcal = ?, protein = ?, carb = ?, fat = ? WHERE id = ?`,
    params: [e.grams, e.kcal, e.protein, e.carb, e.fat, e.id],
  };
}

export function deleteFoodLogSql(id: string): { sql: string; params: unknown[] } {
  return { sql: `DELETE FROM food_log_entries WHERE id = ?`, params: [id] };
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
    async byId(id: string): Promise<FoodLogEntry | null> {
      const rows = await db.queryAll<FoodLogRow>(
        'SELECT * FROM food_log_entries WHERE id = ? LIMIT 1',
        [id],
      );
      return rows[0] ? rowToEntry(rows[0]) : null;
    },
    async update(e: FoodLogEntry): Promise<void> {
      const { sql, params } = updateFoodLogSql(e);
      await db.exec(sql, params);
    },
    async remove(id: string): Promise<void> {
      const { sql, params } = deleteFoodLogSql(id);
      await db.exec(sql, params);
    },
  };
}
