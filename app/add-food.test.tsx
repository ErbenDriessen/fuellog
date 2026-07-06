import { render, fireEvent, screen } from '@testing-library/react-native';

import { Food } from '../src/db/repositories/foodsRepository';

const mockAdd = jest.fn(async (_food: Food) => {});
const mockBack = jest.fn();

// Mutable so tests can simulate navigating here with OCR/scan prefill params; defaults to the
// plain "create a food" path (no params).
let mockSearchParams: { kcal?: string; protein?: string; carb?: string; fat?: string } = {};

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: { add: mockAdd, all: async () => [] },
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: () => mockBack() },
  useLocalSearchParams: () => mockSearchParams,
}));

import AddFoodScreen from './add-food';

describe('AddFoodScreen', () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockBack.mockClear();
    mockSearchParams = {};
  });

  it('disables Save until the form is filled, then saves a manual food and navigates back', async () => {
    await render(<AddFoodScreen />);

    const saveButton = screen.getByTestId('save-food-button');
    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('food-name-input'), '  Greek yoghurt  ');
    await fireEvent.changeText(screen.getByTestId('food-kcal-input'), '59');
    await fireEvent.changeText(screen.getByTestId('food-protein-input'), '10');
    await fireEvent.changeText(screen.getByTestId('food-carb-input'), '3.6');
    await fireEvent.changeText(screen.getByTestId('food-fat-input'), '0');

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
        fatPer100: 0,
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

  it('keeps Save disabled when the name is filled but a macro field is left blank', async () => {
    await render(<AddFoodScreen />);

    await fireEvent.changeText(screen.getByTestId('food-name-input'), 'Greek yoghurt');
    await fireEvent.changeText(screen.getByTestId('food-kcal-input'), '59');
    await fireEvent.changeText(screen.getByTestId('food-protein-input'), '10');
    await fireEvent.changeText(screen.getByTestId('food-carb-input'), '3.6');
    // fat field left blank

    const saveButton = screen.getByTestId('save-food-button');
    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBe(true);

    await fireEvent.press(saveButton);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('enables Save once the name and all four macro fields are filled, including an explicit zero', async () => {
    await render(<AddFoodScreen />);

    await fireEvent.changeText(screen.getByTestId('food-name-input'), 'Greek yoghurt');
    await fireEvent.changeText(screen.getByTestId('food-kcal-input'), '59');
    await fireEvent.changeText(screen.getByTestId('food-protein-input'), '10');
    await fireEvent.changeText(screen.getByTestId('food-carb-input'), '3.6');
    await fireEvent.changeText(screen.getByTestId('food-fat-input'), '0');

    const saveButton = screen.getByTestId('save-food-button');
    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBeFalsy();
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

  it('prefills the macro fields from OCR/scan route params, leaving name empty for the user to type', async () => {
    mockSearchParams = { kcal: '250', protein: '8', carb: '30', fat: '12.5' };
    await render(<AddFoodScreen />);

    expect(screen.getByTestId('food-name-input').props.value).toBe('');
    expect(screen.getByTestId('food-kcal-input').props.value).toBe('250');
    expect(screen.getByTestId('food-protein-input').props.value).toBe('8');
    expect(screen.getByTestId('food-carb-input').props.value).toBe('30');
    expect(screen.getByTestId('food-fat-input').props.value).toBe('12.5');

    // Save is still gated on entering a name — prefill alone doesn't bypass validation.
    const saveButton = screen.getByTestId('save-food-button');
    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('food-name-input'), 'Scanned yoghurt');
    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBeFalsy();
  });
});
