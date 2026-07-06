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
//
// Keywords are matched with word boundaries (`\bkw\b`), not substring search: without this, a
// standalone sub-nutrient line like "vetzuren 2,1 g" (Dutch "fatty acids", OCR-wrapped onto its
// own line) would match the keyword "vet" as a substring of "vetzuren" and return the saturated
// value as the total. All keywords here are ASCII, so `\b` is safe. Sub-marker truncation stays
// on `indexOf` — sub-markers like "verzadig"/"saturat" are intentional prefixes, not whole words.
function extractGrams(lines: string[], keywords: string[], subMarkers: string[]): number | undefined {
  for (const line of lines) {
    let scan = line;
    for (const sm of subMarkers) {
      const idx = scan.indexOf(sm);
      if (idx >= 0) scan = scan.slice(0, idx);
    }
    for (const kw of keywords) {
      const re = new RegExp('\\b' + kw + '\\b');
      const ki = re.exec(scan);
      if (ki) {
        const after = scan.slice(ki.index + ki[0].length);
        const m = after.match(/(\d+(?:\.\d+)?)/);
        if (m) return Number(m[1]);
      }
    }
  }
  return undefined;
}

// Extract kcal per-line, preferring the real energy row and skipping the mandatory EU
// Reference-Intake footnote (e.g. "Referentie-inname ...: 8400 kJ / 2000 kcal"), which would
// otherwise shadow the true per-100g value if it appears earlier in OCR order.
const RI = /referentie|reference|inname|intake/;
function extractKcal(lines: string[]): number | undefined {
  // 1) prefer a real energy row (contains "energie"/"energy") that is NOT the RI footnote
  for (const l of lines) {
    if (RI.test(l)) continue;
    if (/energie|energy/.test(l)) {
      const m = l.match(/(\d+(?:\.\d+)?)\s*kcal/);
      if (m) return Number(m[1]);
    }
  }
  // 2) fallback: first non-RI line that has a kcal value
  for (const l of lines) {
    if (RI.test(l)) continue;
    const m = l.match(/(\d+(?:\.\d+)?)\s*kcal/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

export function parseNutritionLabel(text: string): ParsedLabel {
  // Normalize: lowercase; turn EU decimal commas (1,5 -> 1.5) into dots.
  const norm = text.toLowerCase().replace(/(\d),(\d)/g, '$1.$2');
  const lines = norm.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const result: ParsedLabel = {};

  // Energy: prefer the real energy row; skip the RI-footnote value if present (see extractKcal).
  const kcal = extractKcal(lines);
  if (kcal !== undefined) result.kcalPer100 = kcal;

  // Sub-markers ordered so a line is truncated as soon as ANY of these appears — this keeps
  // "waarvan verzadigde vetzuren" / "of which saturates" / "of which sugars" from ever supplying
  // a number for the total keyword match that follows it on the same (combined) line.
  const fatSubMarkers = ['waarvan', 'of which', 'verzadig', 'saturat'];
  const carbSubMarkers = ['waarvan', 'of which', 'suikers', 'sugars'];

  // Keywords ordered longest-first so a longer word (e.g. "eiwitten") is tried before a shorter
  // one that could also match inside it (e.g. "eiwit"), though indexOf makes this mostly moot
  // here since we only need any match — order kept for clarity/future-proofing.
  // Only assign a key when a value was actually found — writing an undefined-valued key would
  // clobber caller-supplied defaults when spread as `{...defaults, ...parsed}` (Task 2 form).
  const fat = extractGrams(
    lines,
    ['vetten', 'vet', 'fat', 'lipides'],
    fatSubMarkers,
  );
  if (fat !== undefined) result.fatPer100 = fat;

  const carb = extractGrams(
    lines,
    ['koolhydraten', 'koolhydraat', 'carbohydrates', 'carbohydrate', 'glucides'],
    carbSubMarkers,
  );
  if (carb !== undefined) result.carbPer100 = carb;

  const protein = extractGrams(
    lines,
    ['eiwitten', 'eiwit', 'proteins', 'protein', 'proteines', 'proteine'],
    [], // protein has no common sub-line
  );
  if (protein !== undefined) result.proteinPer100 = protein;

  return result;
}
