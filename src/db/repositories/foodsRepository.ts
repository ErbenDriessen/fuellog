import { QueryableExecutor } from '../migrator';

export interface Food {
  id: string;
  name: string;
  barcode: string | null;
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
  source: string;
  createdAt: number;
}

export function insertFoodSql(f: Food): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO foods
      (id, name, barcode, kcal_per_100, protein_per_100, carb_per_100, fat_per_100, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [f.id, f.name, f.barcode, f.kcalPer100, f.proteinPer100, f.carbPer100, f.fatPer100, f.source, f.createdAt],
  };
}

interface FoodRow {
  id: string;
  name: string;
  barcode: string | null;
  kcal_per_100: number;
  protein_per_100: number;
  carb_per_100: number;
  fat_per_100: number;
  source: string;
  created_at: number;
}

function rowToFood(r: FoodRow): Food {
  return {
    id: r.id,
    name: r.name,
    barcode: r.barcode,
    kcalPer100: r.kcal_per_100,
    proteinPer100: r.protein_per_100,
    carbPer100: r.carb_per_100,
    fatPer100: r.fat_per_100,
    source: r.source,
    createdAt: r.created_at,
  };
}

export function makeFoodsRepository(db: QueryableExecutor) {
  return {
    async add(f: Food): Promise<void> {
      const { sql, params } = insertFoodSql(f);
      await db.exec(sql, params);
    },
    async all(): Promise<Food[]> {
      const rows = await db.queryAll<FoodRow>('SELECT * FROM foods ORDER BY name', []);
      return rows.map(rowToFood);
    },
  };
}
