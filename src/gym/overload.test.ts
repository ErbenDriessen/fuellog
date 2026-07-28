import { progressiveOverloadHint } from './overload';

describe('progressiveOverloadHint', () => {
  it('returns null when the exercise has no history', () => {
    expect(progressiveOverloadHint([], 8)).toBeNull();
  });

  it('suggests adding weight when every top set hit the target reps', () => {
    const hint = progressiveOverloadHint(
      [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }],
      8,
    );
    expect(hint).toEqual({ topWeight: 60, suggestedWeight: 62.5, progressed: true });
  });

  it('holds the weight when a top set missed the target reps', () => {
    const hint = progressiveOverloadHint(
      [{ reps: 8, weight: 60 }, { reps: 7, weight: 60 }, { reps: 6, weight: 60 }],
      8,
    );
    expect(hint).toEqual({ topWeight: 60, suggestedWeight: 60, progressed: false });
  });

  it('judges progression only against sets at the heaviest weight, ignoring warmups', () => {
    const hint = progressiveOverloadHint(
      [{ reps: 12, weight: 40 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }],
      8,
    );
    expect(hint).toEqual({ topWeight: 60, suggestedWeight: 62.5, progressed: true });
  });

  it('accepts a custom increment for isolation work', () => {
    const hint = progressiveOverloadHint([{ reps: 15, weight: 10 }], 15, 1);
    expect(hint).toEqual({ topWeight: 10, suggestedWeight: 11, progressed: true });
  });

  it('credits exceeding the target reps as progression', () => {
    const hint = progressiveOverloadHint([{ reps: 10, weight: 60 }], 8);
    expect(hint?.progressed).toBe(true);
  });
});
