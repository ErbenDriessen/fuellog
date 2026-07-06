import { render, fireEvent, screen } from '@testing-library/react-native';

import { DailyTarget } from '../src/db/repositories/dailyTargetsRepository';
import { todayISO } from '../src/food/date';

const fixtureTarget: DailyTarget = {
  id: 'target-2026-07-01',
  kcal: 2400,
  protein: 165,
  carb: 240,
  fat: 70,
  effectiveFrom: '2026-07-01',
};

const mockSetTarget = jest.fn(async (_t: DailyTarget) => {});
const mockBack = jest.fn();

const mockDailyTargetsApi = {
  current: async () => fixtureTarget,
  setTarget: mockSetTarget,
};

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    dailyTargets: mockDailyTargetsApi,
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: () => mockBack() },
}));

import EditTargetsScreen from './edit-targets';

describe('EditTargetsScreen', () => {
  beforeEach(() => {
    mockSetTarget.mockClear();
    mockBack.mockClear();
  });

  it('prefills the current target and saves an updated target with today as effectiveFrom', async () => {
    await render(<EditTargetsScreen />);

    // Prefilled from dailyTargets.current().
    const kcalInput = await screen.findByTestId('target-kcal-input');
    expect(kcalInput.props.value).toBe('2400');

    await fireEvent.changeText(kcalInput, '2600');
    await fireEvent.press(screen.getByTestId('save-targets-button'));

    expect(mockSetTarget).toHaveBeenCalledTimes(1);
    const saved = mockSetTarget.mock.calls[0][0];
    expect(saved.kcal).toBe(2600);
    expect(saved.protein).toBe(165);
    expect(saved.carb).toBe(240);
    expect(saved.fat).toBe(70);
    expect(saved.effectiveFrom).toBe(todayISO());

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
