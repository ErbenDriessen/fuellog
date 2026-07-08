// The starter exercise catalogue. Templates reference exercises by `slug`; the
// stable `id` (ex-<slug>) is what routines and logged sets store. Users can add
// their own exercises later, but these ship so every split template resolves.

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  muscleGroup: string;
  equipment: string;
}

function ex(slug: string, name: string, muscleGroup: string, equipment: string): Exercise {
  return { id: `ex-${slug}`, slug, name, muscleGroup, equipment };
}

export const EXERCISE_LIBRARY: Exercise[] = [
  // Push
  ex('bench-press', 'Barbell Bench Press', 'Chest', 'Barbell'),
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'Chest', 'Dumbbell'),
  ex('chest-fly', 'Cable Chest Fly', 'Chest', 'Cable'),
  ex('overhead-press', 'Overhead Press', 'Shoulders', 'Barbell'),
  ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell'),
  ex('lateral-raise', 'Lateral Raise', 'Shoulders', 'Dumbbell'),
  ex('triceps-pushdown', 'Triceps Pushdown', 'Triceps', 'Cable'),
  ex('overhead-triceps-extension', 'Overhead Triceps Extension', 'Triceps', 'Dumbbell'),
  // Pull
  ex('deadlift', 'Deadlift', 'Back', 'Barbell'),
  ex('pull-up', 'Pull-Up', 'Back', 'Bodyweight'),
  ex('lat-pulldown', 'Lat Pulldown', 'Back', 'Cable'),
  ex('barbell-row', 'Barbell Row', 'Back', 'Barbell'),
  ex('seated-cable-row', 'Seated Cable Row', 'Back', 'Cable'),
  ex('face-pull', 'Face Pull', 'Rear Delts', 'Cable'),
  ex('barbell-curl', 'Barbell Curl', 'Biceps', 'Barbell'),
  ex('hammer-curl', 'Hammer Curl', 'Biceps', 'Dumbbell'),
  // Legs
  ex('squat', 'Back Squat', 'Quads', 'Barbell'),
  ex('leg-press', 'Leg Press', 'Quads', 'Machine'),
  ex('romanian-deadlift', 'Romanian Deadlift', 'Hamstrings', 'Barbell'),
  ex('leg-curl', 'Leg Curl', 'Hamstrings', 'Machine'),
  ex('leg-extension', 'Leg Extension', 'Quads', 'Machine'),
  ex('calf-raise', 'Standing Calf Raise', 'Calves', 'Machine'),
  ex('hip-thrust', 'Hip Thrust', 'Glutes', 'Barbell'),
  // Core
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'Bodyweight'),
  ex('cable-crunch', 'Cable Crunch', 'Core', 'Cable'),
];

const BY_SLUG = new Map(EXERCISE_LIBRARY.map((e) => [e.slug, e]));

export function exerciseBySlug(slug: string): Exercise | undefined {
  return BY_SLUG.get(slug);
}

export function exerciseIdForSlug(slug: string): string {
  const found = BY_SLUG.get(slug);
  if (!found) throw new Error(`Unknown exercise slug: ${slug}`);
  return found.id;
}
