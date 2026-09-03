import { render, screen, fireEvent } from '@testing-library/react-native';

import { Routine, RoutineDay, RoutineExercise } from '../src/gym/routine';
import { Exercise } from '../src/gym/exercises';
import { WorkoutSession, LoggedSet } from '../src/gym/session';

const fixtureRoutine: Routine = { id: 'r1', name: 'Push / Pull / Legs', rotationPointer: 0, createdAt: 1000 };
const fixtureDays: RoutineDay[] = [
  { id: 'r1-d0', routineId: 'r1', name: 'Push', sequence: 0, pinnedWeekday: null },
  { id: 'r1-d1', routineId: 'r1', name: 'Pull', sequence: 1, pinnedWeekday: null },
];
const fixtureExercises: RoutineExercise[] = [
  { id: 'r1-d0-e0', routineDayId: 'r1-d0', exerciseId: 'ex-bench', targetSets: 3, targetReps: 8, position: 0 },
  { id: 'r1-d0-e1', routineDayId: 'r1-d0', exerciseId: 'ex-ohp', targetSets: 3, targetReps: 10, position: 1 },
];
const fixtureLibrary: Exercise[] = [
  { id: 'ex-bench', slug: 'bench-press', name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { id: 'ex-ohp', slug: 'overhead-press', name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell' },
];
// Bench has finished history at the top weight hitting target reps, so the
// hint should show a suggested (progressed) weight. OHP has no history.
const fixtureBenchHistory: LoggedSet[] = [
  { id: 'ls1', sessionId: 's0', exerciseId: 'ex-bench', setNumber: 1, reps: 8, weight: 60 },
  { id: 'ls2', sessionId: 's0', exerciseId: 'ex-bench', setNumber: 2, reps: 8, weight: 60 },
];

const mockRoutines = jest.fn(async (): Promise<Routine[]> => [fixtureRoutine]);
const mockDaysFor = jest.fn(async (_routineId: string): Promise<RoutineDay[]> => fixtureDays);
const mockExercisesFor = jest.fn(
  async (routineDayId: string): Promise<RoutineExercise[]> =>
    fixtureExercises.filter((e) => e.routineDayId === routineDayId),
);
const mockAllExercises = jest.fn(async (): Promise<Exercise[]> => fixtureLibrary);
const mockLastSetsForExercise = jest.fn(async (exerciseId: string): Promise<LoggedSet[]> =>
  exerciseId === 'ex-bench' ? fixtureBenchHistory : [],
);
const mockSaveSession = jest.fn(async (_session: WorkoutSession, _sets: LoggedSet[]): Promise<void> => {});
const mockSetRotationPointer = jest.fn(async (_routineId: string, _pointer: number): Promise<void> => {});

const mockBack = jest.fn();

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    gym: {
      routines: mockRoutines,
      daysFor: mockDaysFor,
      exercisesFor: mockExercisesFor,
      allExercises: mockAllExercises,
      lastSetsForExercise: mockLastSetsForExercise,
      saveSession: mockSaveSession,
      setRotationPointer: mockSetRotationPointer,
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useEffect(() => effect(), []);
  },
}));

import GymDay from './gym-day';

describe('Gym day checklist', () => {
  beforeEach(() => {
    mockRoutines.mockClear();
    mockDaysFor.mockClear();
    mockExercisesFor.mockClear();
    mockAllExercises.mockClear();
    mockLastSetsForExercise.mockClear();
    mockSaveSession.mockClear();
    mockSetRotationPointer.mockClear();
    mockBack.mockClear();
  });

  it("renders the derived day's exercises", async () => {
    await render(<GymDay />);

    await screen.findByTestId('gym-exercise-r1-d0-e0');
    expect(screen.getByTestId('gym-exercise-r1-d0-e1')).toBeTruthy();
    expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
    expect(screen.getByText('Overhead Press')).toBeTruthy();
  });

  it('shows a progressed overload hint for an exercise with history, and a no-history hint otherwise', async () => {
    await render(<GymDay />);

    const benchHint = await screen.findByTestId('hint-r1-d0-e0');
    expect(benchHint.props.children).toContain('62.5');

    const ohpHint = screen.getByTestId('hint-r1-d0-e1');
    expect(ohpHint.props.children).toContain('No history yet');
  });

  it('logs sets and saves the session, advancing the rotation pointer, on Finish', async () => {
    await render(<GymDay />);

    await screen.findByTestId('gym-exercise-r1-d0-e0');

    await fireEvent.changeText(screen.getByTestId('reps-input-r1-d0-e0-0'), '8');
    await fireEvent.changeText(screen.getByTestId('weight-input-r1-d0-e0-0'), '62.5');
    await fireEvent.press(screen.getByTestId('set-check-r1-d0-e1-0'));

    await fireEvent.press(screen.getByTestId('finish-session'));

    expect(mockSaveSession).toHaveBeenCalledTimes(1);
    const [session, sets] = mockSaveSession.mock.calls[0] as [WorkoutSession, LoggedSet[]];
    expect(session.routineDayId).toBe('r1-d0');
    expect(sets.length).toBeGreaterThan(0);
    const benchSet = sets.find((s) => s.exerciseId === 'ex-bench');
    expect(benchSet?.reps).toBe(8);
    expect(benchSet?.weight).toBe(62.5);

    expect(mockSetRotationPointer).toHaveBeenCalledWith('r1', 1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
