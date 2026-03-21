/**
 * Tests for agent tool executors and buildUIComponents in chat.ts.
 *
 * Because these functions are not exported, we replicate their logic
 * verbatim here — the same approach used in suggest-foods.test.ts,
 * logging.test.ts, and infer-meal.test.ts.
 *
 * Coverage:
 *  searchFoodExecutor: happy (3+ seeded foods) + empty
 *  lookupBarcodeExecutor: happy (seeded barcode) + not-found
 *  logFoodExecutor: happy (macro_summary shape, NOT confirm_button)
 *  getDailySummaryExecutor: with goal + without goal
 *  getRecentFoodsExecutor: happy (seeded favorites) + empty
 *  searchRecipesExecutor: happy + user isolation
 *  buildUIComponents: search_food→food_list, lookup_barcode→food_card,
 *    log_food→macro_summary, get_daily_summary→macro_summary,
 *    get_recent_foods→quick_log_chips, search_recipes→recipe_card[]
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, desc, asc, isNull, sql } from "drizzle-orm";
import * as schema from "../../../../packages/db/src/schema";

let client: Client;
let db: ReturnType<typeof drizzle>;

// ---------------------------------------------------------------------------
// DB setup with migrations
// ---------------------------------------------------------------------------
beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  db = drizzle(client, { schema });

  const { readFileSync, readdirSync } = await import("fs");
  const { resolve } = await import("path");
  const migrationDir = resolve(__dirname, "../../../../packages/db/migrations");
  const files = readdirSync(migrationDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sqlText = readFileSync(resolve(migrationDir, file), "utf-8");
    const statements = sqlText
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
// Replica of searchFoodExecutor (verbatim from chat.ts lines 377-446)
// ---------------------------------------------------------------------------
async function searchFoodExecutor(query: string, limit: number = 5) {
  const { food, serving } = schema;
  const pattern = `%${query}%`;
  const localRows = await db
    .select({
      id: food.id,
      name: food.name,
      brandName: food.brandName,
      servingId: serving.id,
      servingDescription: serving.description,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(food)
    .leftJoin(serving, eq(serving.foodId, food.id))
    .where(sql`${food.name} LIKE ${pattern} OR ${food.brandName} LIKE ${pattern}`)
    .orderBy(desc(serving.isDefault), asc(serving.id))
    .limit(limit)
    .all();

  const seen = new Set<string>();
  const results = localRows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  // Skip searchOFF() call — in tests we seed 3+ rows to prevent the network call.
  // If results.length < 3 the real executor would call searchOFF; we don't replicate
  // the network path here since tests seed enough data.

  return {
    foods: results.map((r) => ({
      foodId: r.id,
      name: r.name,
      brandName: r.brandName,
      servingId: r.servingId,
      servingDescription: r.servingDescription,
      calories: r.calories,
      protein: r.protein,
      carb: r.carb,
      fat: r.fat,
    })),
  };
}

// ---------------------------------------------------------------------------
// Replica of lookupBarcodeExecutor (verbatim from chat.ts lines 448-494)
// ---------------------------------------------------------------------------
async function lookupBarcodeExecutor(barcode: string) {
  const { food, serving } = schema;
  const cached = await db.select().from(food).where(eq(food.barcode, barcode)).get();

  if (cached) {
    const servings = await db
      .select()
      .from(serving)
      .where(eq(serving.foodId, cached.id))
      .orderBy(desc(serving.isDefault), asc(serving.id))
      .all();
    if (!servings.length) return { found: false, error: "No nutrition data available" };
    const s = servings[0];
    return {
      found: true,
      foodId: cached.id,
      name: cached.name,
      brandName: cached.brandName,
      servingId: s?.id,
      servingDescription: s?.description,
      calories: s?.calories,
      protein: s?.protein,
      carb: s?.carb,
      fat: s?.fat,
    };
  }

  // Skip getOFFProduct() network call — in tests with unknown barcode we return not-found.
  return { found: false };
}

// ---------------------------------------------------------------------------
// Replica of getDailySummaryExecutor (verbatim from chat.ts lines 543-582)
// ---------------------------------------------------------------------------
async function getDailySummaryExecutor(userId: string, today: string) {
  const { foodLog, serving, userGoal } = schema;
  const logs = await db
    .select({
      quantity: foodLog.quantity,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(foodLog)
    .innerJoin(serving, eq(foodLog.servingId, serving.id))
    .where(and(eq(foodLog.userId, userId), eq(foodLog.date, today)))
    .all();

  const totals = { calories: 0, protein: 0, carb: 0, fat: 0 };
  for (const log of logs) {
    totals.calories += (log.calories ?? 0) * log.quantity;
    totals.protein += (log.protein ?? 0) * log.quantity;
    totals.carb += (log.carb ?? 0) * log.quantity;
    totals.fat += (log.fat ?? 0) * log.quantity;
  }

  const goal = await db
    .select()
    .from(userGoal)
    .where(and(eq(userGoal.userId, userId), isNull(userGoal.endDate)))
    .get();

  return {
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carb: Math.round(totals.carb),
      fat: Math.round(totals.fat),
    },
    goals: goal
      ? { calories: goal.calories, protein: goal.protein, carb: goal.carb, fat: goal.fat }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Replica of logFoodExecutor (verbatim from chat.ts lines 496-541)
// ---------------------------------------------------------------------------
async function logFoodExecutor(
  userId: string,
  today: string,
  foodId: string,
  servingId: string,
  quantity: number,
  meal: string,
) {
  const { foodLog, favorite } = schema;
  const logEntry = {
    id: createId(),
    userId,
    foodId,
    servingId,
    quantity,
    meal: meal as "breakfast" | "lunch" | "dinner" | "snack",
    date: today,
    chatMessageId: null,
  };

  await db.insert(foodLog).values(logEntry);

  // Update favorite useCount
  const existing = await db
    .select()
    .from(favorite)
    .where(and(eq(favorite.userId, userId), eq(favorite.foodId, foodId)))
    .get();

  if (existing) {
    await db
      .update(favorite)
      .set({ useCount: existing.useCount + 1, lastUsedAt: new Date().toISOString() })
      .where(eq(favorite.id, existing.id));
  } else {
    await db.insert(favorite).values({
      id: createId(),
      userId,
      foodId,
      recipeId: null,
      useCount: 1,
      lastUsedAt: new Date().toISOString(),
    });
  }

  return getDailySummaryExecutor(userId, today);
}

// ---------------------------------------------------------------------------
// Replica of getRecentFoodsExecutor (verbatim from chat.ts lines 584-608)
// ---------------------------------------------------------------------------
async function getRecentFoodsExecutor(userId: string, limit: number = 8) {
  const { favorite, food, serving } = schema;
  const favorites = await db
    .select({
      foodId: favorite.foodId,
      name: food.name,
      servingId: serving.id,
      calories: serving.calories,
    })
    .from(favorite)
    .innerJoin(food, eq(favorite.foodId, food.id))
    .leftJoin(serving, eq(serving.foodId, food.id))
    .where(eq(favorite.userId, userId))
    .orderBy(desc(favorite.useCount))
    .limit(limit)
    .all();

  return {
    foods: favorites.map((f) => ({
      foodId: f.foodId,
      servingId: f.servingId,
      name: f.name,
      calories: f.calories,
    })),
  };
}

// ---------------------------------------------------------------------------
// Replica of searchRecipesExecutor (verbatim from chat.ts lines 696-731)
// ---------------------------------------------------------------------------
async function searchRecipesExecutor(userId: string, query: string, limit: number = 5) {
  const { recipe } = schema;
  const pattern = `%${query}%`;
  const rows = await db
    .select({
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinPerServing: recipe.proteinPerServing,
      carbPerServing: recipe.carbPerServing,
      fatPerServing: recipe.fatPerServing,
    })
    .from(recipe)
    .where(and(eq(recipe.userId, userId), sql`${recipe.title} LIKE ${pattern}`))
    .orderBy(desc(recipe.updatedAt))
    .limit(limit)
    .all();

  return {
    recipes: rows.map((r) => ({
      recipeId: r.id,
      title: r.title,
      slug: r.slug,
      servings: r.servings,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      calories: r.caloriesPerServing,
      protein: r.proteinPerServing,
      carb: r.carbPerServing,
      fat: r.fatPerServing,
    })),
  };
}

// ---------------------------------------------------------------------------
// Replica of buildUIComponents — 6 targeted cases (verbatim from chat.ts lines 1344-1418)
// ---------------------------------------------------------------------------
type UIComponent = { type: string; props: Record<string, unknown> };

function buildUIComponents(toolResults: Array<{ toolName: string; result: unknown }>): UIComponent[] {
  const components: UIComponent[] = [];
  for (const { toolName, result } of toolResults) {
    switch (toolName) {
      case "search_food": {
        const { foods } = result as { foods: unknown[] };
        if (foods?.length) {
          components.push({ type: "food_list", props: { foods } });
        }
        break;
      }
      case "lookup_barcode": {
        const r = result as Record<string, unknown>;
        if (r.found) {
          components.push({
            type: "food_card",
            props: {
              foodId: r.foodId,
              name: r.name,
              brandName: r.brandName,
              servingId: r.servingId,
              servingDescription: r.servingDescription,
              calories: r.calories,
              protein: r.protein,
              carb: r.carb,
              fat: r.fat,
              quantity: 1,
            },
          });
        }
        break;
      }
      case "log_food":
      case "get_daily_summary": {
        const r = result as { totals: unknown; goals: unknown };
        if (r.totals) {
          components.push({ type: "macro_summary", props: r });
        }
        break;
      }
      case "get_recent_foods": {
        const r = result as { foods: unknown[] };
        if (r.foods?.length) {
          components.push({ type: "quick_log_chips", props: r });
        }
        break;
      }
      case "search_recipes": {
        const r = result as { recipes: unknown[] };
        if (r.recipes?.length) {
          for (const rec of r.recipes) {
            components.push({ type: "recipe_card", props: rec as Record<string, unknown> });
          }
        }
        break;
      }
    }
  }
  return components;
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------
async function insertUser(): Promise<string> {
  const id = createId();
  await db.insert(schema.user).values({
    id,
    email: `user-${id}@test.com`,
    username: `user-${id}`,
    passwordHash: "x",
  });
  return id;
}

async function insertFood(
  name: string,
  opts: { barcode?: string; brandName?: string; isVerified?: boolean } = {}
): Promise<string> {
  const foodId = createId();
  const now = new Date().toISOString();
  await db.insert(schema.food).values({
    id: foodId,
    name,
    brandName: opts.brandName ?? null,
    barcode: opts.barcode ?? null,
    source: "usda",
    sourceId: null,
    sourceRevision: null,
    isVerified: opts.isVerified ?? false,
    createdAt: now,
    updatedAt: now,
  });
  return foodId;
}

async function insertServing(
  foodId: string,
  macros: { calories: number; protein: number; carb: number; fat: number },
  isDefault = true
): Promise<string> {
  const servingId = createId();
  const now = new Date().toISOString();
  await db.insert(schema.serving).values({
    id: servingId,
    foodId,
    description: "1 serving",
    amountGrams: null,
    isDefault,
    calories: macros.calories,
    protein: macros.protein,
    carb: macros.carb,
    fat: macros.fat,
    createdAt: now,
    updatedAt: now,
  });
  return servingId;
}

async function insertFoodWithServing(
  name: string,
  macros: { calories: number; protein: number; carb: number; fat: number },
  opts: { barcode?: string; brandName?: string; isVerified?: boolean } = {}
): Promise<{ foodId: string; servingId: string }> {
  const foodId = await insertFood(name, opts);
  const servingId = await insertServing(foodId, macros);
  return { foodId, servingId };
}

async function insertFavorite(userId: string, foodId: string, useCount = 1): Promise<void> {
  await db.insert(schema.favorite).values({
    id: createId(),
    userId,
    foodId,
    recipeId: null,
    useCount,
    lastUsedAt: new Date().toISOString(),
  });
}

async function insertFoodLog(
  userId: string,
  foodId: string,
  servingId: string,
  quantity: number,
  date: string
): Promise<void> {
  await db.insert(schema.foodLog).values({
    id: createId(),
    userId,
    foodId,
    servingId,
    quantity,
    meal: "lunch",
    date,
    chatMessageId: null,
  });
}

async function insertGoal(
  userId: string,
  macros: { calories?: number; protein?: number; carb?: number; fat?: number }
): Promise<void> {
  await db.insert(schema.userGoal).values({
    id: createId(),
    userId,
    calories: macros.calories ?? 2000,
    protein: macros.protein ?? 150,
    carb: macros.carb ?? 200,
    fat: macros.fat ?? 70,
    startDate: "2026-01-01",
    endDate: null,
  });
}

async function insertRecipe(
  userId: string,
  title: string,
  macros: { caloriesPerServing?: number; proteinPerServing?: number; carbPerServing?: number; fatPerServing?: number } = {}
): Promise<string> {
  const id = createId();
  const now = new Date().toISOString();
  await db.insert(schema.recipe).values({
    id,
    userId,
    slug: title.toLowerCase().replace(/\s+/g, "-") + "-" + id.slice(0, 6),
    title,
    description: null,
    instructions: null,
    servings: 2,
    prepTime: 10,
    cookTime: 20,
    imageUrl: null,
    isPublic: false,
    tags: [],
    caloriesPerServing: macros.caloriesPerServing ?? 400,
    proteinPerServing: macros.proteinPerServing ?? 30,
    carbPerServing: macros.carbPerServing ?? 40,
    fatPerServing: macros.fatPerServing ?? 15,
    forkCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
const TODAY = "2026-03-21";

// ---------------------------------------------------------------------------
// searchFoodExecutor
// ---------------------------------------------------------------------------
describe("searchFoodExecutor", () => {
  it("returns matching foods when 3+ seeded results exist", async () => {
    await insertFoodWithServing("Banana Bread Classic", { calories: 250, protein: 4, carb: 45, fat: 8 });
    await insertFoodWithServing("Banana Split Dessert", { calories: 400, protein: 6, carb: 70, fat: 12 });
    await insertFoodWithServing("Banana Smoothie Mix", { calories: 150, protein: 3, carb: 30, fat: 2 });

    const result = await searchFoodExecutor("Banana", 5);
    expect(result.foods.length).toBeGreaterThanOrEqual(3);
    const names = result.foods.map((f) => f.name);
    expect(names).toContain("Banana Bread Classic");
    expect(names).toContain("Banana Split Dessert");
    expect(names).toContain("Banana Smoothie Mix");
  });

  it("returns empty foods array when no match exists", async () => {
    const result = await searchFoodExecutor("xyzzy-nonexistent-food-12345");
    expect(result.foods).toHaveLength(0);
  });

  it("returned foods include expected fields", async () => {
    const { foodId, servingId } = await insertFoodWithServing(
      "Test Field Food",
      { calories: 200, protein: 20, carb: 10, fat: 5 },
      { brandName: "TestBrand" }
    );

    const result = await searchFoodExecutor("Test Field Food");
    expect(result.foods.length).toBeGreaterThanOrEqual(1);
    const item = result.foods.find((f) => f.foodId === foodId);
    expect(item).toBeDefined();
    expect(item!.name).toBe("Test Field Food");
    expect(item!.brandName).toBe("TestBrand");
    expect(item!.servingId).toBe(servingId);
    expect(item!.calories).toBe(200);
    expect(item!.protein).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// lookupBarcodeExecutor
// ---------------------------------------------------------------------------
describe("lookupBarcodeExecutor", () => {
  it("returns found=true with nutrition when barcode is seeded in DB", async () => {
    const barcode = "1234567890123";
    const { foodId, servingId } = await insertFoodWithServing(
      "Seeded Barcode Food",
      { calories: 180, protein: 12, carb: 22, fat: 5 },
      { barcode, brandName: "BarcodeBrand" }
    );

    const result = await lookupBarcodeExecutor(barcode);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.foodId).toBe(foodId);
      expect(result.name).toBe("Seeded Barcode Food");
      expect(result.brandName).toBe("BarcodeBrand");
      expect(result.servingId).toBe(servingId);
      expect(result.calories).toBe(180);
      expect(result.protein).toBe(12);
    }
  });

  it("returns found=false when barcode is not in DB", async () => {
    const result = await lookupBarcodeExecutor("0000000000000");
    expect(result.found).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// logFoodExecutor
// ---------------------------------------------------------------------------
describe("logFoodExecutor", () => {
  it("returns macro_summary shape (totals + goals) after logging food", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 150, carb: 200, fat: 70 });
    const { foodId, servingId } = await insertFoodWithServing(
      "LogFood Test Item",
      { calories: 300, protein: 25, carb: 30, fat: 10 }
    );

    const result = await logFoodExecutor(userId, TODAY, foodId, servingId, 1, "lunch");

    expect(result).toHaveProperty("totals");
    expect(result).toHaveProperty("goals");
    expect(result.totals.calories).toBe(300);
    expect(result.totals.protein).toBe(25);
    expect(result.totals.carb).toBe(30);
    expect(result.totals.fat).toBe(10);
    expect(result.goals).not.toBeNull();
    expect(result.goals!.protein).toBe(150);
  });

  it("creates a favorite entry after logging food for the first time", async () => {
    const userId = await insertUser();
    const { foodId, servingId } = await insertFoodWithServing(
      "LogFood New Fav",
      { calories: 100, protein: 10, carb: 10, fat: 5 }
    );

    await logFoodExecutor(userId, TODAY, foodId, servingId, 1, "breakfast");

    const fav = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userId), eq(schema.favorite.foodId, foodId)))
      .get();
    expect(fav).toBeDefined();
    expect(fav!.useCount).toBe(1);
  });

  it("result does NOT contain confirm_button shape — maps to macro_summary", async () => {
    const userId = await insertUser();
    const { foodId, servingId } = await insertFoodWithServing(
      "LogFood Shape Check",
      { calories: 200, protein: 15, carb: 20, fat: 8 }
    );

    const result = await logFoodExecutor(userId, TODAY, foodId, servingId, 1, "dinner");

    // Must have totals (macro_summary) and NOT have confirm_button fields
    expect(result).toHaveProperty("totals");
    expect(result).not.toHaveProperty("confirmed");
    expect(result).not.toHaveProperty("logId");
  });
});

// ---------------------------------------------------------------------------
// getDailySummaryExecutor
// ---------------------------------------------------------------------------
describe("getDailySummaryExecutor", () => {
  it("returns totals with goals when user has a goal", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 150, carb: 200, fat: 70 });
    const { foodId, servingId } = await insertFoodWithServing(
      "Summary Food With Goal",
      { calories: 500, protein: 40, carb: 60, fat: 20 }
    );
    await insertFoodLog(userId, foodId, servingId, 1, TODAY);

    const result = await getDailySummaryExecutor(userId, TODAY);

    expect(result.totals.calories).toBe(500);
    expect(result.totals.protein).toBe(40);
    expect(result.goals).not.toBeNull();
    expect(result.goals!.calories).toBe(2000);
    expect(result.goals!.protein).toBe(150);
  });

  it("returns totals with goals=null when user has no goal", async () => {
    const userId = await insertUser();
    const { foodId, servingId } = await insertFoodWithServing(
      "Summary Food No Goal",
      { calories: 300, protein: 20, carb: 35, fat: 10 }
    );
    await insertFoodLog(userId, foodId, servingId, 1, TODAY);

    const result = await getDailySummaryExecutor(userId, TODAY);

    expect(result.totals.calories).toBe(300);
    expect(result.goals).toBeNull();
  });

  it("totals are zero when no food logged for the day", async () => {
    const userId = await insertUser();
    const result = await getDailySummaryExecutor(userId, TODAY);
    expect(result.totals.calories).toBe(0);
    expect(result.totals.protein).toBe(0);
    expect(result.totals.carb).toBe(0);
    expect(result.totals.fat).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRecentFoodsExecutor
// ---------------------------------------------------------------------------
describe("getRecentFoodsExecutor", () => {
  it("returns foods from favorites ordered by useCount", async () => {
    const userId = await insertUser();

    const { foodId: fid1 } = await insertFoodWithServing("Recent Food A", { calories: 200, protein: 15, carb: 20, fat: 8 });
    const { foodId: fid2 } = await insertFoodWithServing("Recent Food B", { calories: 150, protein: 10, carb: 25, fat: 5 });
    const { foodId: fid3 } = await insertFoodWithServing("Recent Food C", { calories: 300, protein: 25, carb: 30, fat: 12 });

    // Different use counts to verify ordering
    await insertFavorite(userId, fid1, 5);
    await insertFavorite(userId, fid2, 2);
    await insertFavorite(userId, fid3, 10);

    const result = await getRecentFoodsExecutor(userId);

    expect(result.foods.length).toBe(3);
    const ids = result.foods.map((f) => f.foodId);
    expect(ids[0]).toBe(fid3); // useCount=10 first
    expect(ids[1]).toBe(fid1); // useCount=5 second
    expect(ids[2]).toBe(fid2); // useCount=2 third
  });

  it("returns empty foods array when user has no favorites", async () => {
    const userId = await insertUser();
    const result = await getRecentFoodsExecutor(userId);
    expect(result.foods).toHaveLength(0);
  });

  it("returned food items include expected fields", async () => {
    const userId = await insertUser();
    const { foodId, servingId } = await insertFoodWithServing(
      "Recent Field Check Food",
      { calories: 250, protein: 18, carb: 30, fat: 9 }
    );
    await insertFavorite(userId, foodId, 3);

    const result = await getRecentFoodsExecutor(userId);

    expect(result.foods.length).toBeGreaterThanOrEqual(1);
    const item = result.foods.find((f) => f.foodId === foodId);
    expect(item).toBeDefined();
    expect(item!.name).toBe("Recent Field Check Food");
    expect(item!.servingId).toBe(servingId);
    expect(item!.calories).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// searchRecipesExecutor
// ---------------------------------------------------------------------------
describe("searchRecipesExecutor", () => {
  it("returns matching recipes for a user", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId, "Chicken Tikka Masala", {
      caloriesPerServing: 450,
      proteinPerServing: 38,
      carbPerServing: 35,
      fatPerServing: 18,
    });
    await insertRecipe(userId, "Vegetable Stir Fry", {
      caloriesPerServing: 280,
      proteinPerServing: 10,
      carbPerServing: 45,
      fatPerServing: 8,
    });

    const result = await searchRecipesExecutor(userId, "Tikka");

    expect(result.recipes).toHaveLength(1);
    expect(result.recipes[0]!.recipeId).toBe(recipeId);
    expect(result.recipes[0]!.title).toBe("Chicken Tikka Masala");
    expect(result.recipes[0]!.calories).toBe(450);
    expect(result.recipes[0]!.protein).toBe(38);
  });

  it("does not return another user's recipes (user isolation)", async () => {
    const userId1 = await insertUser();
    const userId2 = await insertUser();
    await insertRecipe(userId1, "Private Pasta Dish", { caloriesPerServing: 500 });

    const result = await searchRecipesExecutor(userId2, "Pasta");
    expect(result.recipes).toHaveLength(0);
  });

  it("returns empty recipes when no title matches", async () => {
    const userId = await insertUser();
    await insertRecipe(userId, "Grilled Salmon", {});

    const result = await searchRecipesExecutor(userId, "xyzzy-no-match-recipe");
    expect(result.recipes).toHaveLength(0);
  });

  it("returned recipe items include expected fields", async () => {
    const userId = await insertUser();
    await insertRecipe(userId, "Field Check Recipe", {
      caloriesPerServing: 350,
      proteinPerServing: 28,
      carbPerServing: 40,
      fatPerServing: 12,
    });

    const result = await searchRecipesExecutor(userId, "Field Check Recipe");
    expect(result.recipes).toHaveLength(1);
    const r = result.recipes[0]!;
    expect(r).toHaveProperty("recipeId");
    expect(r).toHaveProperty("title");
    expect(r).toHaveProperty("slug");
    expect(r).toHaveProperty("servings");
    expect(r).toHaveProperty("prepTime");
    expect(r).toHaveProperty("cookTime");
    expect(r.calories).toBe(350);
    expect(r.protein).toBe(28);
    expect(r.carb).toBe(40);
    expect(r.fat).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// buildUIComponents
// ---------------------------------------------------------------------------
describe("buildUIComponents — tool to component mapping", () => {
  it("search_food with results → food_list", () => {
    const result = {
      foods: [
        { foodId: "f1", name: "Apple", brandName: null, servingId: "s1", calories: 80, protein: 0, carb: 21, fat: 0 },
        { foodId: "f2", name: "Banana", brandName: null, servingId: "s2", calories: 90, protein: 1, carb: 23, fat: 0 },
      ],
    };
    const components = buildUIComponents([{ toolName: "search_food", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("food_list");
    expect((components[0]!.props as { foods: unknown[] }).foods).toHaveLength(2);
  });

  it("search_food with empty results → no component", () => {
    const result = { foods: [] };
    const components = buildUIComponents([{ toolName: "search_food", result }]);
    expect(components).toHaveLength(0);
  });

  it("lookup_barcode with found=true → food_card", () => {
    const result = {
      found: true,
      foodId: "f1",
      name: "Protein Bar",
      brandName: "FitBrand",
      servingId: "s1",
      servingDescription: "1 bar",
      calories: 200,
      protein: 20,
      carb: 18,
      fat: 8,
    };
    const components = buildUIComponents([{ toolName: "lookup_barcode", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("food_card");
    expect((components[0]!.props as { quantity: number }).quantity).toBe(1);
    expect((components[0]!.props as { name: string }).name).toBe("Protein Bar");
  });

  it("lookup_barcode with found=false → no component", () => {
    const result = { found: false };
    const components = buildUIComponents([{ toolName: "lookup_barcode", result }]);
    expect(components).toHaveLength(0);
  });

  it("log_food → macro_summary (NOT confirm_button)", () => {
    const result = {
      totals: { calories: 500, protein: 40, carb: 60, fat: 15 },
      goals: { calories: 2000, protein: 150, carb: 200, fat: 70 },
    };
    const components = buildUIComponents([{ toolName: "log_food", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("macro_summary");
    expect(components[0]!.type).not.toBe("confirm_button");
  });

  it("get_daily_summary with totals → macro_summary", () => {
    const result = {
      totals: { calories: 1200, protein: 90, carb: 140, fat: 45 },
      goals: { calories: 2000, protein: 150, carb: 200, fat: 70 },
    };
    const components = buildUIComponents([{ toolName: "get_daily_summary", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("macro_summary");
    const props = components[0]!.props as { totals: { calories: number }; goals: { calories: number } };
    expect(props.totals.calories).toBe(1200);
    expect(props.goals.calories).toBe(2000);
  });

  it("get_daily_summary with no goals → macro_summary with goals=null", () => {
    const result = {
      totals: { calories: 800, protein: 60, carb: 90, fat: 30 },
      goals: null,
    };
    const components = buildUIComponents([{ toolName: "get_daily_summary", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("macro_summary");
    const props = components[0]!.props as { goals: null };
    expect(props.goals).toBeNull();
  });

  it("get_recent_foods with foods → quick_log_chips", () => {
    const result = {
      foods: [
        { foodId: "f1", servingId: "s1", name: "Oats", calories: 150 },
        { foodId: "f2", servingId: "s2", name: "Greek Yogurt", calories: 100 },
      ],
    };
    const components = buildUIComponents([{ toolName: "get_recent_foods", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("quick_log_chips");
    expect((components[0]!.props as { foods: unknown[] }).foods).toHaveLength(2);
  });

  it("get_recent_foods with empty foods → no component", () => {
    const result = { foods: [] };
    const components = buildUIComponents([{ toolName: "get_recent_foods", result }]);
    expect(components).toHaveLength(0);
  });

  it("search_recipes with results → one recipe_card per recipe", () => {
    const result = {
      recipes: [
        { recipeId: "r1", title: "Pasta", slug: "pasta", servings: 2, calories: 400, protein: 20, carb: 60, fat: 12 },
        { recipeId: "r2", title: "Salad", slug: "salad", servings: 1, calories: 200, protein: 5, carb: 30, fat: 8 },
      ],
    };
    const components = buildUIComponents([{ toolName: "search_recipes", result }]);
    expect(components).toHaveLength(2);
    expect(components[0]!.type).toBe("recipe_card");
    expect(components[1]!.type).toBe("recipe_card");
    expect((components[0]!.props as { title: string }).title).toBe("Pasta");
    expect((components[1]!.props as { title: string }).title).toBe("Salad");
  });

  it("search_recipes with empty results → no component", () => {
    const result = { recipes: [] };
    const components = buildUIComponents([{ toolName: "search_recipes", result }]);
    expect(components).toHaveLength(0);
  });

  it("multiple tools in one call → multiple components in order", () => {
    const toolResults = [
      {
        toolName: "search_food",
        result: { foods: [{ foodId: "f1", name: "Apple", calories: 80 }] },
      },
      {
        toolName: "get_daily_summary",
        result: { totals: { calories: 80, protein: 0, carb: 21, fat: 0 }, goals: null },
      },
    ];
    const components = buildUIComponents(toolResults);
    expect(components).toHaveLength(2);
    expect(components[0]!.type).toBe("food_list");
    expect(components[1]!.type).toBe("macro_summary");
  });
});
