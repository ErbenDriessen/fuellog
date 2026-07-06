import { render, screen, fireEvent } from '@testing-library/react-native';

import { Food as FoodItem } from '../../../src/db/repositories/foodsRepository';
import { FoodLogEntry } from '../../../src/db/repositories/foodLogRepository';

const oats: FoodItem = {
  id: 'food-oats', name: 'Oats', barcode: null,
  kcalPer100: 380, proteinPer100: 13, carbPer100: 66, fatPer100: 7,
  source: 'seed', createdAt: 0,
};
const rice: FoodItem = {
  id: 'food-rice', name: 'Rice', barcode: null,
  kcalPer100: 130, proteinPer100: 2.7, carbPer100: 28, fatPer100: 0.3,
  source: 'seed', createdAt: 0,
};
const chicken: FoodItem = {
  id: 'food-chicken', name: 'Chicken breast', barcode: null,
  kcalPer100: 165, proteinPer100: 31, carbPer100: 0, fatPer100: 3.6,
  source: 'seed', createdAt: 0,
};

// Fixture entries across two meals with round numbers so the summed total
// needs no fuzzy-rounding assertions: 190 + 200 + 150 = 540 kcal etc.
const fixtureEntries: FoodLogEntry[] = [
  { id: 'e1', logDate: '2026-07-06', meal: 'Breakfast', foodId: 'food-oats', recipeId: null,
    grams: 50, kcal: 190, protein: 6.5, carb: 33, fat: 3.5 },
  { id: 'e2', logDate: '2026-07-06', meal: 'Lunch', foodId: 'food-rice', recipeId: null,
    grams: 100, kcal: 200, protein: 20, carb: 10, fat: 5 },
  { id: 'e3', logDate: '2026-07-06', meal: 'Lunch', foodId: 'food-chicken', recipeId: null,
    grams: 100, kcal: 150, protein: 30, carb: 0, fat: 3 },
];

// Stable references — even though this screen's `useFocusEffect` mock below
// pins its own deps to `[]`, keep `foods`/`foodLog` referentially stable
// across renders to match the real DatabaseProvider contract.
const mockFoodsApi = {
  all: async () => [oats, rice, chicken],
  add: async () => {},
};
const mockFoodLogApi = {
  entriesForDate: async () => fixtureEntries,
  add: async () => {},
  addMany: async () => {},
};

const mockDailyTargetsApi = {
  current: async () => ({
    id: 't',
    kcal: 2400,
    protein: 165,
    carb: 240,
    fat: 70,
    effectiveFrom: '2026-07-06',
  }),
  setTarget: async () => {},
};

jest.mock('../../../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: mockFoodsApi,
    foodLog: mockFoodLogApi,
    dailyTargets: mockDailyTargetsApi,
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useEffect(() => effect(), []);
  },
}));

import { router } from 'expo-router';
import Food from '../index';

describe('Food day view', () => {
  it('renders meal sections in order and sums the daily total from fixture entries', async () => {
    await render(<Food />);

    await screen.findByText('Oats');

    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('Breakfast')).toBeLessThan(tree.indexOf('Lunch'));
    expect(tree.indexOf('Oats')).toBeLessThan(tree.indexOf('Rice'));

    // Entries render with their food name and per-entry macros.
    expect(screen.getByText('Oats')).toBeTruthy();
    expect(screen.getByText('Rice')).toBeTruthy();
    expect(screen.getByText('Chicken breast')).toBeTruthy();

    // Daily total: 190 + 200 + 150 = 540 kcal, 6.5+20+30 = 56.5g protein,
    // 33+10+0 = 43g carb, 3.5+5+3 = 11.5g fat.
    // Target (from the seeded/mocked dailyTargets.current()) is 2400/165/240/70,
    // so remaining kcal = 2400 - 540 = 1860, shown in the hero ring.
    expect(screen.getByText('1860')).toBeTruthy();
    expect(screen.getByText('KCAL LEFT')).toBeTruthy();
    expect(screen.getByText('540 / 2400')).toBeTruthy();
    expect(screen.getByText('56.5')).toBeTruthy();
    expect(screen.getByText('43')).toBeTruthy();
    expect(screen.getByText('11.5')).toBeTruthy();
  });

  it('opens the edit-targets screen from the edit affordance', async () => {
    await render(<Food />);
    await screen.findByText('Oats');

    await fireEvent.press(screen.getByTestId('edit-targets-button'));

    expect(router.push).toHaveBeenCalledWith('/edit-targets');
  });
});
