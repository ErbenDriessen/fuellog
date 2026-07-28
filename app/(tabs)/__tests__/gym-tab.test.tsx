import { render, screen, fireEvent } from '@testing-library/react-native';

import { Routine, RoutineDay, RoutineExercise } from '../../../src/gym/routine';
import { Exercise, EXERCISE_LIBRARY } from '../../../src/gym/exercises';

// Stateful fake backing the mocked gym repository: saveRoutine records what
// was saved, and routines()/daysFor()/exercisesFor() read it back — mirroring
// how the real SQLite-backed repository behaves across a save + reload.
let savedState: { routine: Routine; days: RoutineDay[]; exercises: RoutineExercise[] } | null = null;

const mockSaveRoutine = jest.fn(async (routine: Routine, days: RoutineDay[], exercises: RoutineExercise[]) => {
  savedState = { routine, days, exercises };
});
const mockRoutines = jest.fn(async (): Promise<Routine[]> => (savedState ? [savedState.routine] : []));
const mockDaysFor = jest.fn(async (_routineId: string): Promise<RoutineDay[]> => savedState?.days ?? []);
const mockExercisesFor = jest.fn(
  async (routineDayId: string): Promise<RoutineExercise[]> =>
    (savedState?.exercises ?? []).filter((e) => e.routineDayId === routineDayId),
);
const mockAllExercises = jest.fn(async (): Promise<Exercise[]> => EXERCISE_LIBRARY);

// A pre-existing routine fixture, used by the "existing routine" test — bypasses
// saveRoutine and sets savedState directly, as if a routine were already saved.
const fixtureRoutine: Routine = { id: 'r1', name: 'Push / Pull / Legs', rotationPointer: 0, createdAt: 1000 };
const fixtureDays: RoutineDay[] = [
  { id: 'r1-d0', routineId: 'r1', name: 'Push', sequence: 0, pinnedWeekday: null },
  { id: 'r1-d1', routineId: 'r1', name: 'Pull', sequence: 1, pinnedWeekday: null },
];
const fixtureExercises: RoutineExercise[] = [
  { id: 'r1-d0-e0', routineDayId: 'r1-d0', exerciseId: 'ex-bench-press', targetSets: 3, targetReps: 8, position: 0 },
  { id: 'r1-d0-e1', routineDayId: 'r1-d0', exerciseId: 'ex-overhead-press', targetSets: 3, targetReps: 10, position: 1 },
];

const mockPush = jest.fn();

jest.mock('../../../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    gym: {
      routines: mockRoutines,
      saveRoutine: mockSaveRoutine,
      daysFor: mockDaysFor,
      exercisesFor: mockExercisesFor,
      allExercises: mockAllExercises,
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useEffect(() => effect(), []);
  },
}));

import Gym from '../gym';

describe('Gym tab', () => {
  beforeEach(() => {
    savedState = null;
    mockSaveRoutine.mockClear();
    mockRoutines.mockClear();
    mockDaysFor.mockClear();
    mockExercisesFor.mockClear();
    mockAllExercises.mockClear();
    mockPush.mockClear();
  });

  it('shows the split-template picker when there is no routine yet', async () => {
    await render(<Gym />);

    await screen.findByTestId('template-ppl');
    expect(screen.getByTestId('template-bro')).toBeTruthy();
    expect(screen.getByTestId('template-full-body')).toBeTruthy();
    expect(screen.getByTestId('template-upper-lower')).toBeTruthy();
    expect(screen.getByTestId('template-pplul')).toBeTruthy();
  });

  it('builds and saves a routine from the tapped template, then shows the next session', async () => {
    await render(<Gym />);

    await fireEvent.press(await screen.findByTestId('template-ppl'));

    expect(mockSaveRoutine).toHaveBeenCalledTimes(1);
    const [routine, days, exercises] = mockSaveRoutine.mock.calls[0];
    expect(routine.name).toBe('Push / Pull / Legs');
    expect(days.length).toBe(3);
    expect(exercises.length).toBeGreaterThan(0);

    const nextSession = await screen.findByTestId('next-session');
    expect(nextSession).toBeTruthy();
    expect(screen.getByText('Push')).toBeTruthy();
    expect(screen.getByTestId('start-session')).toBeTruthy();
  });

  it('shows the next session and a Start control for an existing routine', async () => {
    savedState = { routine: fixtureRoutine, days: fixtureDays, exercises: fixtureExercises };

    await render(<Gym />);

    await screen.findByTestId('next-session');
    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
    expect(screen.getByText('Push')).toBeTruthy();
    expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
    expect(screen.getByText('3 × 8')).toBeTruthy();
    expect(screen.getByTestId('start-session')).toBeTruthy();
  });

  it('navigates to the gym-day checklist when Start is pressed', async () => {
    savedState = { routine: fixtureRoutine, days: fixtureDays, exercises: fixtureExercises };

    await render(<Gym />);
    await screen.findByTestId('next-session');

    await fireEvent.press(screen.getByTestId('start-session'));

    expect(mockPush).toHaveBeenCalledWith('/gym-day');
  });
});
