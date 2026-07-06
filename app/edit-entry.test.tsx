import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

const fixtureEntry: FoodLogEntry = {
  id: 'e1',
  logDate: '2026-07-06',
  meal: 'Lunch',
  foodId: 'food-rice',
  recipeId: null,
  grams: 100,
  kcal: 130,
  protein: 2.7,
  carb: 28,
  fat: 0.3,
};

const mockUpdate = jest.fn(async (_entry: FoodLogEntry) => {});
const mockRemove = jest.fn(async (_id: string) => {});
const mockBack = jest.fn();

const mockFoodLogApi = {
  byId: async () => fixtureEntry,
  update: mockUpdate,
  remove: mockRemove,
  entriesForDate: async () => [],
  add: async () => {},
  addMany: async () => {},
};

const mockFoodsApi = {
  all: async () => [rice],
  add: async () => {},
};

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: mockFoodsApi,
    foodLog: mockFoodLogApi,
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: () => mockBack() },
  useLocalSearchParams: () => ({ id: 'e1' }),
}));

import EditEntryScreen from './edit-entry';

describe('EditEntryScreen', () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockRemove.mockClear();
    mockBack.mockClear();
  });

  it('prefills grams and shows macros recomputed from the food per-100g', async () => {
    await render(<EditEntryScreen />);

    const gramsInput = await screen.findByTestId('edit-grams-input');
    expect(gramsInput.props.value).toBe('100');

    expect(screen.getByText('130 kcal')).toBeTruthy();
    expect(screen.getByText('P 2.7g')).toBeTruthy();
    expect(screen.getByText('C 28g')).toBeTruthy();
    expect(screen.getByText('F 0.3g')).toBeTruthy();
  });

  it('recomputes macros live as grams change, then saves the updated entry and navigates back', async () => {
    await render(<EditEntryScreen />);

    const gramsInput = await screen.findByTestId('edit-grams-input');
    await fireEvent.changeText(gramsInput, '200');

    expect(screen.getByText('260 kcal')).toBeTruthy();
    expect(screen.getByText('P 5.4g')).toBeTruthy();
    expect(screen.getByText('C 56g')).toBeTruthy();
    expect(screen.getByText('F 0.6g')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('save-entry-button'));

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      ...fixtureEntry,
      grams: 200,
      kcal: 260,
      protein: 5.4,
      carb: 56,
      fat: 0.6,
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('confirms via Alert before deleting, then removes the entry and navigates back', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    await render(<EditEntryScreen />);
    await screen.findByTestId('edit-grams-input');

    await fireEvent.press(screen.getByTestId('delete-entry-button'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith('e1');
    expect(mockBack).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });
});
