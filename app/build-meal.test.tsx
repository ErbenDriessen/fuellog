import { render, fireEvent, screen, act } from '@testing-library/react-native';

import { Food } from '../src/db/repositories/foodsRepository';
import { FoodLogEntry } from '../src/db/repositories/foodLogRepository';
import { Recipe, RecipeItem } from '../src/db/repositories/recipesRepository';

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
const mockSaveRecipe = jest.fn(async (_recipe: Recipe, _items: RecipeItem[]) => {});
const mockBack = jest.fn();

// `foods`/`foodLog`/`recipes` must be referentially stable across renders — the screen's
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
const mockItemsFor = jest.fn(async (_recipeId: string): Promise<RecipeItem[]> => []);
const mockRecipesApi = {
  save: mockSaveRecipe,
  all: async () => [],
  itemsFor: mockItemsFor,
};

// Mutable so individual tests can simulate navigating here with a `recipeId` param.
let mockSearchParams: { recipeId?: string } = {};

// Reassigned on every render of `useFocusEffect` below to point at the current
// component instance's setter, so tests can simulate a "refocus" (screen
// re-entering focus, re-running the foods-loading effect) by calling it.
let mockTriggerRefocus: () => void = () => {};

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: mockFoodsApi,
    foodLog: mockFoodLogApi,
    recipes: mockRecipesApi,
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: () => mockBack() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const React = require('react');
    // `tick` starts each test at 0 and only changes when a test explicitly
    // calls `mockTriggerRefocus`, so this preserves the "fires once on mount"
    // behavior existing tests rely on while allowing an opt-in re-fire.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [tick, setTick] = React.useState(0);
    mockTriggerRefocus = () => setTick((t: number) => t + 1);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => effect(), [tick]);
  },
  useLocalSearchParams: () => mockSearchParams,
}));

import { router } from 'expo-router';
import BuildMealScreen from './build-meal';

