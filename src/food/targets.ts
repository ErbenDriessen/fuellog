import { Macros } from './macros';

export interface MacroTargets {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface MetricProgress {
  eaten: number;
  target: number;
  remaining: number; // target - eaten (negative when over target)
  pct: number;       // eaten/target clamped to [0,1] — for ring fill
}

export interface DayProgress {
  kcal: MetricProgress;
  protein: MetricProgress;
  carb: MetricProgress;
  fat: MetricProgress;
}

function metric(eaten: number, target: number): MetricProgress {
  const pct = target > 0 ? Math.min(Math.max(eaten / target, 0), 1) : 0;
  return { eaten, target, remaining: target - eaten, pct };
}

export function computeDayProgress(target: MacroTargets, eaten: Macros): DayProgress {
  return {
    kcal: metric(eaten.kcal, target.kcal),
    protein: metric(eaten.protein, target.protein),
    carb: metric(eaten.carb, target.carb),
    fat: metric(eaten.fat, target.fat),
  };
}
