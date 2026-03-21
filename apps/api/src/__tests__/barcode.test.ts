/**
 * Barcode lookup integration tests.
 *
 * Tests replicate the barcode handler logic from food.ts (lines 138-234) using
 * an in-memory libsql DB, following the same pattern as food-search.test.ts.
 *
 * vi.mock('@savoro/food-data') intercepts getOFFProduct / normalizeOFFProduct so
 * no HTTP calls are made. cacheOFFResults logic is inlined and awaited
 * explicitly to avoid fire-and-forget gaps.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import * as schema from "../../../../packages/db/src/schema";
import type { NormalizedResult } from "../../../../packages/food-data/src/normalizer";

// ---------------------------------------------------------------------------
// Module-level mock — prevents any real HTTP calls to Open Food Facts
// ---------------------------------------------------------------------------
vi.mock("@savoro/food-data", () => ({
  getOFFProduct: vi.fn(),
  normalizeOFFProduct: vi.fn(),
  searchOFF: vi.fn(),
}));

import { getOFFProduct, normalizeOFFProduct } from "@savoro/food-data";

// ---------------------------------------------------------------------------
// DB setup
// ---------------------------------------------------------------------------
let client: Client;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  db = drizzle(client, { schema });

  const { readFileSync, readdirSync } = await import("fs");
  const { resolve } = await import("path");
  const migrationDir = resolve(__dirname, "../../../../packages/db/migrations");
  const files = readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(resolve(migrationDir, file), "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("no such index") && !msg.includes("no such column")) {
          throw err;
        }
      }
    }
  }
});

afterAll(() => {
  client.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertFood(
  name: string,
  barcode?: string,
  source: "usda" | "off" | "user" | "recipe" = "usda"
): Promise<string> {
  const id = createId();
  await db.insert(schema.food).values({
    id,
    name,
    source,
    sourceId: createId(),
    isVerified: source === "usda",
    ...(barcode ? { barcode } : {}),
  });
  return id;
}

async function insertServing(foodId: string): Promise<string> {
  const id = createId();
  await db.insert(schema.serving).values({
    id,
    foodId,
    description: "100g",
    amountGrams: 100,
    isDefault: true,
    calories: 165,
    protein: 31,
    carb: 0,
    fat: 4,
  });
  return id;
}

function buildNormalizedResult(barcode: string): NormalizedResult {
  const foodId = createId();
  return {
    food: {
      id: foodId,
      name: `OFF Product ${barcode}`,
      brandName: null,
      barcode,
      source: "off",
      sourceId: barcode,
      isVerified: false,
    },
    serving: {
      id: createId(),
      foodId,
      description: "100g",
      amountGrams: 100,
      isDefault: true,
      calories: 200,
      protein: 20,
      carb: 25,
      fat: 5,
      saturatedFat: null,
      transFat: null,
      polyunsaturatedFat: null,
      monounsaturatedFat: null,
      cholesterol: null,
      sodium: null,
      potassium: null,
      fiber: null,
      sugar: null,
      addedSugars: null,
      vitaminD: null,
      vitaminA: null,
      vitaminC: null,
      calcium: null,
      iron: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Inline replication of food.ts barcode handler + cacheOFFResults logic
// ---------------------------------------------------------------------------

async function cacheOFFResults(items: NormalizedResult[]) {
  for (const item of items) {
    try {
      await db.insert(schema.food).values(item.food).onConflictDoNothing();
      await db
        .insert(schema.serving)
        .values(item.serving)
        .onConflictDoNothing();
    } catch {
      // Silently skip individual failures
    }
  }
}

type BarcodeResult =
  | { found: true; food: object; servings: object[] }
  | { found: false; error: string; status: number };

async function lookupBarcode(code: string): Promise<BarcodeResult> {
  if (!code) {
    return { found: false, error: "Barcode is required", status: 400 };
  }

  // 1. Check local DB first
  const cached = await db
    .select()
    .from(schema.food)
    .where(eq(schema.food.barcode, code))
    .get();

  if (cached) {
    const servings = await db
      .select()
      .from(schema.serving)
      .where(eq(schema.serving.foodId, cached.id))
      .all();

    return {
      found: true,
      food: {
        id: cached.id,
        name: cached.name,
        brandName: cached.brandName,
        barcode: cached.barcode,
        source: cached.source,
        isVerified: cached.isVerified,
      },
      servings: servings.map((s) => ({
        id: s.id,
        description: s.description,
        amountGrams: s.amountGrams,
        isDefault: s.isDefault,
        calories: s.calories,
        protein: s.protein,
        carb: s.carb,
        fat: s.fat,
        saturatedFat: s.saturatedFat,
        transFat: s.transFat,
        fiber: s.fiber,
        sugar: s.sugar,
        sodium: s.sodium,
      })),
    };
  }

  // 2. Fallback: fetch from OFF API
  const offProduct = await (getOFFProduct as ReturnType<typeof vi.fn>)(code);
  if (!offProduct) {
    return { found: false, error: "Product not found", status: 404 };
  }

  const normalized: NormalizedResult | null = (
    normalizeOFFProduct as ReturnType<typeof vi.fn>
  )(offProduct);
  if (!normalized) {
    return {
      found: false,
      error: "Product has incomplete nutrition data",
      status: 404,
    };
  }

  // Await cache explicitly (unlike fire-and-forget in production)
  await cacheOFFResults([normalized]);

  return {
    found: true,
    food: {
      id: normalized.food.id,
      name: normalized.food.name,
      brandName: normalized.food.brandName,
      barcode: normalized.food.barcode,
      source: normalized.food.source,
      isVerified: normalized.food.isVerified,
    },
    servings: [
      {
        id: normalized.serving.id,
        description: normalized.serving.description,
        amountGrams: normalized.serving.amountGrams,
        isDefault: normalized.serving.isDefault,
        calories: normalized.serving.calories,
        protein: normalized.serving.protein,
        carb: normalized.serving.carb,
        fat: normalized.serving.fat,
        saturatedFat: normalized.serving.saturatedFat,
        transFat: normalized.serving.transFat,
        fiber: normalized.serving.fiber,
        sugar: normalized.serving.sugar,
        sodium: normalized.serving.sodium,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("barcode lookup: local DB hit", () => {
  it("returns food with servings from DB without calling getOFFProduct", async () => {
    vi.mocked(getOFFProduct).mockClear();

    const barcode = `BC-LOCAL-${createId()}`;
    const foodId = await insertFood("Chicken Breast", barcode);
    await insertServing(foodId);

    const result = await lookupBarcode(barcode);

    expect(result.found).toBe(true);
    expect(vi.mocked(getOFFProduct)).not.toHaveBeenCalled();

    const r = result as { found: true; food: Record<string, unknown>; servings: object[] };
    expect(r.food).toMatchObject({ barcode, source: "usda" });
    expect(r.servings).toHaveLength(1);
    expect((r.servings[0] as Record<string, unknown>).calories).toBe(165);
  });
});

describe("barcode lookup: OFF fallback + cache", () => {
  it("fetches from OFF, caches result, and returns normalized food+serving", async () => {
    const barcode = `BC-OFF-${createId()}`;
    const normalized = buildNormalizedResult(barcode);

    vi.mocked(getOFFProduct).mockResolvedValueOnce({ _raw: true });
    vi.mocked(normalizeOFFProduct).mockReturnValueOnce(normalized);

    const result = await lookupBarcode(barcode);

    expect(result.found).toBe(true);
    expect(vi.mocked(getOFFProduct)).toHaveBeenCalledWith(barcode);

    const r = result as { found: true; food: Record<string, unknown>; servings: object[] };
    expect(r.food).toMatchObject({ barcode, source: "off" });
    expect(r.servings).toHaveLength(1);
    expect((r.servings[0] as Record<string, unknown>).calories).toBe(200);

    // Verify the food was cached in DB
    const cachedFood = await db
      .select()
      .from(schema.food)
      .where(eq(schema.food.barcode, barcode))
      .get();
    expect(cachedFood).toBeDefined();
    expect(cachedFood?.source).toBe("off");

    // Verify the serving was cached in DB
    const cachedServing = await db
      .select()
      .from(schema.serving)
      .where(eq(schema.serving.foodId, normalized.food.id))
      .get();
    expect(cachedServing).toBeDefined();
    expect(cachedServing?.calories).toBe(200);
  });
});

describe("barcode lookup: unknown barcode + OFF null", () => {
  it("returns not-found result when getOFFProduct returns null", async () => {
    const barcode = `BC-UNKNOWN-${createId()}`;

    vi.mocked(getOFFProduct).mockResolvedValueOnce(null);

    const result = await lookupBarcode(barcode);

    expect(result.found).toBe(false);
    const r = result as { found: false; error: string; status: number };
    expect(r.error).toBe("Product not found");
    expect(r.status).toBe(404);
  });

  it("returns not-found when normalizeOFFProduct returns null", async () => {
    const barcode = `BC-BADNORM-${createId()}`;

    vi.mocked(getOFFProduct).mockResolvedValueOnce({ _raw: true });
    vi.mocked(normalizeOFFProduct).mockReturnValueOnce(null);

    const result = await lookupBarcode(barcode);

    expect(result.found).toBe(false);
    const r = result as { found: false; error: string; status: number };
    expect(r.error).toBe("Product has incomplete nutrition data");
    expect(r.status).toBe(404);
  });
});

describe("barcode lookup: no servings edge case", () => {
  it("returns food found with empty servings array and does not crash", async () => {
    vi.mocked(getOFFProduct).mockClear();

    const barcode = `BC-NOSERVING-${createId()}`;
    await insertFood("Orphan Food", barcode);

    // No serving row inserted

    const result = await lookupBarcode(barcode);

    expect(result.found).toBe(true);
    expect(vi.mocked(getOFFProduct)).not.toHaveBeenCalled();

    const r = result as { found: true; food: Record<string, unknown>; servings: object[] };
    expect(r.food).toMatchObject({ barcode });
    expect(r.servings).toEqual([]);
  });
});
