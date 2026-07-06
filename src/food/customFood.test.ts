import { buildCustomFood, isValidCustomFood, CustomFoodInput } from './customFood';

function goodInput(overrides: Partial<CustomFoodInput> = {}): CustomFoodInput {
  return {
    name: 'Greek yoghurt',
    kcalPer100: 59,
    proteinPer100: 10,
    carbPer100: 3.6,
    fatPer100: 0.4,
    ...overrides,
  };
}

describe('isValidCustomFood', () => {
  it('is true for a well-formed input', () => {
    expect(isValidCustomFood(goodInput())).toBe(true);
  });

  it('is false for an empty name', () => {
    expect(isValidCustomFood(goodInput({ name: '' }))).toBe(false);
  });

  it('is false for a whitespace-only name', () => {
    expect(isValidCustomFood(goodInput({ name: '   ' }))).toBe(false);
  });

  it('is false when a macro is negative', () => {
    expect(isValidCustomFood(goodInput({ proteinPer100: -1 }))).toBe(false);
  });

  it('is false when a macro is NaN', () => {
    expect(isValidCustomFood(goodInput({ kcalPer100: NaN }))).toBe(false);
  });
});

describe('buildCustomFood', () => {
  it('trims the name, sets barcode null and source manual, and carries id/createdAt/macros', () => {
    const input = goodInput({ name: '  Greek yoghurt  ' });
    const food = buildCustomFood(input, 'food-123', 456);

    expect(food).toEqual({
      id: 'food-123',
      name: 'Greek yoghurt',
      barcode: null,
      kcalPer100: 59,
      proteinPer100: 10,
      carbPer100: 3.6,
      fatPer100: 0.4,
      source: 'manual',
      createdAt: 456,
    });
  });
});
