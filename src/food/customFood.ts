import { Food } from '../db/repositories/foodsRepository';

export interface CustomFoodInput {
  name: string;
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
}

export function isValidCustomFood(input: CustomFoodInput): boolean {
  const nums = [input.kcalPer100, input.proteinPer100, input.carbPer100, input.fatPer100];
  return input.name.trim().length > 0 && nums.every((n) => Number.isFinite(n) && n >= 0);
}

export function buildCustomFood(input: CustomFoodInput, id: string, createdAt: number): Food {
  return {
    id,
    name: input.name.trim(),
    barcode: null,
    kcalPer100: input.kcalPer100,
    proteinPer100: input.proteinPer100,
    carbPer100: input.carbPer100,
    fatPer100: input.fatPer100,
    source: 'manual',
    createdAt,
  };
}
