/**
 * Food search integration tests.
 *
 * Tests replicate the search logic from food.ts using an in-memory libsql DB,
 * following the same pattern as lookup-barcode.test.ts.
 *
 * vi.mock('@savoro/food-data') intercepts searchOFF / normalizeOFFProduct so
 * no HTTP calls are made. cacheOFFResults logic is inlined and awaited
 * explicitly to avoid fire-and-forget gaps.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { like, eq, or, desc, asc } from "drizzle-orm";
import * as schema from "../../../../packages/db/src/schema";
import type { NormalizedResult } from "../../../../packages/food-data/src/normalizer";

// ---------------------------------------------------------------------------
// Module-level mock — prevents any real HTTP calls to Open Food Facts
// ---------------------------------------------------------------------------
vi.mock("@savoro/food-data", () => ({
  searchOFF: vi.fn(),
  getOFFProduct: vi.fn(),
  normalizeOFFProduct: vi.fn(),
}));

import { searchOFF, normalizeOFFProduct } from "@savoro/food-data";

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
  source: "usda" | "off" | "user" | "recipe" = "usda",
  barcode?: string
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
// Inline replication of food.ts search + cacheOFFResults logic
// ---------------------------------------------------------------------------

async function searchFoods(q: string, limit = 20) {
  if (!q) return { foods: [] };

  const pattern = `%${q}%`;

  const localRows = await db
    .select({
      id: schema.food.id,
      name: schema.food.name,
      brandName: schema.food.brandName,
      barcode: schema.food.barcode,
      source: schema.food.source,
      sourceId: schema.food.sourceId,
      isVerified: schema.food.isVerified,
      servingId: schema.serving.id,
      servingDescription: schema.serving.description,
      servingAmountGrams: schema.serving.amountGrams,
      calories: schema.serving.calories,
      protein: schema.serving.protein,
      carb: schema.serving.carb,
      fat: schema.serving.fat,
    })
    .from(schema.food)
    .leftJoin(schema.serving, eq(schema.serving.foodId, schema.food.id))
    .where(
      or(like(schema.food.name, pattern), like(schema.food.brandName, pattern))
    )
    .orderBy(desc(schema.serving.isDefault), asc(schema.serving.id))
    .limit(limit)
    .all();

  const localMap = new Map<string, (typeof localRows)[number]>();
  for (const row of localRows) {
    const existing = localMap.get(row.id);
    if (!existing || (row.servingId && !existing.servingId)) {
      localMap.set(row.id, row);
    }
  }

  const localResults = [...localMap.values()].map((row) => ({
    id: row.id,
    name: row.name,
    brandName: row.brandName,
    barcode: row.barcode,
    source: row.source,
    isVerified: row.isVerified,
    serving: row.servingId
      ? {
          id: row.servingId,
          description: row.servingDescription,
          amountGrams: row.servingAmountGrams,
          calories: row.calories,
          protein: row.protein,
          carb: row.carb,
          fat: row.fat,
        }
      : null,
  }));

  if (localResults.length >= 5) {
    return { foods: localResults.slice(0, limit) };
  }

  // Fallback to OFF
  let offResults: typeof localResults = [];
  const offProducts = await (searchOFF as ReturnType<typeof vi.fn>)(q, limit);
  const normalized: NormalizedResult[] = (offProducts as unknown[])
    .map((p) => (normalizeOFFProduct as ReturnType<typeof vi.fn>)(p))
    .filter((r: NormalizedResult | null): r is NormalizedResult => r !== null);

  const localBarcodes = new Set(
    localResults.filter((r) => r.barcode).map((r) => r.barcode)
  );

  const newItems = normalized.filter(
    (item) => !localBarcodes.has(item.food.barcode)
  );

  // Await cache writes explicitly (unlike fire-and-forget in production)
  if (newItems.length > 0) {
    await cacheOFFResults(newItems);
  }

  offResults = newItems.map((item) => ({
    id: item.food.id,
    name: item.food.name,
    brandName: item.food.brandName,
    barcode: item.food.barcode,
    source: item.food.source,
    isVerified: item.food.isVerified,
    serving: {
      id: item.serving.id,
      description: item.serving.description,
      amountGrams: item.serving.amountGrams,
      calories: item.serving.calories,
      protein: item.serving.protein,
      carb: item.serving.carb,
      fat: item.serving.fat,
    },
  }));

  return { foods: [...localResults, ...offResults].slice(0, limit) };
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("food search: local-first returns at 5+ results", () => {
  it("returns local results without calling searchOFF when 5 matching foods exist", async () => {
    vi.mocked(searchOFF).mockClear();

    const tag = createId();
    for (let i = 1; i <= 5; i++) {
      const id = await insertFood(`Chicken Breast ${tag} ${i}`);
      await insertServing(id);
    }

    const result = await searchFoods(`Chicken Breast ${tag}`);

    expect(result.foods).toHaveLength(5);
    expect(vi.mocked(searchOFF)).not.toHaveBeenCalled();
  });
});

describe("food search: OFF fallback triggers at <5 results", () => {
  it("calls searchOFF and merges OFF results when fewer than 5 local foods match", async () => {
    const tag = createId();
    const barcode = `BC-${createId()}`;

    // Seed 2 local foods
    for (let i = 1; i <= 2; i++) {
      const id = await insertFood(`Obscure Snack ${tag} ${i}`);
      await insertServing(id);
    }

    const offProduct = { _tag: "raw-product" };
    const normalized = buildNormalizedResult(barcode);

    vi.mocked(searchOFF).mockResolvedValueOnce([offProduct]);
    vi.mocked(normalizeOFFProduct).mockReturnValueOnce(normalized);

    const result = await searchFoods(`Obscure Snack ${tag}`);

    expect(vi.mocked(searchOFF)).toHaveBeenCalledOnce();
    expect(result.foods).toHaveLength(3); // 2 local + 1 OFF
    const offItem = result.foods.find((f) => f.barcode === barcode);
    expect(offItem).toBeDefined();
    expect(offItem?.source).toBe("off");
  });
});

describe("food search: cache-on-miss writes to DB", () => {
  it("persists the OFF result in the DB after fallback so the next query is local", async () => {
    const tag = createId();
    const barcode = `BC-CACHE-${createId()}`;
    const normalized = buildNormalizedResult(barcode);

    // No local foods — guaranteed fallback
    vi.mocked(searchOFF).mockResolvedValue([{}]);
    vi.mocked(normalizeOFFProduct).mockReturnValue(normalized);

    await searchFoods(`CacheMiss Food ${tag}`);

    // Verify the food row was written to the DB
    const row = await db
      .select()
      .from(schema.food)
      .where(eq(schema.food.barcode, barcode))
      .get();

    expect(row).toBeDefined();
    expect(row?.source).toBe("off");

    // Verify the serving row was written
    const servingRow = await db
      .select()
      .from(schema.serving)
      .where(eq(schema.serving.foodId, normalized.food.id))
      .get();

    expect(servingRow).toBeDefined();
    expect(servingRow?.calories).toBe(200);
  });
});

describe("food search: deduplication of barcode conflicts", () => {
  it("does not create duplicate DB rows when cacheOFFResults is called twice with the same barcode", async () => {
    const barcode = `BC-DUP-${createId()}`;
    const normalized = buildNormalizedResult(barcode);

    // Call cache twice with the same item
    await cacheOFFResults([normalized]);
    await cacheOFFResults([normalized]);

    const foodRows = await db
      .select()
      .from(schema.food)
      .where(eq(schema.food.barcode, barcode))
      .all();

    expect(foodRows).toHaveLength(1);

    const servingRows = await db
      .select()
      .from(schema.serving)
      .where(eq(schema.serving.foodId, normalized.food.id))
      .all();

    expect(servingRows).toHaveLength(1);
  });
});

describe("food search: empty query", () => {
  it("returns empty array without hitting the DB when query is empty string", async () => {
    vi.mocked(searchOFF).mockClear();

    const result = await searchFoods("");

    expect(result.foods).toEqual([]);
    expect(vi.mocked(searchOFF)).not.toHaveBeenCalled();
  });
});
