import { render, fireEvent, screen } from '@testing-library/react-native';

import { Recipe } from '../src/db/repositories/recipesRepository';

const recipe1: Recipe = { id: 'recipe-1', name: 'Rice and chicken bowl', createdAt: 0 };
const recipe2: Recipe = { id: 'recipe-2', name: 'Oatmeal breakfast', createdAt: 1 };

let mockRecipesList: Recipe[] = [recipe1, recipe2];

const mockRecipesApi = {
  all: async () => mockRecipesList,
  itemsFor: async () => [],
  save: async () => {},
};

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    recipes: mockRecipesApi,
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
import RecipesScreen from './recipes';

describe('RecipesScreen', () => {
  beforeEach(() => {
    mockRecipesList = [recipe1, recipe2];
    (router.push as jest.Mock).mockClear();
    (router.back as jest.Mock).mockClear();
  });

  it('renders each saved recipe as a row', async () => {
    await render(<RecipesScreen />);

    expect(await screen.findByTestId('recipe-row-recipe-1')).toBeTruthy();
    expect(screen.getByTestId('recipe-row-recipe-2')).toBeTruthy();
    expect(screen.getByText('Rice and chicken bowl')).toBeTruthy();
    expect(screen.getByText('Oatmeal breakfast')).toBeTruthy();
  });

  it('navigates to build-meal with the recipeId when a row is pressed', async () => {
    await render(<RecipesScreen />);

    await fireEvent.press(await screen.findByTestId('recipe-row-recipe-1'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/build-meal',
      params: { recipeId: 'recipe-1' },
    });
  });

  it('shows an empty state when there are no saved recipes', async () => {
    mockRecipesList = [];
    await render(<RecipesScreen />);

    expect(await screen.findByText('No saved meals yet — build a meal and tap Save.')).toBeTruthy();
  });

  it('closes back on the close button', async () => {
    await render(<RecipesScreen />);

    await fireEvent.press(screen.getByLabelText('Close'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