describe('BuildMealScreen', () => {
  beforeEach(() => {
    mockAddMany.mockClear();
    mockAdd.mockClear();
    mockSaveRecipe.mockClear();
    mockItemsFor.mockClear();
    mockBack.mockClear();
    mockSearchParams = {};
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

  it('navigates to the add-food modal from the picker', async () => {
    await render(<BuildMealScreen />);

    await fireEvent.press(screen.getByText('Add ingredient'));
    await fireEvent.press(await screen.findByTestId('create-food-button'));

    expect(router.push).toHaveBeenCalledWith('/add-food');
  });

  it('navigates to the scan modal from the picker', async () => {
    await render(<BuildMealScreen />);

    await fireEvent.press(screen.getByText('Add ingredient'));
    await fireEvent.press(await screen.findByTestId('scan-barcode-button'));

    expect(router.push).toHaveBeenCalledWith('/scan');
  });

  it('saves the current ingredients as a recipe via the name-prompt modal', async () => {
    await render(<BuildMealScreen />);

    // Add rice at 60g and chicken at 100g.
    await fireEvent.press(screen.getByText('Add ingredient'));
    await fireEvent.press(await screen.findByText('Rice'));
    await fireEvent.changeText(await screen.findByTestId('grams-input-0'), '60');

    await fireEvent.press(screen.getByText('Add ingredient'));
    await fireEvent.press(await screen.findByText('Chicken breast'));
    await fireEvent.changeText(await screen.findByTestId('grams-input-1'), '100');

    await fireEvent.press(screen.getByTestId('save-recipe-button'));

    const nameInput = await screen.findByTestId('recipe-name-input');
    await fireEvent.changeText(nameInput, 'Rice and chicken bowl');

    await fireEvent.press(screen.getByTestId('confirm-save-recipe-button'));

    expect(mockSaveRecipe).toHaveBeenCalledTimes(1);
    const [recipe, items] = mockSaveRecipe.mock.calls[0];
    expect(recipe.name).toBe('Rice and chicken bowl');
    expect(items).toHaveLength(2);
    expect(items[0].foodId).toBe('food-rice');
    expect(items[0].grams).toBe(60);
    expect(items[1].foodId).toBe('food-chicken');
    expect(items[1].grams).toBe(100);

    // Stays on the build-meal screen — the user may still Log the meal.
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockAddMany).not.toHaveBeenCalled();
  });

  it('disables the confirm button until a recipe name is entered', async () => {
    await render(<BuildMealScreen />);

    await fireEvent.press(screen.getByText('Add ingredient'));
    await fireEvent.press(await screen.findByText('Rice'));
    await fireEvent.changeText(await screen.findByTestId('grams-input-0'), '60');

    await fireEvent.press(screen.getByTestId('save-recipe-button'));

    const confirmButton = await screen.findByTestId('confirm-save-recipe-button');
    expect(confirmButton.props.accessibilityState?.disabled ?? confirmButton.props.disabled).toBe(true);

    await fireEvent.press(confirmButton);
    expect(mockSaveRecipe).not.toHaveBeenCalled();
  });

  it('prefills ingredient rows from a recipeId route param', async () => {
    mockSearchParams = { recipeId: 'r1' };
    mockItemsFor.mockResolvedValueOnce([
      { id: 'ri1', recipeId: 'r1', foodId: 'food-rice', grams: 60 },
      { id: 'ri2', recipeId: 'r1', foodId: 'food-chicken', grams: 100 },
    ]);

    await render(<BuildMealScreen />);

    expect(await screen.findByText('Rice')).toBeTruthy();
    expect(screen.getByText('Chicken breast')).toBeTruthy();
    expect((await screen.findByTestId('grams-input-0')).props.value).toBe('60');
    expect(screen.getByTestId('grams-input-1').props.value).toBe('100');
    expect(mockItemsFor).toHaveBeenCalledWith('r1');
  });

  it('skips recipe items whose food is no longer available', async () => {
    mockSearchParams = { recipeId: 'r2' };
    mockItemsFor.mockResolvedValueOnce([
      { id: 'ri1', recipeId: 'r2', foodId: 'food-rice', grams: 60 },
      { id: 'ri2', recipeId: 'r2', foodId: 'food-missing', grams: 40 },
    ]);

    await render(<BuildMealScreen />);

    expect(await screen.findByText('Rice')).toBeTruthy();
    expect(screen.getByTestId('grams-input-0').props.value).toBe('60');
    expect(screen.queryByTestId('grams-input-1')).toBeNull();
  });

  it('does not clobber an in-progress grams edit when the screen refocuses and reloads foods', async () => {
    mockSearchParams = { recipeId: 'r1' };
    mockItemsFor.mockResolvedValueOnce([
      { id: 'ri1', recipeId: 'r1', foodId: 'food-rice', grams: 60 },
      { id: 'ri2', recipeId: 'r1', foodId: 'food-chicken', grams: 100 },
    ]);

    await render(<BuildMealScreen />);

    const gramsInput = await screen.findByTestId('grams-input-0');
    expect(gramsInput.props.value).toBe('60');

    // User edits the prefilled grams value.
    await fireEvent.changeText(gramsInput, '250');
    expect(screen.getByTestId('grams-input-0').props.value).toBe('250');

    // Simulate a refocus: the foods-loading `useFocusEffect` re-runs and
    // `setAvailable` receives a brand-new `[rice, chicken]` array reference
    // (mockFoodsApi.all() always returns a fresh array literal), which would
    // re-trigger the prefill effect if it weren't guarded by `prefilledRecipeIdRef`.
    await act(async () => {
      mockTriggerRefocus();
      await Promise.resolve();
    });

    expect((await screen.findByTestId('grams-input-0')).props.value).toBe('250');
    expect(mockItemsFor).toHaveBeenCalledTimes(1);
  });
});
