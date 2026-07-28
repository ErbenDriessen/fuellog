// Progressive-overload suggestion using simple double progression: once every
// working set at the heaviest weight reaches the target reps, bump the weight;
// otherwise hold and aim to complete the reps. Warmup sets (lighter weight) are
// ignored so they never suppress a suggested increase.

export interface PerformedSet {
  reps: number;
  weight: number;
}

export interface OverloadHint {
  topWeight: number;
  suggestedWeight: number;
  progressed: boolean;
}

export function progressiveOverloadHint(
  lastSets: PerformedSet[],
  targetReps: number,
  increment = 2.5,
): OverloadHint | null {
  if (lastSets.length === 0) return null;
  const topWeight = Math.max(...lastSets.map((s) => s.weight));
  const topSets = lastSets.filter((s) => s.weight === topWeight);
  const progressed = topSets.every((s) => s.reps >= targetReps);
  return {
    topWeight,
    suggestedWeight: progressed ? topWeight + increment : topWeight,
    progressed,
  };
}
