import { computeDayProgress, MacroTargets } from './targets';
import { Macros } from './macros';

describe('computeDayProgress', () => {
  it('computes remaining and pct for a typical partial day', () => {
    const target: MacroTargets = { kcal: 2400, protein: 165, carb: 240, fat: 70 };
    const eaten: Macros = { kcal: 1560, protein: 148, carb: 172, fat: 52 };
    const progress = computeDayProgress(target, eaten);

    expect(progress.kcal.remaining).toBeCloseTo(840);
    expect(progress.kcal.pct).toBeCloseTo(0.65);

    expect(progress.protein.remaining).toBeCloseTo(17);
    expect(progress.protein.pct).toBeCloseTo(148 / 165);

    expect(progress.carb.remaining).toBeCloseTo(68);
    expect(progress.carb.pct).toBeCloseTo(172 / 240);

    expect(progress.fat.remaining).toBeCloseTo(18);
    expect(progress.fat.pct).toBeCloseTo(52 / 70);
  });

  it('clamps pct to 1 and reports negative remaining when over target', () => {
    const target: MacroTargets = { kcal: 2400, protein: 165, carb: 240, fat: 70 };
    const eaten: Macros = { kcal: 2600, protein: 165, carb: 240, fat: 70 };
    const progress = computeDayProgress(target, eaten);

    expect(progress.kcal.pct).toBe(1);
    expect(progress.kcal.remaining).toBeCloseTo(-200);
  });

  it('is divide-by-zero safe when a target is 0', () => {
    const target: MacroTargets = { kcal: 0, protein: 165, carb: 240, fat: 70 };
    const eaten: Macros = { kcal: 500, protein: 0, carb: 0, fat: 0 };
    const progress = computeDayProgress(target, eaten);

    expect(progress.kcal.pct).toBe(0);
    expect(progress.kcal.remaining).toBeCloseTo(-500);
  });
});
