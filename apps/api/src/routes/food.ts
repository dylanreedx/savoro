import { Hono } from "hono";
import { like, eq, or, desc, asc } from "drizzle-orm";
import { db, food, serving } from "@savoro/db";
import { searchOFF, getOFFProduct, normalizeOFFProduct, type NormalizedResult } from "@savoro/food-data";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const foodRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// GET /food/search?q=chicken&limit=20
// ---------------------------------------------------------------------------
foodRoutes.get("/search", requireAuth, async (c) => {
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Number(c.req.query("limit")) || 20, 50);

  if (!q) {
    return c.json({ foods: [] });
  }

  const pattern = `%${q}%`;

  // 1. Search local DB first (LIKE match on name and brand)
  const localRows = await db
    .select({
      id: food.id,
      name: food.name,
      brandName: food.brandName,
      barcode: food.barcode,
      source: food.source,
      sourceId: food.sourceId,
      isVerified: food.isVerified,
      servingId: serving.id,
      servingDescription: serving.description,
      servingAmountGrams: serving.amountGrams,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(food)
    .leftJoin(serving, eq(serving.foodId, food.id))
    .where(or(like(food.name, pattern), like(food.brandName, pattern)))
    .orderBy(desc(serving.isDefault), asc(serving.id))
    .limit(limit)
    .all();

  // Group by food (a food may have multiple servings, take the default or first)
  const localMap = new Map<
    string,
    (typeof localRows)[number]
  >();
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

  // 2. If enough local results, return early
  if (localResults.length >= 5) {
    return c.json({ foods: localResults.slice(0, limit) });
  }

  // 3. Fallback: fetch from Open Food Facts API
  let offResults: typeof localResults = [];
  try {
    const offProducts = await searchOFF(q, limit);

    const normalized = offProducts
      .map(normalizeOFFProduct)
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Deduplicate against local results by barcode
    const localBarcodes = new Set(
      localResults.filter((r) => r.barcode).map((r) => r.barcode)
    );

    const newItems = normalized.filter(
      (item) => !localBarcodes.has(item.food.barcode)
    );

    // Fire-and-forget: upsert new foods into local DB for future cache hits
    if (newItems.length > 0) {
      cacheOFFResults(newItems).catch((err) =>
        console.error("Failed to cache OFF results:", err)
      );
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
  } catch (err) {
    console.error("OFF API search error:", err);
  }

  // 4. Merge local + OFF, deduplicate, return
  const merged = [...localResults, ...offResults].slice(0, limit);
  return c.json({ foods: merged });
});

// ---------------------------------------------------------------------------
// GET /food/barcode/:code
// ---------------------------------------------------------------------------
foodRoutes.get("/barcode/:code", requireAuth, async (c) => {
  const code = c.req.param("code")?.trim();

  if (!code) {
    return c.json({ error: "Barcode is required" }, 400);
  }

  // 1. Check local DB first
  const cached = await db
    .select()
    .from(food)
    .where(eq(food.barcode, code))
    .get();

  if (cached) {
    const servings = await db
      .select()
      .from(serving)
      .where(eq(serving.foodId, cached.id))
      .all();

    return c.json({
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
    });
  }

  // 2. Fallback: fetch from OFF API
  try {
    const offProduct = await getOFFProduct(code);
    if (!offProduct) {
      return c.json({ error: "Product not found" }, 404);
    }

    const normalized = normalizeOFFProduct(offProduct);
    if (!normalized) {
      return c.json({ error: "Product has incomplete nutrition data" }, 404);
    }

    // Cache in local DB (fire-and-forget)
    cacheOFFResults([normalized]).catch((err) =>
      console.error("Failed to cache barcode result:", err)
    );

    return c.json({
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
    });
  } catch (err) {
    console.error("OFF barcode lookup error:", err);
    return c.json({ error: "Failed to look up barcode" }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /food/:id/servings — all servings for a food
// ---------------------------------------------------------------------------
foodRoutes.get("/:id/servings", requireAuth, async (c) => {
  const foodId = c.req.param("id")?.trim();

  if (!foodId) {
    return c.json({ error: "Food ID is required" }, 400);
  }

  const servings = await db
    .select({
      id: serving.id,
      description: serving.description,
      amountGrams: serving.amountGrams,
      isDefault: serving.isDefault,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(serving)
    .where(eq(serving.foodId, foodId))
    .all();

  return c.json({ servings });
});

// ---------------------------------------------------------------------------
// Cache OFF results into local Turso DB (fire-and-forget)
// ---------------------------------------------------------------------------
async function cacheOFFResults(items: NormalizedResult[]) {
  for (const item of items) {
    try {
      // Use INSERT OR IGNORE to avoid conflicts on barcode/sourceId
      await db
        .insert(food)
        .values(item.food)
        .onConflictDoNothing();

      await db
        .insert(serving)
        .values(item.serving)
        .onConflictDoNothing();
    } catch {
      // Silently skip individual failures
    }
  }
}

export default foodRoutes;
