import { parseNutritionLabel } from './labelParser';

describe('parseNutritionLabel', () => {
  it('parses a Dutch label with kJ+kcal, comma decimals, and sub-lines on their own lines', () => {
    const text = `
      Voedingswaarde per 100 g
      Energie 1046 kJ / 250 kcal
      Vetten 12,5 g
      waarvan verzadigde vetzuren 2,1 g
      Koolhydraten 30,0 g
      waarvan suikers 5,0 g
      Eiwitten 8,0 g
      Zout 1,2 g
    `;
    expect(parseNutritionLabel(text)).toEqual({
      kcalPer100: 250,
      fatPer100: 12.5,
      carbPer100: 30,
      proteinPer100: 8,
    });
  });

  it('parses an English label with "of which saturates/sugars" sub-lines', () => {
    const text = `
      Nutrition per 100 g
      Energy 250 kcal
      Fat 12.5g
      of which saturates 2.1g
      Carbohydrate 30g
      of which sugars 5g
      Protein 8g
    `;
    expect(parseNutritionLabel(text)).toEqual({
      kcalPer100: 250,
      fatPer100: 12.5,
      carbPer100: 30,
      proteinPer100: 8,
    });
  });

  it('takes the total, not the sub-value, when fat and sub-line are combined on one line', () => {
    const text = `
      Energie 1046 kJ / 250 kcal
      Vetten 12,5 g, waarvan verzadigd 2,1 g
      Koolhydraten 30 g waarvan suikers 5 g
      Eiwitten 8 g
    `;
    const result = parseNutritionLabel(text);
    expect(result.fatPer100).toBe(12.5);
    expect(result.carbPer100).toBe(30);
  });

  it('never lets sub-nutrient lines shadow the totals (fat/carb assertions across NL/EN/combined)', () => {
    const nl = parseNutritionLabel(`
      Vetten 12,5 g
      waarvan verzadigde vetzuren 2,1 g
      Koolhydraten 30,0 g
      waarvan suikers 5,0 g
    `);
    expect(nl.fatPer100).toBe(12.5);
    expect(nl.carbPer100).toBe(30);

    const en = parseNutritionLabel(`
      Fat 12.5g
      of which saturates 2.1g
      Carbohydrate 30g
      of which sugars 5g
    `);
    expect(en.fatPer100).toBe(12.5);
    expect(en.carbPer100).toBe(30);

    const combined = parseNutritionLabel(`
      Vetten 12,5 g, waarvan verzadigd 2,1 g
      Koolhydraten 30 g waarvan suikers 5 g
    `);
    expect(combined.fatPer100).toBe(12.5);
    expect(combined.carbPer100).toBe(30);
  });

  it('extracts only the fields present when the label is partial (energy + protein only)', () => {
    const text = `
      Energie 1046 kJ / 250 kcal
      Eiwitten 8,0 g
    `;
    expect(parseNutritionLabel(text)).toEqual({
      kcalPer100: 250,
      proteinPer100: 8,
    });
  });

  it('leaves kcalPer100 undefined when only kJ is present (no kcal number)', () => {
    const text = `
      Energie 1046 kJ
      Vetten 12,5 g
    `;
    const result = parseNutritionLabel(text);
    expect(result.kcalPer100).toBeUndefined();
    expect(result.fatPer100).toBe(12.5);
  });

  it('returns an empty object when there is no usable nutrition text', () => {
    const text = 'ingredients: water, sugar, salt';
    expect(parseNutritionLabel(text)).toEqual({});
  });

  it('handles whole-number and unit/spacing variations (12g, 12.5 g, 8,0g)', () => {
    const text = `
      Fat 12g
      Carbohydrate 12.5 g
      Protein 8,0g
    `;
    const result = parseNutritionLabel(text);
    expect(result.fatPer100).toBe(12);
    expect(result.carbPer100).toBe(12.5);
    expect(result.proteinPer100).toBe(8);
  });

  it('does not let a standalone sub-nutrient line ("vetzuren") shadow a missing fat total', () => {
    const text = `
      Eiwitten 8,0 g
      vetzuren 2,1 g
    `;
    const result = parseNutritionLabel(text);
    expect(result.fatPer100).toBeUndefined();
    expect(result.proteinPer100).toBe(8);
  });

  it('does not let a wrapped sub-nutrient line ("waarvan verzadigde" / "vetzuren" split across lines) shadow a missing fat total', () => {
    const text = `
      Eiwitten 8,0 g
      waarvan verzadigde
      vetzuren 2,1 g
    `;
    const result = parseNutritionLabel(text);
    expect(result.fatPer100).toBeUndefined();
    expect(result.proteinPer100).toBe(8);
  });

  it('does not let a standalone "suikers" line shadow a missing carbohydrate total', () => {
    const text = `
      Eiwitten 8,0 g
      suikers 5 g
    `;
    const result = parseNutritionLabel(text);
    expect(result.carbPer100).toBeUndefined();
    expect(result.proteinPer100).toBe(8);
  });

  it('prefers the real energy row kcal over an EU Reference-Intake footnote appearing earlier', () => {
    const text = `
      Referentie-inname van een gemiddelde volwassene: 8400 kJ / 2000 kcal
      Energie 1046 kJ / 250 kcal
      Vetten 12,5 g
    `;
    const result = parseNutritionLabel(text);
    expect(result.kcalPer100).toBe(250);
  });

  it('leaves genuinely-missing macro keys absent (not just undefined-valued) so they cannot clobber spread defaults', () => {
    const text = `
      Energie 1046 kJ / 250 kcal
      Eiwitten 8,0 g
    `;
    const result = parseNutritionLabel(text);
    expect('fatPer100' in result).toBe(false);
    expect('carbPer100' in result).toBe(false);
  });
});
