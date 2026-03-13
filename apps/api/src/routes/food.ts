import { Hono } from "hono";
import { like, eq, or } from "drizzle-orm";
import { db, food, serving } from "@savoro/db";
import { searchOFF, normalizeOFFProduct, type NormalizedResult } from "@savoro/food-data";
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
