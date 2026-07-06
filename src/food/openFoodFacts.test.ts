import { parseOffProduct, fetchProductByBarcode } from './openFoodFacts';

describe('parseOffProduct', () => {
  const barcode = '5000112637922';
  const now = 1000;

  it('parses a valid product with numeric fields', () => {
    const json = {
      status: 1,
      product: {
        product_name: 'Coca-Cola',
        nutriments: {
          'energy-kcal_100g': 42,
          proteins_100g: 0,
          carbohydrates_100g: 10.6,
          fat_100g: 0,
        },
      },
    };

    expect(parseOffProduct(json, barcode, now)).toEqual({
      id: `off-${barcode}`,
      name: 'Coca-Cola',
      barcode,
      kcalPer100: 42,
      proteinPer100: 0,
      carbPer100: 10.6,
      fatPer100: 0,
      source: 'off',
      createdAt: now,
    });
  });

  it('coerces numeric strings in nutriments', () => {
    const json = {
      status: 1,
      product: {
        product_name: 'Some Snack',
        nutriments: {
          'energy-kcal_100g': '250',
          proteins_100g: '5.5',
          carbohydrates_100g: '30',
          fat_100g: '10',
        },
      },
    };

    expect(parseOffProduct(json, barcode, now)).toEqual({
      id: `off-${barcode}`,
      name: 'Some Snack',
      barcode,
      kcalPer100: 250,
      proteinPer100: 5.5,
      carbPer100: 30,
      fatPer100: 10,
      source: 'off',
      createdAt: now,
    });
  });

  it('returns null when status is 0 (not found)', () => {
    const json = { status: 0 };
    expect(parseOffProduct(json, barcode, now)).toBeNull();
  });

  it('returns null when product is missing', () => {
    const json = { status: 1 };
    expect(parseOffProduct(json, barcode, now)).toBeNull();
  });

  it('returns null when product_name is missing', () => {
    const json = {
      status: 1,
      product: {
        nutriments: {
          'energy-kcal_100g': 100,
          proteins_100g: 1,
          carbohydrates_100g: 1,
          fat_100g: 1,
        },
      },
    };
    expect(parseOffProduct(json, barcode, now)).toBeNull();
  });

  it('returns null when product_name is blank', () => {
    const json = {
      status: 1,
      product: {
        product_name: '   ',
        nutriments: {
          'energy-kcal_100g': 100,
          proteins_100g: 1,
          carbohydrates_100g: 1,
          fat_100g: 1,
        },
      },
    };
    expect(parseOffProduct(json, barcode, now)).toBeNull();
  });

  it('returns null when a required macro is missing', () => {
    const json = {
      status: 1,
      product: {
        product_name: 'Missing Protein',
        nutriments: {
          'energy-kcal_100g': 100,
          carbohydrates_100g: 1,
          fat_100g: 1,
        },
      },
    };
    expect(parseOffProduct(json, barcode, now)).toBeNull();
  });

  it('derives kcal from energy_100g (kJ) when energy-kcal_100g is missing', () => {
    const json = {
      status: 1,
      product: {
        product_name: 'KJ Only',
        nutriments: {
          energy_100g: 418.4,
          proteins_100g: 1,
          carbohydrates_100g: 1,
          fat_100g: 1,
        },
      },
    };
    const food = parseOffProduct(json, barcode, now);
    expect(food).not.toBeNull();
    expect(food?.kcalPer100).toBeCloseTo(100, 1);
  });

  it('returns null when both energy fields are missing', () => {
    const json = {
      status: 1,
      product: {
        product_name: 'No Energy',
        nutriments: {
          proteins_100g: 1,
          carbohydrates_100g: 1,
          fat_100g: 1,
        },
      },
    };
    expect(parseOffProduct(json, barcode, now)).toBeNull();
  });

  it('treats a negative nutriment value as missing', () => {
    const json = {
      status: 1,
      product: {
        product_name: 'Negative Fat',
        nutriments: {
          'energy-kcal_100g': 100,
          proteins_100g: 1,
          carbohydrates_100g: 1,
          fat_100g: -5,
        },
      },
    };
    expect(parseOffProduct(json, barcode, now)).toBeNull();
  });

  it('treats a non-numeric nutriment value as missing', () => {
    const json = {
      status: 1,
      product: {
        product_name: 'Bad Carbs',
        nutriments: {
          'energy-kcal_100g': 100,
          proteins_100g: 1,
          carbohydrates_100g: 'abc',
          fat_100g: 1,
        },
      },
    };
    expect(parseOffProduct(json, barcode, now)).toBeNull();
  });
});

describe('fetchProductByBarcode', () => {
  const barcode = '5000112637922';

  it('returns the parsed Food on a valid ok response, hitting the correct URL', async () => {
    const json = {
      status: 1,
      product: {
        product_name: 'Coca-Cola',
        nutriments: {
          'energy-kcal_100g': 42,
          proteins_100g: 0,
          carbohydrates_100g: 10.6,
          fat_100g: 0,
        },
      },
    };
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => json });

    const food = await fetchProductByBarcode(barcode, { fetchImpl, now: 1000 });

    expect(food).toEqual({
      id: `off-${barcode}`,
      name: 'Coca-Cola',
      barcode,
      kcalPer100: 42,
      proteinPer100: 0,
      carbPer100: 10.6,
      fatPer100: 0,
      source: 'off',
      createdAt: 1000,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain(barcode);
    expect(url).toContain('fields=product_name,nutriments');
  });

  it('returns null when OFF reports status 0 (not found)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 0 }) });

    const food = await fetchProductByBarcode(barcode, { fetchImpl });

    expect(food).toBeNull();
  });

  it('throws when the response is not ok', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    await expect(fetchProductByBarcode(barcode, { fetchImpl })).rejects.toThrow();
  });

  it('propagates a network error from fetchImpl', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(fetchProductByBarcode(barcode, { fetchImpl })).rejects.toThrow('network down');
  });
});
