import { RoutineDay } from './routine';

// The rotation model: a routine's days are an ordered cycle. The pointer names
// the next session to serve; finishing a session advances it. Missing calendar
// days never matters — the sequence just continues from wherever it is.

// The day the pointer currently references, wrapping if the pointer has run past
// the end. Days are served in `sequence` order regardless of array order.
export function nextRoutineDay(days: RoutineDay[], rotationPointer: number): RoutineDay | null {
  if (days.length === 0) return null;
  const ordered = [...days].sort((a, b) => a.sequence - b.sequence);
  const index = ((rotationPointer % ordered.length) + ordered.length) % ordered.length;
  return ordered[index];
}

// The pointer after finishing a session, normalized into [0, dayCount).
export function advanceRotationPointer(rotationPointer: number, dayCount: number): number {
  if (dayCount <= 0) return 0;
  return ((rotationPointer % dayCount) + 1) % dayCount;
}
