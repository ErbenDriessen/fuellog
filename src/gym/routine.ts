import { SplitTemplate } from './templates';

// A routine is the user's own ordered sequence of session days, born from a
// template but freely editable afterwards. rotationPointer indexes the next
// day to serve (see the rotation model in the spec).
export interface Routine {
  id: string;
  name: string;
  rotationPointer: number;
  createdAt: number;
}

export interface RoutineDay {
  id: string;
  routineId: string;
  name: string;
  sequence: number;
  pinnedWeekday: number | null;
}

export interface RoutineExercise {
  id: string;
  routineDayId: string;
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  position: number;
}

export interface RoutineIds {
  routineId: string;
  makeDayId: (dayIndex: number) => string;
  makeExerciseId: (dayIndex: number, exIndex: number) => string;
}

// Instantiate a template into a concrete routine. Slugs are resolved to the
// library's exercise ids via `resolveExerciseId` so this stays decoupled from
// the exercise catalogue.
export function buildRoutineFromTemplate(
  template: SplitTemplate,
  routineName: string,
  ids: RoutineIds,
  resolveExerciseId: (slug: string) => string,
  createdAt: number,
): { routine: Routine; days: RoutineDay[]; exercises: RoutineExercise[] } {
  const routine: Routine = {
    id: ids.routineId,
    name: routineName.trim(),
    rotationPointer: 0,
    createdAt,
  };

  const days: RoutineDay[] = [];
  const exercises: RoutineExercise[] = [];

  template.days.forEach((day, d) => {
    const dayId = ids.makeDayId(d);
    days.push({
      id: dayId,
      routineId: routine.id,
      name: day.name,
      sequence: d,
      pinnedWeekday: null,
    });
    day.exercises.forEach((ex, e) => {
      exercises.push({
        id: ids.makeExerciseId(d, e),
        routineDayId: dayId,
        exerciseId: resolveExerciseId(ex.exerciseSlug),
        targetSets: ex.sets,
        targetReps: ex.reps,
        position: e,
      });
    });
  });

  return { routine, days, exercises };
}
