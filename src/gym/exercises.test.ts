import { EXERCISE_LIBRARY, exerciseIdForSlug, exerciseBySlug } from './exercises';

describe('exercise library', () => {
  it('has unique slugs', () => {
    const slugs = EXERCISE_LIBRARY.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has unique ids', () => {
    const ids = EXERCISE_LIBRARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every exercise a name and muscle group', () => {
    for (const ex of EXERCISE_LIBRARY) {
      expect(ex.name.length).toBeGreaterThan(0);
      expect(ex.muscleGroup.length).toBeGreaterThan(0);
    }
  });

  it('resolves a known slug to its stable id', () => {
    const bench = exerciseBySlug('bench-press');
    expect(bench).toBeDefined();
    expect(exerciseIdForSlug('bench-press')).toBe(bench!.id);
  });

  it('throws on an unknown slug so template typos surface early', () => {
    expect(() => exerciseIdForSlug('no-such-lift')).toThrow(/no-such-lift/);
  });
});
