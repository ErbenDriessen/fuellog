import { Food } from '../db/repositories/foodsRepository';

// Coerce OFF numeric fields (number | numeric-string | undefined) to a finite >= 0 number, else null.
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Parse an OFF /product response into a Food, or null if not found / not enough data.
export function parseOffProduct(json: unknown, barcode: string, now: number): Food | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as { status?: unknown; product?: any };
  if (obj.status !== 1 || !obj.product) return null;
  const p = obj.product;
  const name = typeof p.product_name === 'string' ? p.product_name.trim() : '';
  if (!name) return null;
  const n = p.nutriments || {};
  // kcal: prefer energy-kcal_100g; else convert energy_100g (kJ) -> kcal (/4.184).
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === null) {
    const kj = num(n['energy_100g']);
    kcal = kj === null ? null : kj / 4.184;
  }
  const protein = num(n['proteins_100g']);
  const carb = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  // Require at least kcal and all three macros to be a usable food.
  if (kcal === null || protein === null || carb === null || fat === null) return null;
  return {
    id: `off-${barcode}`,
    name,
    barcode,
    kcalPer100: Math.round(kcal * 10) / 10,
    proteinPer100: protein,
    carbPer100: carb,
    fatPer100: fat,
    source: 'off',
    createdAt: now,
  };
}

export interface FetchProductOptions {
  fetchImpl?: typeof fetch; // injectable for testing
  now?: number;
}

// Look up a product by barcode. Returns the Food, or null if OFF has no usable product.
// Throws on network / non-OK HTTP so the caller can distinguish "not found" from "offline/failed".
export async function fetchProductByBarcode(
  barcode: string,
  opts: FetchProductOptions = {},
): Promise<Food | null> {
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now();
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,nutriments`;
  const res = await doFetch(url, { headers: { 'User-Agent': 'FuelLog/1.0 (personal food tracker)' } });
  if (!res.ok) throw new Error(`Open Food Facts request failed: ${res.status}`);
  const json = await res.json();
  return parseOffProduct(json, barcode, now);
}
