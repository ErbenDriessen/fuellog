import { render, fireEvent, screen } from '@testing-library/react-native';

import { Food } from '../src/db/repositories/foodsRepository';

const mockAdd = jest.fn(async (_food: Food) => {});
const mockBack = jest.fn();

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: { add: mockAdd, all: async () => [] },
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: () => mockBack() },
}));

import AddFoodScreen from './add-food';

describe('AddFoodScreen', () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockBack.mockClear();
  });

  it('disables Save until the form is filled, then saves a manual food and navigates back', async () => {
    await render(<AddFoodScreen />);

    const saveButton = screen.getByTestId('save-food-button');
    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('food-name-input'), '  Greek yoghurt  ');
    await fireEvent.changeText(screen.getByTestId('food-kcal-input'), '59');
    await fireEvent.changeText(screen.getByTestId('food-protein-input'), '10');
    await fireEvent.changeText(screen.getByTestId('food-carb-input'), '3.6');
    await fireEvent.changeText(screen.getByTestId('food-fat-input'), '0.4');

    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBeFalsy();

    await fireEvent.press(saveButton);

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const saved = mockAdd.mock.calls[0][0];
    expect(saved).toEqual(
      expect.objectContaining({
        name: 'Greek yoghurt',
        barcode: null,
        source: 'manual',
        kcalPer100: 59,
        proteinPer100: 10,
        carbPer100: 3.6,
        fatPer100: 0.4,
      }),
    );
    expect(saved.id).toEqual(expect.stringMatching(/^food-/));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps Save disabled when the name is empty', async () => {
    await render(<AddFoodScreen />);

    await fireEvent.changeText(screen.getByTestId('food-kcal-input'), '59');
    await fireEvent.changeText(screen.getByTestId('food-protein-input'), '10');
    await fireEvent.changeText(screen.getByTestId('food-carb-input'), '3.6');
    await fireEvent.changeText(screen.getByTestId('food-fat-input'), '0.4');

    const saveButton = screen.getByTestId('save-food-button');
    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBe(true);

    await fireEvent.press(saveButton);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('shows an inline error and stays open when add rejects', async () => {
    mockAdd.mockRejectedValueOnce(new Error('disk full'));
    await render(<AddFoodScreen />);

    await fireEvent.changeText(screen.getByTestId('food-name-input'), 'Greek yoghurt');
    await fireEvent.changeText(screen.getByTestId('food-kcal-input'), '59');
    await fireEvent.changeText(screen.getByTestId('food-protein-input'), '10');
    await fireEvent.changeText(screen.getByTestId('food-carb-input'), '3.6');
    await fireEvent.changeText(screen.getByTestId('food-fat-input'), '0.4');

    await fireEvent.press(screen.getByTestId('save-food-button'));

    expect(await screen.findByTestId('save-food-error')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByTestId('save-food-button').props.disabled).toBeFalsy();
  });
});
