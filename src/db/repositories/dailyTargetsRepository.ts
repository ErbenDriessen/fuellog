import { QueryableExecutor } from '../migrator';

export interface DailyTarget {
  id: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  effectiveFrom: string; // 'YYYY-MM-DD'
}

export function insertDailyTargetSql(t: DailyTarget): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT INTO daily_targets (id, kcal, protein, carb, fat, effective_from)
      VALUES (?, ?, ?, ?, ?, ?)`,
    params: [t.id, t.kcal, t.protein, t.carb, t.fat, t.effectiveFrom],
  };
}

interface DailyTargetRow {
  id: string; kcal: number; protein: number; carb: number; fat: number; effective_from: string;
}

function rowToTarget(r: DailyTargetRow): DailyTarget {
  return { id: r.id, kcal: r.kcal, protein: r.protein, carb: r.carb, fat: r.fat, effectiveFrom: r.effective_from };
}

export function makeDailyTargetsRepository(db: QueryableExecutor) {
  return {
    // Targets are versioned by effective_from (schema design). Setting a target inserts a new row;
    // current() returns the most recent.
    async setTarget(t: DailyTarget): Promise<void> {
      const { sql, params } = insertDailyTargetSql(t);
      await db.exec(sql, params);
    },
    async current(): Promise<DailyTarget | null> {
      const rows = await db.queryAll<DailyTargetRow>(
        'SELECT * FROM daily_targets ORDER BY effective_from DESC, rowid DESC LIMIT 1',
        [],
      );
      return rows.length ? rowToTarget(rows[0]) : null;
    },
  };
}
