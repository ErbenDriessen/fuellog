import { runMigrations, Migration, SqlExecutor } from './migrator';
import { migrations } from './schema';

class FakeDb implements SqlExecutor {
  version = 0;
  executed: string[] = [];
  async exec(sql: string) { this.executed.push(sql); }
  async getVersion() { return this.version; }
  async setVersion(v: number) { this.version = v; }
}

describe('runMigrations', () => {
  it('applies all statements in ascending version order', async () => {
    const defs: Migration[] = [
      { version: 1, up: ['CREATE TABLE a (id INTEGER)'] },
      { version: 2, up: ['CREATE TABLE b (id INTEGER)'] },
    ];
    const db = new FakeDb();
    const v = await runMigrations(db, defs);
    expect(v).toBe(2);
    expect(db.executed).toEqual(['CREATE TABLE a (id INTEGER)', 'CREATE TABLE b (id INTEGER)']);
  });

  it('is idempotent — no re-runs when already current', async () => {
    const defs: Migration[] = [{ version: 1, up: ['CREATE TABLE a (id INTEGER)'] }];
    const db = new FakeDb();
    db.version = 1;
    await runMigrations(db, defs);
    expect(db.executed).toEqual([]);
  });

  it('real schema creates all 12 core tables', async () => {
    const db = new FakeDb();
    await runMigrations(db, migrations);
    const joined = db.executed.join('\n');
    for (const t of ['foods','recipes','recipe_items','food_log_entries','daily_targets',
      'exercises','routines','routine_days','routine_exercises','workout_sessions',
      'logged_sets','body_metrics']) {
      expect(joined).toContain(`CREATE TABLE IF NOT EXISTS ${t}`);
    }
  });

  it('real schema adds a slug column to exercises so library exercises round-trip', async () => {
    const db = new FakeDb();
    const v = await runMigrations(db, migrations);
    expect(v).toBeGreaterThanOrEqual(2);
    expect(db.executed.join('\n')).toContain('ALTER TABLE exercises ADD COLUMN slug TEXT');
  });
});
