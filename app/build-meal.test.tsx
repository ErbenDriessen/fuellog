import { render, fireEvent, screen } from '@testing-library/react-native';

import { Food } from '../src/db/repositories/foodsRepository';
import { FoodLogEntry } from '../src/db/repositories/foodLogRepository';

const rice: Food = {
  id: 'food-rice',
  name: 'Rice',
  barcode: null,
  kcalPer100: 130,
  proteinPer100: 2.7,
  carbPer100: 28,
  fatPer100: 0.3,
  source: 'seed',
  createdAt: 0,
};

const chicken: Food = {
  id: 'food-chicken',
  name: 'Chicken breast',
  barcode: null,
  kcalPer100: 165,
  proteinPer100: 31,
  carbPer100: 0,
  fatPer100: 3.6,
  source: 'seed',
  createdAt: 0,
};

const mockAddMany = jest.fn(async (_entries: FoodLogEntry[]) => {});
const mockAdd = jest.fn(async (_entry: FoodLogEntry) => {});
const mockBack = jest.fn();

// `foods`/`foodLog` must be referentially stable across renders — the screen's
// `useEffect(() => { ... }, [foods])` would otherwise refire (and re-render)
// on every render since a fresh object literal is a new reference each time.
const mockFoodsApi = {
  all: async () => [rice, chicken],
  add: async () => {},
};
const mockFoodLogApi = {
  addMany: mockAddMany,
  add: mockAdd,
  entriesForDate: async () => [],
};

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: mockFoodsApi,
    foodLog: mockFoodLogApi,
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: () => mockBack() },
}));

import BuildMealScreen from './build-meal';

describe('BuildMealScreen', () => {
  beforeEach(() => {
    mockAddMany.mockClear();
    mockAdd.mockClear();
    mockBack.mockClear();
  });

  it('logs a single valid ingredient via addMany and navigates back', async () => {
    await render(<BuildMealScreen />);

    // Open the ingredient picker and select rice.
    await fireEvent.press(screen.getByText('Add ingredient'));
    await fireEvent.press(await screen.findByText('Rice'));

    // Set grams to 60.
    const gramsInput = await screen.findByTestId('grams-input-0');
    await fireEvent.changeText(gramsInput, '60');

    await fireEvent.press(screen.getByTestId('log-meal-button'));

    expect(mockAddMany).toHaveBeenCalledTimes(1);
    const entries = mockAddMany.mock.calls[0][0];
    expect(entries).toHaveLength(1);
    expect(entries[0].foodId).toBe('food-rice');
    expect(entries[0].grams).toBe(60);
    expect(entries[0].meal).toEqual(expect.any(String));
    expect(entries[0].logDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // rice@60g rounded: kcal 78, protein 1.6, carb 16.8, fat 0.2
    expect(entries[0].kcal).toBe(78);
    expect(entries[0].protein).toBe(1.6);
    expect(entries[0].carb).toBe(16.8);
    expect(entries[0].fat).toBe(0.2);

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('disables the log button and calls nothing when grams are left at 0/blank', async () => {
    await render(<BuildMealScreen />);

    await fireEvent.press(screen.getByText('Add ingredient'));
    await fireEvent.press(await screen.findByText('Chicken breast'));

    const gramsInput = await screen.findByTestId('grams-input-0');
    await fireEvent.changeText(gramsInput, '0');

    const logButton = screen.getByTestId('log-meal-button');
    expect(logButton.props.accessibilityState?.disabled ?? logButton.props.disabled).toBe(true);

    await fireEvent.press(logButton);
    expect(mockAddMany).not.toHaveBeenCalled();

    // Blank grams also keep it disabled.
    await fireEvent.changeText(gramsInput, '');
    await fireEvent.press(logButton);
    expect(mockAddMany).not.toHaveBeenCalled();
  });
});
