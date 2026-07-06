// Pure text parser for nutrition-label OCR output. NO camera/ML Kit/UI — see Task 2 for capture.
// Best-effort: OCR text is noisy and label layouts vary (NL/EN, comma decimals, combined lines,
// sub-nutrient lines). Missing fields are simply absent from the result.
export interface ParsedLabel {
  kcalPer100?: number;
  proteinPer100?: number;
  carbPer100?: number;
  fatPer100?: number;
}

// Extract the first macro value for a nutrient: find the first line containing one of `keywords`,
// truncate the line at the first sub-marker (so "of which saturates 2g" can't shadow the total),
// then take the first number appearing AFTER the keyword.
function extractGrams(lines: string[], keywords: string[], subMarkers: string[]): number | undefined {
  for (const line of lines) {
    let scan = line;
    for (const sm of subMarkers) {
      const idx = scan.indexOf(sm);
      if (idx >= 0) scan = scan.slice(0, idx);
    }
    for (const kw of keywords) {
      const ki = scan.indexOf(kw);
      if (ki >= 0) {
        const after = scan.slice(ki + kw.length);
        const m = after.match(/(\d+(?:\.\d+)?)/);
        if (m) return Number(m[1]);
      }
    }
  }
  return undefined;
}

export function parseNutritionLabel(text: string): ParsedLabel {
  // Normalize: lowercase; turn EU decimal commas (1,5 -> 1.5) into dots.
  const norm = text.toLowerCase().replace(/(\d),(\d)/g, '$1.$2');
  const lines = norm.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const result: ParsedLabel = {};

  // Energy: the number immediately before "kcal" anywhere in the text (ignore kJ).
  const kcal = norm.match(/(\d+(?:\.\d+)?)\s*kcal/);
  if (kcal) result.kcalPer100 = Number(kcal[1]);

  // Sub-markers ordered so a line is truncated as soon as ANY of these appears — this keeps
  // "waarvan verzadigde vetzuren" / "of which saturates" / "of which sugars" from ever supplying
  // a number for the total keyword match that follows it on the same (combined) line.
  const fatSubMarkers = ['waarvan', 'of which', 'verzadig', 'saturat'];
  const carbSubMarkers = ['waarvan', 'of which', 'suikers', 'sugars'];

  // Keywords ordered longest-first so a longer word (e.g. "eiwitten") is tried before a shorter
  // one that could also match inside it (e.g. "eiwit"), though indexOf makes this mostly moot
  // here since we only need any match — order kept for clarity/future-proofing.
  result.fatPer100 = extractGrams(
    lines,
    ['vetten', 'vet', 'fat', 'lipides'],
    fatSubMarkers,
  );
  result.carbPer100 = extractGrams(
    lines,
    ['koolhydraten', 'koolhydraat', 'carbohydrates', 'carbohydrate', 'glucides'],
    carbSubMarkers,
  );
  result.proteinPer100 = extractGrams(
    lines,
    ['eiwitten', 'eiwit', 'proteins', 'protein', 'proteines', 'proteine'],
    [], // protein has no common sub-line
  );

  return result;
}
