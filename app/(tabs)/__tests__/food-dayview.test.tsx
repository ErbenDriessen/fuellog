import { render, screen, fireEvent } from '@testing-library/react-native';

import { Food as FoodItem } from '../../../src/db/repositories/foodsRepository';
import { FoodLogEntry } from '../../../src/db/repositories/foodLogRepository';
import { NumbersMode } from '../../../src/food/phrasing';

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

// 190 + 200 + 150 = 540 kcal; protein 56.5, carb 43, fat 11.5.
const fixtureEntries: FoodLogEntry[] = [
  { id: 'e1', logDate: '2026-07-06', meal: 'Breakfast', foodId: 'food-oats', recipeId: null,
    grams: 50, kcal: 190, protein: 6.5, carb: 33, fat: 3.5 },
  { id: 'e2', logDate: '2026-07-06', meal: 'Lunch', foodId: 'food-rice', recipeId: null,
    grams: 100, kcal: 200, protein: 20, carb: 10, fat: 5 },
  { id: 'e3', logDate: '2026-07-06', meal: 'Lunch', foodId: 'food-chicken', recipeId: null,
    grams: 100, kcal: 150, protein: 30, carb: 0, fat: 3 },
];

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
  current: async () => ({ id: 't', kcal: 2400, protein: 165, carb: 240, fat: 70, effectiveFrom: '2026-07-06' }),
  setTarget: async () => {},
};
const mockSetWater = jest.fn(async () => {});
const mockSetEnergy = jest.fn(async () => {});
const mockWaterApi = { getForDate: async () => 0, setForDate: mockSetWater };
const mockEnergyApi = { getForDate: async () => null, setForDate: mockSetEnergy };
const mockReflectionsApi = { getForDate: async () => null, setForDate: async () => {} };

jest.mock('../../../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: mockFoodsApi,
    foodLog: mockFoodLogApi,
    dailyTargets: mockDailyTargetsApi,
    water: mockWaterApi,
    energy: mockEnergyApi,
    reflections: mockReflectionsApi,
  }),
}));

// Mode is mutated per test to exercise Gentle vs Exact.
let mockMode: NumbersMode = 'gentle';
jest.mock('../../../src/settings/SettingsProvider', () => ({
  useSettings: () => ({
    loading: false,
    mode: mockMode,
    setMode: async () => {},
    waterGoal: 8,
    setWaterGoal: async () => {},
    onboarded: true,
    setOnboarded: async () => {},
    reflectionTime: '21:00',
    setReflectionTime: async () => {},
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
  beforeEach(() => {
    mockMode = 'gentle';
    mockSetWater.mockClear();
    mockSetEnergy.mockClear();
    (router.push as jest.Mock).mockClear();
  });

  it('renders meal groups in order with their foods', async () => {
    await render(<Food />);
    await screen.findByText('Oats');

    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('BREAKFAST')).toBeLessThan(tree.indexOf('LUNCH'));
    expect(tree.indexOf('Oats')).toBeLessThan(tree.indexOf('Rice'));
    expect(screen.getByText('Chicken breast')).toBeTruthy();
  });

  it('shows exact numbers in Exact mode', async () => {
    mockMode = 'exact';
    await render(<Food />);
    await screen.findByText('Oats');

    // remaining kcal 2400 - 540 = 1860.
    expect(screen.getByText('1860')).toBeTruthy();
    expect(screen.getByText('KCAL LEFT')).toBeTruthy();
    expect(screen.getByText('540 / 2400')).toBeTruthy();
    // macro rows as eaten / target.
    expect(screen.getByText('56.5 / 165 g')).toBeTruthy();
    expect(screen.getByText('43 / 240 g')).toBeTruthy();
    expect(screen.getByText('11.5 / 70 g')).toBeTruthy();
  });

  it('shows words instead of numbers in Gentle mode', async () => {
    await render(<Food />);
    await screen.findByText('Oats');

    // 540 / 2400 = 0.225 -> "Room to eat"; no calorie figure shown.
    expect(screen.getByText('Room to eat')).toBeTruthy();
    expect(screen.queryByText('1860')).toBeNull();
    expect(screen.queryByText('540 / 2400')).toBeNull();
  });

  it('opens the edit-targets screen from the Targets affordance', async () => {
    await render(<Food />);
    await screen.findByText('Oats');
    await fireEvent.press(screen.getByTestId('edit-targets-button'));
    expect(router.push).toHaveBeenCalledWith('/edit-targets');
  });

  it('opens the edit-entry screen when a logged entry row is pressed', async () => {
    await render(<Food />);
    await screen.findByText('Oats');
    await fireEvent.press(screen.getByTestId('entry-row-e2'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/edit-entry', params: { id: 'e2' } });
  });

  it('opens the saved recipes list from the usual-meals affordance', async () => {
    await render(<Food />);
    await screen.findByText('Oats');
    await fireEvent.press(screen.getByTestId('saved-meals-button'));
    expect(router.push).toHaveBeenCalledWith('/recipes');
  });

  it('logs a glass of water', async () => {
    await render(<Food />);
    await screen.findByText('Oats');
    await fireEvent.press(screen.getByTestId('water-add'));
    expect(mockSetWater).toHaveBeenCalledWith(expect.any(String), 1);
  });

  it('records an energy check-in', async () => {
    await render(<Food />);
    await screen.findByText('Oats');
    await fireEvent.press(screen.getByTestId('energy-good'));
    expect(mockSetEnergy).toHaveBeenCalledWith(expect.any(String), 'good');
  });
});
