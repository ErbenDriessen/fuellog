import { scaleMacros, sumMacros, roundMacros, Macros } from './macros';

const rice = { kcalPer100: 130, proteinPer100: 2.7, carbPer100: 28, fatPer100: 0.3 };

describe('scaleMacros', () => {
  it('returns per-100g values unchanged at 100g', () => {
    expect(scaleMacros(rice, 100)).toEqual({ kcal: 130, protein: 2.7, carb: 28, fat: 0.3 });
  });
  it('scales linearly for other weights', () => {
    const m = scaleMacros(rice, 50);
    expect(m.kcal).toBeCloseTo(65);
    expect(m.protein).toBeCloseTo(1.35);
    expect(m.carb).toBeCloseTo(14);
    expect(m.fat).toBeCloseTo(0.15);
  });
  it('is zero at zero grams', () => {
    expect(scaleMacros(rice, 0)).toEqual({ kcal: 0, protein: 0, carb: 0, fat: 0 });
  });
});

describe('sumMacros', () => {
  it('sums an empty list to zeros', () => {
    expect(sumMacros([])).toEqual({ kcal: 0, protein: 0, carb: 0, fat: 0 });
  });
  it('adds all contributions field-by-field', () => {
    const a: Macros = { kcal: 100, protein: 10, carb: 5, fat: 2 };
    const b: Macros = { kcal: 50, protein: 4, carb: 8, fat: 1 };
    expect(sumMacros([a, b])).toEqual({ kcal: 150, protein: 14, carb: 13, fat: 3 });
  });
});

describe('roundMacros', () => {
  it('rounds kcal to whole and macros to one decimal', () => {
    expect(roundMacros({ kcal: 149.6, protein: 13.44, carb: 12.95, fat: 3.011 }))
      .toEqual({ kcal: 150, protein: 13.4, carb: 13, fat: 3 });
  });
});
