// Split templates are pure starting points: an ordered list of session days,
// each day an ordered list of exercises (referenced by library slug) with
// default target sets/reps. Instantiating a template produces the user's own
// editable routine (see buildRoutineFromTemplate in ./routine).

export interface TemplateExercise {
  exerciseSlug: string;
  sets: number;
  reps: number;
}

export interface TemplateDay {
  name: string;
  exercises: TemplateExercise[];
}

export interface SplitTemplate {
  id: string;
  name: string;
  days: TemplateDay[];
}

// Shorthand: [slug, sets, reps].
function d(name: string, ...items: [string, number, number][]): TemplateDay {
  return {
    name,
    exercises: items.map(([exerciseSlug, sets, reps]) => ({ exerciseSlug, sets, reps })),
  };
}

export const SPLIT_TEMPLATES: SplitTemplate[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    days: [
      d('Push',
        ['bench-press', 3, 8], ['incline-dumbbell-press', 3, 10], ['overhead-press', 3, 8],
        ['lateral-raise', 3, 15], ['triceps-pushdown', 3, 12]),
      d('Pull',
        ['deadlift', 3, 5], ['lat-pulldown', 3, 10], ['barbell-row', 3, 8],
        ['face-pull', 3, 15], ['barbell-curl', 3, 12]),
      d('Legs',
        ['squat', 3, 8], ['romanian-deadlift', 3, 10], ['leg-press', 3, 12],
        ['leg-curl', 3, 12], ['calf-raise', 4, 15]),
    ],
  },
  {
    id: 'bro',
    name: 'Bro Split',
    days: [
      d('Chest', ['bench-press', 4, 8], ['incline-dumbbell-press', 3, 10], ['chest-fly', 3, 12]),
      d('Back',
        ['deadlift', 3, 5], ['barbell-row', 4, 8], ['lat-pulldown', 3, 10], ['seated-cable-row', 3, 12]),
      d('Shoulders', ['overhead-press', 4, 8], ['lateral-raise', 4, 15], ['face-pull', 3, 15]),
      d('Arms',
        ['barbell-curl', 4, 10], ['hammer-curl', 3, 12], ['triceps-pushdown', 4, 12],
        ['overhead-triceps-extension', 3, 12]),
      d('Legs',
        ['squat', 4, 8], ['leg-press', 3, 12], ['leg-curl', 3, 12], ['calf-raise', 4, 15]),
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    days: [
      d('Full Body A',
        ['squat', 3, 5], ['bench-press', 3, 5], ['barbell-row', 3, 8],
        ['lateral-raise', 3, 15], ['hanging-leg-raise', 3, 12]),
      d('Full Body B',
        ['deadlift', 3, 5], ['overhead-press', 3, 8], ['lat-pulldown', 3, 10],
        ['leg-press', 3, 12], ['barbell-curl', 3, 12]),
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    days: [
      d('Upper',
        ['bench-press', 4, 8], ['barbell-row', 4, 8], ['overhead-press', 3, 10],
        ['lat-pulldown', 3, 10], ['barbell-curl', 3, 12], ['triceps-pushdown', 3, 12]),
      d('Lower',
        ['squat', 4, 8], ['romanian-deadlift', 3, 10], ['leg-press', 3, 12],
        ['leg-curl', 3, 12], ['calf-raise', 4, 15]),
    ],
  },
  {
    id: 'pplul',
    name: 'Push / Pull / Legs / Upper / Lower',
    days: [
      d('Push',
        ['bench-press', 4, 8], ['overhead-press', 3, 10], ['incline-dumbbell-press', 3, 10],
        ['lateral-raise', 3, 15], ['triceps-pushdown', 3, 12]),
      d('Pull',
        ['deadlift', 3, 5], ['barbell-row', 4, 8], ['lat-pulldown', 3, 10],
        ['face-pull', 3, 15], ['barbell-curl', 3, 12]),
      d('Legs',
        ['squat', 4, 8], ['romanian-deadlift', 3, 10], ['leg-press', 3, 12],
        ['leg-curl', 3, 12], ['calf-raise', 4, 15]),
      d('Upper',
        ['incline-dumbbell-press', 4, 10], ['seated-cable-row', 4, 10], ['dumbbell-shoulder-press', 3, 12],
        ['pull-up', 3, 8], ['hammer-curl', 3, 12], ['overhead-triceps-extension', 3, 12]),
      d('Lower',
        ['leg-press', 4, 12], ['romanian-deadlift', 3, 10], ['leg-extension', 3, 15],
        ['leg-curl', 3, 12], ['hip-thrust', 3, 12], ['calf-raise', 4, 20]),
    ],
  },
];

export function splitTemplateById(id: string): SplitTemplate | undefined {
  return SPLIT_TEMPLATES.find((t) => t.id === id);
}
