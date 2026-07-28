import { SPLIT_TEMPLATES, splitTemplateById } from './templates';
import { exerciseBySlug } from './exercises';

describe('split templates', () => {
  it('ships the five planned splits', () => {
    expect(SPLIT_TEMPLATES.map((t) => t.id)).toEqual([
      'ppl',
      'bro',
      'full-body',
      'upper-lower',
      'pplul',
    ]);
  });

  it('has unique template ids', () => {
    const ids = SPLIT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every template a name and at least one day', () => {
    for (const t of SPLIT_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.days.length).toBeGreaterThan(0);
    }
  });

  it('every day has a name and at least one exercise with positive targets', () => {
    for (const t of SPLIT_TEMPLATES) {
      for (const day of t.days) {
        expect(day.name.length).toBeGreaterThan(0);
        expect(day.exercises.length).toBeGreaterThan(0);
        for (const ex of day.exercises) {
          expect(ex.sets).toBeGreaterThan(0);
          expect(ex.reps).toBeGreaterThan(0);
        }
      }
    }
  });

  it('references only exercises that exist in the library', () => {
    for (const t of SPLIT_TEMPLATES) {
      for (const day of t.days) {
        for (const ex of day.exercises) {
          expect(exerciseBySlug(ex.exerciseSlug)).toBeDefined();
        }
      }
    }
  });

  it('looks a template up by id', () => {
    expect(splitTemplateById('ppl')?.name).toBeDefined();
    expect(splitTemplateById('nope')).toBeUndefined();
  });
});
