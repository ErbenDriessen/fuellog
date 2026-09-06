// Food groups let the ingredient picker sort a long food library into readable
// sections. Categorization is derived from the food's name with keyword rules —
// it works offline, for scanned and manually-created foods alike, and needs no
// stored data. (A persisted, user-overridable category comes in a later pass.)

export type FoodGroup =
  | 'protein'
  | 'carbs'
  | 'dairy'
  | 'fruitveg'
  | 'fats'
  | 'snacks'
  | 'drinks'
  | 'other';

export interface FoodGroupDef {
  id: FoodGroup;
  label: string;
}

// Display order for the picker's sections. "other" is always last.
export const FOOD_GROUPS: FoodGroupDef[] = [
  { id: 'protein', label: 'Protein' },
  { id: 'carbs', label: 'Carbs & Grains' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'fruitveg', label: 'Fruit & Veg' },
  { id: 'fats', label: 'Fats & Oils' },
  { id: 'snacks', label: 'Snacks & Sweets' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'other', label: 'Other' },
];

// Matching PRIORITY order (distinct from display order): the first group whose
// keyword appears in the name wins. Ordering resolves overlaps — e.g. "orange
// juice" is a drink, not fruit; "potato chips" is a snack, not a carb.
const MATCH_ORDER: { id: FoodGroup; keywords: string[] }[] = [
  {
    id: 'dairy',
    keywords: ['milk', 'cheese', 'yogurt', 'yoghurt', 'quark', 'kefir', 'cream', 'curd'],
  },
  {
    id: 'protein',
    keywords: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'salmon', 'tuna', 'cod',
      'fish', 'prawn', 'shrimp', 'egg', 'tofu', 'tempeh', 'seitan', 'lentil', 'bean',
      'chickpea', 'ham', 'bacon', 'sausage', 'steak', 'mince', 'whey', 'protein'],
  },
  {
    id: 'fats',
    keywords: ['oil', 'butter', 'almond', 'cashew', 'walnut', 'peanut', 'nut',
      'avocado', 'seed', 'olive', 'margarine'],
  },
  {
    // Checked before drinks: "chocolate" contains the substring "cola".
    id: 'snacks',
    keywords: ['chocolate', 'cookie', 'biscuit', 'chip', 'crisp', 'candy', 'cake',
      'sweet', 'wafer', 'donut', 'doughnut', 'brownie', 'pastry', 'muffin',
      'popcorn', 'pretzel'],
  },
  {
    id: 'drinks',
    keywords: ['juice', 'soda', 'cola', 'coffee', 'espresso', 'latte', 'cappuccino',
      'tea', 'water', 'beer', 'wine', 'smoothie', 'lemonade', 'cordial', 'drink', 'shake'],
  },
  {
    id: 'fruitveg',
    keywords: ['apple', 'banana', 'orange', 'grape', 'berry', 'strawberr', 'blueberr',
      'raspberr', 'mango', 'melon', 'peach', 'pear', 'pineapple', 'kiwi', 'broccoli',
      'spinach', 'carrot', 'tomato', 'lettuce', 'cucumber', 'pepper', 'onion', 'garlic',
      'courgette', 'zucchini', 'cabbage', 'kale', 'salad', 'veg', 'fruit', 'pea',
      'corn', 'mushroom', 'cauliflower', 'celery', 'beet'],
  },
  {
    id: 'carbs',
    keywords: ['rice', 'pasta', 'bread', 'oat', 'cereal', 'potato', 'noodle', 'flour',
      'wrap', 'tortilla', 'quinoa', 'couscous', 'bagel', 'roll', 'bun', 'granola',
      'muesli', 'barley', 'grain'],
  },
];

// Derive a food group from a food name. Returns 'other' when nothing matches.
export function categorizeFood(name: string): FoodGroup {
  const n = name.toLowerCase();
  for (const rule of MATCH_ORDER) {
    if (rule.keywords.some((kw) => n.includes(kw))) return rule.id;
  }
  return 'other';
}

export interface FoodGroupSection<T> {
  group: FoodGroupDef;
  foods: T[];
}

// Bucket foods into their groups, returned in FOOD_GROUPS display order. Groups
// with no foods are omitted; the input order of foods within a group is kept.
export function groupFoodsByCategory<T extends { name: string }>(
  foods: T[],
): FoodGroupSection<T>[] {
  const buckets = new Map<FoodGroup, T[]>();
  for (const food of foods) {
    const group = categorizeFood(food.name);
    const list = buckets.get(group) ?? [];
    list.push(food);
    buckets.set(group, list);
  }
  return FOOD_GROUPS.filter((g) => buckets.has(g.id)).map((g) => ({
    group: g,
    foods: buckets.get(g.id)!,
  }));
}
