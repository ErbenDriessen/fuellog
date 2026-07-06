export interface Macros {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

// Anything with per-100g fields (the Food type satisfies this structurally).
export interface Per100 {
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
}

// Scale per-100g macros to an arbitrary gram weight.
export function scaleMacros(per100: Per100, grams: number): Macros {
  const factor = grams / 100;
  return {
    kcal: per100.kcalPer100 * factor,
    protein: per100.proteinPer100 * factor,
    carb: per100.carbPer100 * factor,
    fat: per100.fatPer100 * factor,
  };
}

// Total a list of macro contributions.
export function sumMacros(items: Macros[]): Macros {
  return items.reduce<Macros>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carb: acc.carb + m.carb,
      fat: acc.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
}

// Display rounding: kcal to whole, macro grams to 1 decimal.
export function roundMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein * 10) / 10,
    carb: Math.round(m.carb * 10) / 10,
    fat: Math.round(m.fat * 10) / 10,
  };
}
