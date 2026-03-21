import { describe, it, expect } from "vitest";
import { normalizeOFFProduct, hasValidNutrition } from "./normalizer";
import type { OFFProduct } from "./off";

const validProduct: OFFProduct = {
  code: "3017620422003",
  product_name: "Nutella",
  brands: "Ferrero",
  serving_size: "15g",
  serving_quantity: 15,
  nutriments: {
    "energy-kcal_100g": 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
    "saturated-fat_100g": 10.6,
    sugars_100g: 56.3,
    fiber_100g: 0,
    sodium_100g: 0.041,
  },
};

describe("hasValidNutrition", () => {
  it("returns true for product with all core macros", () => {
    expect(hasValidNutrition(validProduct)).toBe(true);
  });

  it("returns false for product missing calories", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { proteins_100g: 6, carbohydrates_100g: 57, fat_100g: 30 },
    };
    expect(hasValidNutrition(p)).toBe(false);
  });

  it("returns false for product with no nutriments", () => {
    expect(hasValidNutrition({ code: "123" })).toBe(false);
  });
});

describe("normalizeOFFProduct", () => {
  it("normalizes a valid OFF product into food + serving", () => {
    const result = normalizeOFFProduct(validProduct);
    expect(result).not.toBeNull();
    expect(result!.food.name).toBe("Nutella");
    expect(result!.food.brandName).toBe("Ferrero");
    expect(result!.food.barcode).toBe("3017620422003");
    expect(result!.food.source).toBe("off");
    expect(result!.food.sourceId).toBe("3017620422003");

    expect(result!.serving.calories).toBe(539);
    expect(result!.serving.protein).toBe(6.3);
    expect(result!.serving.carb).toBe(57.5);
    expect(result!.serving.fat).toBe(30.9);
    expect(result!.serving.description).toBe("15g");
    expect(result!.serving.amountGrams).toBe(15);
    expect(result!.serving.isDefault).toBe(true);
    expect(result!.serving.foodId).toBe(result!.food.id);
  });

  it("returns null for product without name", () => {
    const p: OFFProduct = { ...validProduct, product_name: undefined };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("returns null for product without valid nutrition", () => {
    const p: OFFProduct = { ...validProduct, nutriments: {} };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("defaults serving to 100g when no serving_size", () => {
    const p: OFFProduct = {
      ...validProduct,
      serving_size: undefined,
      serving_quantity: undefined,
    };
    const result = normalizeOFFProduct(p);
    expect(result!.serving.description).toBe("100g");
    expect(result!.serving.amountGrams).toBe(100);
  });
});

describe("data quality validation", () => {
  const base = validProduct.nutriments!;

  it("rejects NaN calories", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, "energy-kcal_100g": NaN },
    };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("rejects Infinity fat", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, fat_100g: Infinity },
    };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("rejects calories > 1000", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, "energy-kcal_100g": 1001 },
    };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("rejects fat > 100", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, fat_100g: 101 },
    };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("rejects protein > 100", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, proteins_100g: 101 },
    };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("rejects carb > 100", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, carbohydrates_100g: 101 },
    };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("accepts exact bound calories=1000", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, "energy-kcal_100g": 1000 },
    };
    expect(normalizeOFFProduct(p)).not.toBeNull();
  });

  it("accepts exact bound fat=100", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, fat_100g: 100 },
    };
    expect(normalizeOFFProduct(p)).not.toBeNull();
  });

  it("rejects negative calories", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, "energy-kcal_100g": -1 },
    };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("accepts exact bound protein=100", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, proteins_100g: 100 },
    };
    expect(normalizeOFFProduct(p)).not.toBeNull();
  });

  it("accepts exact bound carb=100", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, carbohydrates_100g: 100 },
    };
    expect(normalizeOFFProduct(p)).not.toBeNull();
  });

  it("accepts calories=0 (e.g. water)", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, "energy-kcal_100g": 0 },
    };
    expect(normalizeOFFProduct(p)).not.toBeNull();
  });

  it("accepts -0 as equivalent to 0", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, "energy-kcal_100g": -0 },
    };
    expect(normalizeOFFProduct(p)).not.toBeNull();
  });

  it("rejects -Infinity fat", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, fat_100g: -Infinity },
    };
    expect(normalizeOFFProduct(p)).toBeNull();
  });

  it("optional nutriments field with NaN is stored as null, not rejected", () => {
    const p: OFFProduct = {
      ...validProduct,
      nutriments: { ...base, sodium_100g: NaN },
    };
    const result = normalizeOFFProduct(p);
    expect(result).not.toBeNull();
    expect(result!.serving.sodium).toBeNull();
  });

  it("rejects product missing code", () => {
    const p: OFFProduct = { ...validProduct, code: undefined };
    expect(normalizeOFFProduct(p)).toBeNull();
  });
});
