import { categorizeFood, groupFoodsByCategory, FOOD_GROUPS, FoodGroup } from './foodGroups';

describe('categorizeFood', () => {
  const cases: [string, FoodGroup][] = [
    ['Chicken breast', 'protein'],
    ['Salmon fillet', 'protein'],
    ['Egg', 'protein'],
    ['Tofu', 'protein'],
    ['Whey protein powder', 'protein'],
    ['White rice', 'carbs'],
    ['Wholegrain bread', 'carbs'],
    ['Rolled oats', 'carbs'],
    ['Pasta', 'carbs'],
    ['Semi-skimmed milk', 'dairy'],
    ['Cheddar cheese', 'dairy'],
    ['Greek yogurt', 'dairy'],
    ['Apple', 'fruitveg'],
    ['Banana', 'fruitveg'],
    ['Broccoli', 'fruitveg'],
    ['Spinach', 'fruitveg'],
    ['Olive oil', 'fats'],
    ['Almonds', 'fats'],
    ['Avocado', 'fats'],
    ['Dark chocolate', 'snacks'],
    ['Chocolate chip cookie', 'snacks'],
    ['Potato chips', 'snacks'],
    ['Orange juice', 'drinks'],
    ['Cola', 'drinks'],
    ['Black coffee', 'drinks'],
  ];

  it.each(cases)('categorizes "%s" as %s', (name, expected) => {
    expect(categorizeFood(name)).toBe(expected);
  });

  it('falls back to "other" for unknown foods', () => {
    expect(categorizeFood('Zorblax 3000')).toBe('other');
    expect(categorizeFood('')).toBe('other');
  });

  it('is case-insensitive', () => {
    expect(categorizeFood('CHICKEN BREAST')).toBe('protein');
    expect(categorizeFood('olive OIL')).toBe('fats');
  });
});

describe('FOOD_GROUPS', () => {
  it('ends with "other" so unknowns sort last', () => {
    expect(FOOD_GROUPS[FOOD_GROUPS.length - 1].id).toBe('other');
  });

  it('has a label for every group', () => {
    for (const g of FOOD_GROUPS) {
      expect(g.label.length).toBeGreaterThan(0);
    }
  });
});

describe('groupFoodsByCategory', () => {
  const foods = [
    { name: 'Chicken breast' },
    { name: 'White rice' },
    { name: 'Broccoli' },
    { name: 'Greek yogurt' },
    { name: 'Zorblax 3000' },
  ];

  it('groups foods under their category in FOOD_GROUPS order', () => {
    const result = groupFoodsByCategory(foods);
    const ids = result.map((s) => s.group.id);
    // protein, dairy, fruitveg appear before other, in FOOD_GROUPS order.
    expect(ids).toEqual(['protein', 'carbs', 'dairy', 'fruitveg', 'other']);
  });

  it('omits groups that have no foods', () => {
    const result = groupFoodsByCategory([{ name: 'Apple' }]);
    expect(result).toHaveLength(1);
    expect(result[0].group.id).toBe('fruitveg');
    expect(result[0].foods).toHaveLength(1);
  });

  it('returns an empty array for no foods', () => {
    expect(groupFoodsByCategory([])).toEqual([]);
  });

  it('preserves the input order of foods within a group', () => {
    const result = groupFoodsByCategory([
      { name: 'Cheddar cheese', tag: 'a' },
      { name: 'Greek yogurt', tag: 'b' },
    ]);
    expect(result[0].group.id).toBe('dairy');
    expect(result[0].foods.map((f) => f.tag)).toEqual(['a', 'b']);
  });
});
