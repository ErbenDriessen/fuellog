export interface WorkoutSession {
  id: string;
  routineDayId: string | null;
  startedAt: number;
  finishedAt: number | null;
}

export interface LoggedSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
}
