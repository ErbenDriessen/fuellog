import { nextRoutineDay, advanceRotationPointer } from './rotation';
import { RoutineDay } from './routine';

function day(id: string, sequence: number): RoutineDay {
  return { id, routineId: 'r1', name: id, sequence, pinnedWeekday: null };
}

const days = [day('push', 0), day('pull', 1), day('legs', 2)];

describe('nextRoutineDay', () => {
  it('serves the day the pointer references', () => {
    expect(nextRoutineDay(days, 0)?.id).toBe('push');
    expect(nextRoutineDay(days, 1)?.id).toBe('pull');
    expect(nextRoutineDay(days, 2)?.id).toBe('legs');
  });

  it('wraps a pointer past the end back to the start', () => {
    expect(nextRoutineDay(days, 3)?.id).toBe('push');
    expect(nextRoutineDay(days, 7)?.id).toBe('pull');
  });

  it('serves days in sequence order regardless of array order', () => {
    const scrambled = [day('legs', 2), day('push', 0), day('pull', 1)];
    expect(nextRoutineDay(scrambled, 0)?.id).toBe('push');
    expect(nextRoutineDay(scrambled, 2)?.id).toBe('legs');
  });

  it('returns null when there are no days', () => {
    expect(nextRoutineDay([], 0)).toBeNull();
  });
});

describe('advanceRotationPointer', () => {
  it('advances to the next day', () => {
    expect(advanceRotationPointer(0, 3)).toBe(1);
    expect(advanceRotationPointer(1, 3)).toBe(2);
  });

  it('wraps around after the last day', () => {
    expect(advanceRotationPointer(2, 3)).toBe(0);
  });

  it('normalizes an already-out-of-range pointer', () => {
    expect(advanceRotationPointer(5, 3)).toBe(0);
  });

  it('stays at zero when there are no days', () => {
    expect(advanceRotationPointer(0, 0)).toBe(0);
  });
});
