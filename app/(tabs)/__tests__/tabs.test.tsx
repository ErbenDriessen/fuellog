import { render } from '@testing-library/react-native';

// The Food screen now depends on `useDb()` (foods + foodLog) and on
// expo-router's `router` / `useFocusEffect`. Neither is available when
// rendering the screen directly (outside <DatabaseProvider> / a Stack
// navigator), so we stub both to keep this a pure component smoke test.
jest.mock('../../../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: {
      all: async () => [],
      add: async () => {},
    },
    foodLog: {
      entriesForDate: async () => [],
      add: async () => {},
    },
    dailyTargets: {
      current: async () => null,
      setTarget: async () => {},
    },
    water: { getForDate: async () => 0, setForDate: async () => {} },
    energy: { getForDate: async () => null, setForDate: async () => {} },
    reflections: { getForDate: async () => null, setForDate: async () => {} },
    gym: {
      routines: async () => [],
      daysFor: async () => [],
      exercisesFor: async () => [],
      allExercises: async () => [],
      saveRoutine: async () => {},
    },
  }),
}));

jest.mock('../../../src/settings/SettingsProvider', () => ({
  useSettings: () => ({
    loading: false,
    mode: 'gentle',
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
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (effect: () => void | (() => void)) => {
    // Lazily require inside the factory: jest.mock factories cannot close
    // over out-of-scope variables/imports from the enclosing module.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useEffect(() => effect(), []);
  },
}));

import Food from '../index';
import Gym from '../gym';
import Progress from '../progress';

describe('tab screens', () => {
  it('renders each screen root', async () => {
    // @testing-library/react-native 14.x's `render` is async (backed by the
    // `test-renderer` package), unlike earlier synchronous versions.
    expect((await render(<Food />)).getByTestId('screen-food')).toBeTruthy();
    expect((await render(<Gym />)).getByTestId('screen-gym')).toBeTruthy();
    expect((await render(<Progress />)).getByTestId('screen-progress')).toBeTruthy();
  });
});
