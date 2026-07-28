import { buildRoutineFromTemplate } from './routine';
import { SplitTemplate } from './templates';

const fixture: SplitTemplate = {
  id: 'test-split',
  name: 'Test Split',
  days: [
    {
      name: 'Push',
      exercises: [
        { exerciseSlug: 'bench-press', sets: 3, reps: 8 },
        { exerciseSlug: 'overhead-press', sets: 3, reps: 10 },
      ],
    },
    {
      name: 'Pull',
      exercises: [{ exerciseSlug: 'barbell-row', sets: 4, reps: 8 }],
    },
  ],
};

const ids = {
  routineId: 'routine-1',
  makeDayId: (d: number) => `day-${d}`,
  makeExerciseId: (d: number, e: number) => `rex-${d}-${e}`,
};
const resolve = (slug: string) => `ex-${slug}`;

describe('buildRoutineFromTemplate', () => {
  it('creates a routine with a fresh rotation pointer and the given name', () => {
    const { routine } = buildRoutineFromTemplate(fixture, 'My PPL', ids, resolve, 1000);
    expect(routine).toEqual({
      id: 'routine-1',
      name: 'My PPL',
      rotationPointer: 0,
      createdAt: 1000,
    });
  });

  it('trims the routine name', () => {
    const { routine } = buildRoutineFromTemplate(fixture, '  My PPL  ', ids, resolve, 1000);
    expect(routine.name).toBe('My PPL');
  });

  it('produces ordered, unpinned days linked to the routine', () => {
    const { days } = buildRoutineFromTemplate(fixture, 'My PPL', ids, resolve, 1000);
    expect(days).toEqual([
      { id: 'day-0', routineId: 'routine-1', name: 'Push', sequence: 0, pinnedWeekday: null },
      { id: 'day-1', routineId: 'routine-1', name: 'Pull', sequence: 1, pinnedWeekday: null },
    ]);
  });

  it('resolves each exercise slug and preserves per-day order and targets', () => {
    const { exercises } = buildRoutineFromTemplate(fixture, 'My PPL', ids, resolve, 1000);
    expect(exercises).toEqual([
      { id: 'rex-0-0', routineDayId: 'day-0', exerciseId: 'ex-bench-press', targetSets: 3, targetReps: 8, position: 0 },
      { id: 'rex-0-1', routineDayId: 'day-0', exerciseId: 'ex-overhead-press', targetSets: 3, targetReps: 10, position: 1 },
      { id: 'rex-1-0', routineDayId: 'day-1', exerciseId: 'ex-barbell-row', targetSets: 4, targetReps: 8, position: 0 },
    ]);
  });
});
