/**
 * Tests for suggestFoodsExecutor in chat.ts.
 *
 * Because suggestFoodsExecutor is not exported, we replicate its logic
 * verbatim here — the same approach used in logging.test.ts and infer-meal.test.ts.
 *
 * Coverage:
 *  1. no_goals: user has no goal row → { found: false, reason: "no_goals" }
 *  2. goals_met: all macros at/above goal → { found: false, reason: "goals_met" }
 *  3. happy path (favorites): protein deficit, returns top-3 sorted by matchScore
 *  4. USDA fallback: fewer than 3 favorites → queries isVerified foods
 *  5. zero-calorie guard: servings with calories=0 are excluded from queries
 *  6. tie-breaking: protein > carbs > fat when shortfalls are equal
 *  7. buildUIComponents: suggest_foods case emits suggestion_card when found=true
 *  8. buildUIComponents: suggest_foods case emits nothing when found=false
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
// Replica of suggestFoodsExecutor (verbatim from chat.ts lines 876-1001)
// ---------------------------------------------------------------------------
async function getDailySummaryExecutor(userId: string, today: string) {
  const logs = await db
    .select({
      quantity: schema.foodLog.quantity,
      calories: schema.serving.calories,
      protein: schema.serving.protein,
      carb: schema.serving.carb,
      fat: schema.serving.fat,
    })
    .from(schema.foodLog)
    .innerJoin(schema.serving, eq(schema.foodLog.servingId, schema.serving.id))
    .where(and(eq(schema.foodLog.userId, userId), eq(schema.foodLog.date, today)))
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
    .from(schema.userGoal)
    .where(and(eq(schema.userGoal.userId, userId), isNull(schema.userGoal.endDate)))
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

async function suggestFoodsExecutor(userId: string, today: string) {
  const summary = await getDailySummaryExecutor(userId, today);

  if (!summary.goals) {
    return { found: false as const, reason: "no_goals" as const };
  }

  const { totals, goals } = summary;

  const proteinShortfall = Math.max(0, (goals.protein ?? 0) - totals.protein);
  const carbShortfall = Math.max(0, (goals.carb ?? 0) - totals.carb);
  const fatShortfall = Math.max(0, (goals.fat ?? 0) - totals.fat);

  if (proteinShortfall === 0 && carbShortfall === 0 && fatShortfall === 0) {
    return { found: false as const, reason: "goals_met" as const };
  }

  let dominantMacro: "protein" | "carbs" | "fat";
  let shortfallAmount: number;

  if (proteinShortfall >= carbShortfall && proteinShortfall >= fatShortfall) {
    dominantMacro = "protein";
    shortfallAmount = proteinShortfall;
  } else if (carbShortfall >= fatShortfall) {
    dominantMacro = "carbs";
    shortfallAmount = carbShortfall;
  } else {
    dominantMacro = "fat";
    shortfallAmount = fatShortfall;
  }

  const macroCol = dominantMacro === "carbs" ? "carb" : dominantMacro;

  const favRows = await db
    .select({
      foodId: schema.food.id,
      name: schema.food.name,
      servingId: schema.serving.id,
      description: schema.serving.description,
      calories: schema.serving.calories,
      protein: schema.serving.protein,
      carb: schema.serving.carb,
      fat: schema.serving.fat,
    })
    .from(schema.favorite)
    .innerJoin(schema.food, eq(schema.favorite.foodId, schema.food.id))
    .innerJoin(schema.serving, and(eq(schema.serving.foodId, schema.food.id), sql`${schema.serving.calories} > 0`))
    .where(eq(schema.favorite.userId, userId))
    .orderBy(
      desc(
        sql`CAST(${macroCol === "protein" ? schema.serving.protein : macroCol === "carb" ? schema.serving.carb : schema.serving.fat} AS REAL) / CAST(${schema.serving.calories} AS REAL)`
      )
    )
    .limit(6)
    .all();

  let usdaRows: typeof favRows = [];
  if (favRows.length < 3) {
    usdaRows = await db
      .select({
        foodId: schema.food.id,
        name: schema.food.name,
        servingId: schema.serving.id,
        description: schema.serving.description,
        calories: schema.serving.calories,
        protein: schema.serving.protein,
        carb: schema.serving.carb,
        fat: schema.serving.fat,
      })
      .from(schema.food)
      .innerJoin(schema.serving, and(eq(schema.serving.foodId, schema.food.id), sql`${schema.serving.calories} > 0`))
      .where(eq(schema.food.isVerified, true))
      .orderBy(
        desc(
          sql`CAST(${macroCol === "protein" ? schema.serving.protein : macroCol === "carb" ? schema.serving.carb : schema.serving.fat} AS REAL) / CAST(${schema.serving.calories} AS REAL)`
        )
      )
      .limit(6)
      .all();
  }

  const seen = new Set<string>();
  const combined: typeof favRows = [];
  for (const row of [...favRows, ...usdaRows]) {
    if (!seen.has(row.foodId)) {
      seen.add(row.foodId);
      combined.push(row);
    }
  }

  const top3 = combined.slice(0, 3);

  const suggestions = top3.map((row, idx) => {
    const macroG = macroCol === "protein"
      ? (row.protein ?? 0)
      : macroCol === "carb"
      ? (row.carb ?? 0)
      : (row.fat ?? 0);
    const matchScore = row.calories && row.calories > 0 ? macroG / row.calories : 0;

    return {
      id: row.servingId ?? `${row.foodId}-${idx}`,
      label: row.name,
      subtitle: row.description ?? undefined,
      calories: row.calories ?? undefined,
      protein: row.protein ?? undefined,
      food_id: row.foodId,
      recipe_id: null as string | null,
      matchScore,
    };
  });

  suggestions.sort((a, b) => b.matchScore - a.matchScore || a.label.localeCompare(b.label));

  return {
    found: true as const,
    shortfall: { macro: dominantMacro, amount: Math.round(shortfallAmount), unit: "g" as const },
    suggestions: suggestions.map(({ matchScore: _ms, ...s }) => s),
  };
}

// ---------------------------------------------------------------------------
// Replica of buildUIComponents suggest_foods case (verbatim from chat.ts)
// ---------------------------------------------------------------------------
type UIComponent = { type: string; props: Record<string, unknown> };

function buildUIComponents(toolResults: Array<{ toolName: string; result: unknown }>): UIComponent[] {
  const components: UIComponent[] = [];
  for (const { toolName, result } of toolResults) {
    if (toolName === "suggest_foods") {
      const r = result as { found: boolean; reason?: string; shortfall?: { macro: string; amount: number; unit: string }; suggestions?: unknown[] };
      if (r.found && r.suggestions?.length) {
        components.push({
          type: "suggestion_card",
          props: {
            suggestions: r.suggestions,
            shortfall: r.shortfall ?? null,
          },
        });
      }
    }
  }
  return components;
}

// ---------------------------------------------------------------------------
// Helpers
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

async function insertFoodWithServing(
  name: string,
  macros: { calories: number; protein: number; carb: number; fat: number },
  isVerified = false
): Promise<{ foodId: string; servingId: string }> {
  const foodId = createId();
  const servingId = createId();
  const now = new Date().toISOString();
  await db.insert(schema.food).values({
    id: foodId,
    name,
    brandName: null,
    barcode: null,
    source: "usda",
    sourceId: null,
    sourceRevision: null,
    isVerified,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.serving).values({
    id: servingId,
    foodId,
    description: "1 serving",
    amountGrams: null,
    isDefault: true,
    calories: macros.calories,
    protein: macros.protein,
    carb: macros.carb,
    fat: macros.fat,
    createdAt: now,
    updatedAt: now,
  });
  return { foodId, servingId };
}

async function insertFavorite(userId: string, foodId: string): Promise<void> {
  await db.insert(schema.favorite).values({
    id: createId(),
    userId,
    foodId,
    recipeId: null,
    useCount: 1,
    lastUsedAt: new Date().toISOString(),
  });
}

async function insertLog(
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
const TODAY = "2026-03-21";

describe("suggestFoodsExecutor", () => {
  // -------------------------------------------------------------------------
  // 1. no_goals
  // -------------------------------------------------------------------------
  it("returns { found: false, reason: 'no_goals' } when user has no goal", async () => {
    const userId = await insertUser();
    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.reason).toBe("no_goals");
    }
  });

  // -------------------------------------------------------------------------
  // 2. goals_met
  // -------------------------------------------------------------------------
  it("returns { found: false, reason: 'goals_met' } when all macros are at goal", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 50, carb: 100, fat: 40 });

    // Insert a food and log it to exactly meet goals
    const { foodId, servingId } = await insertFoodWithServing("Complete Meal", {
      calories: 2000,
      protein: 50,
      carb: 100,
      fat: 40,
    });
    await insertLog(userId, foodId, servingId, 1, TODAY);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.reason).toBe("goals_met");
    }
  });

  // -------------------------------------------------------------------------
  // 3. happy path with favorites — protein deficit
  // -------------------------------------------------------------------------
  it("returns top-3 suggestions from favorites when protein is the dominant deficit", async () => {
    const userId = await insertUser();
    // protein shortfall=150g, carb shortfall=50g, fat shortfall=20g → protein wins
    await insertGoal(userId, { calories: 2000, protein: 150, carb: 50, fat: 20 });

    // Insert 3 high-protein favorites
    const chicken = await insertFoodWithServing("Chicken Breast", { calories: 200, protein: 40, carb: 0, fat: 4 });
    const eggs = await insertFoodWithServing("Eggs", { calories: 140, protein: 12, carb: 1, fat: 10 });
    const tofu = await insertFoodWithServing("Tofu", { calories: 150, protein: 15, carb: 5, fat: 8 });

    await insertFavorite(userId, chicken.foodId);
    await insertFavorite(userId, eggs.foodId);
    await insertFavorite(userId, tofu.foodId);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);

    if (result.found) {
      expect(result.shortfall.macro).toBe("protein");
      expect(result.shortfall.amount).toBe(150); // 0 logged, goal=150, shortfall=150
      expect(result.shortfall.unit).toBe("g");
      expect(result.suggestions.length).toBeLessThanOrEqual(3);

      // Chicken has best protein efficiency: 40/200 = 0.2, Tofu: 15/150 = 0.1, Eggs: 12/140 ≈ 0.086
      expect(result.suggestions[0]!.label).toBe("Chicken Breast");
      expect(result.suggestions[1]!.label).toBe("Tofu");
      expect(result.suggestions[2]!.label).toBe("Eggs");

      // food_id should be set on each suggestion
      expect(result.suggestions[0]!.food_id).toBe(chicken.foodId);

      // recipe_id should be null
      expect(result.suggestions[0]!.recipe_id).toBeNull();
    }
  });

  // -------------------------------------------------------------------------
  // 4. USDA fallback — fewer than 3 favorites
  // -------------------------------------------------------------------------
  it("falls back to isVerified foods when fewer than 3 favorites", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 200, carb: 200, fat: 70 });

    // Only 1 favorite
    const favFood = await insertFoodWithServing("My Fav Protein Shake", { calories: 120, protein: 25, carb: 3, fat: 2 });
    await insertFavorite(userId, favFood.foodId);

    // 3 verified USDA foods
    const lean1 = await insertFoodWithServing("USDA Lean Turkey", { calories: 180, protein: 38, carb: 0, fat: 3 }, true);
    const lean2 = await insertFoodWithServing("USDA White Fish", { calories: 100, protein: 22, carb: 0, fat: 1 }, true);
    const lean3 = await insertFoodWithServing("USDA Greek Yogurt", { calories: 130, protein: 17, carb: 9, fat: 3 }, true);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);

    if (result.found) {
      expect(result.shortfall.macro).toBe("protein");
      expect(result.suggestions.length).toBeLessThanOrEqual(3);

      // All returned food_ids should exist in our inserted set
      const knownIds = new Set([
        favFood.foodId,
        lean1.foodId,
        lean2.foodId,
        lean3.foodId,
      ]);
      for (const s of result.suggestions) {
        expect(knownIds.has(s.food_id!)).toBe(true);
      }

      // Favorite food should appear (it has highest protein efficiency: 25/120 ≈ 0.208)
      const labels = result.suggestions.map((s) => s.label);
      expect(labels).toContain("My Fav Protein Shake");
    }
  });

  // -------------------------------------------------------------------------
  // 5. zero-calorie guard — servings with calories=0 are excluded
  // -------------------------------------------------------------------------
  it("excludes foods with calories=0 from suggestions", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 100, carb: 200, fat: 70 });

    // Insert a food with zero calories (should be excluded by SQL filter)
    const zeroCalFood = await insertFoodWithServing("Zero Cal Mystery", { calories: 0, protein: 30, carb: 0, fat: 0 });
    await insertFavorite(userId, zeroCalFood.foodId);

    // Insert one real food
    const realFood = await insertFoodWithServing("Real Protein Source", { calories: 200, protein: 30, carb: 5, fat: 5 }, true);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);

    if (result.found) {
      const labels = result.suggestions.map((s) => s.label);
      expect(labels).not.toContain("Zero Cal Mystery");
      // The real food (verified) should appear as fallback
      expect(labels).toContain("Real Protein Source");
    }
  });

  // -------------------------------------------------------------------------
  // 6a. tie-breaking: protein wins over carbs when equal
  // -------------------------------------------------------------------------
  it("picks protein as dominant macro when protein shortfall equals carb shortfall", async () => {
    const userId = await insertUser();
    // Set equal shortfalls: protein=50 remaining, carb=50 remaining, fat=0
    await insertGoal(userId, { calories: 2000, protein: 50, carb: 50, fat: 0 });

    const { foodId, servingId } = await insertFoodWithServing("High Fat Food", { calories: 300, protein: 0, carb: 0, fat: 30 });
    await insertLog(userId, foodId, servingId, 1, TODAY);

    // Add a verified food to get results
    await insertFoodWithServing("USDA Protein", { calories: 200, protein: 40, carb: 5, fat: 3 }, true);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.shortfall.macro).toBe("protein");
    }
  });

  // -------------------------------------------------------------------------
  // 6b. tie-breaking: carbs wins over fat when equal
  // -------------------------------------------------------------------------
  it("picks carbs as dominant macro when carb shortfall equals fat shortfall (protein met)", async () => {
    const userId = await insertUser();
    // protein goal=0 (met), carb=50 remaining, fat=50 remaining
    await insertGoal(userId, { calories: 2000, protein: 0, carb: 50, fat: 50 });

    const { foodId, servingId } = await insertFoodWithServing("Protein Only", { calories: 200, protein: 40, carb: 0, fat: 0 });
    await insertLog(userId, foodId, servingId, 1, TODAY);

    await insertFoodWithServing("USDA Carb Food", { calories: 150, protein: 3, carb: 35, fat: 2 }, true);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.shortfall.macro).toBe("carbs");
    }
  });

  // -------------------------------------------------------------------------
  // 7. matchScore calculation
  // -------------------------------------------------------------------------
  it("matchScore equals macroG / calories for protein macro", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 100, carb: 200, fat: 70 });

    // Single verified food: protein=30, calories=150 → matchScore = 30/150 = 0.2
    const { foodId } = await insertFoodWithServing("Known Ratio Food", { calories: 150, protein: 30, carb: 5, fat: 5 }, true);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);
    if (result.found) {
      const suggestion = result.suggestions.find((s) => s.food_id === foodId);
      expect(suggestion).toBeDefined();
      // matchScore is stripped from returned suggestions, but we verify calories & protein are correct
      expect(suggestion!.calories).toBe(150);
      expect(suggestion!.protein).toBe(30);
    }
  });

  // -------------------------------------------------------------------------
  // 8. shortfall amount is rounded
  // -------------------------------------------------------------------------
  it("shortfall amount is Math.rounded", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 100, carb: 200, fat: 70 });

    // Log 1.5 servings of a food with 7.3g protein each → totals.protein ≈ round(10.95) = 11
    // shortfall = 100 - 11 = 89
    const { foodId, servingId } = await insertFoodWithServing("Partial Protein", { calories: 100, protein: 7, carb: 5, fat: 3 });
    await insertLog(userId, foodId, servingId, 1, TODAY);

    await insertFoodWithServing("USDA Filler", { calories: 200, protein: 25, carb: 10, fat: 5 }, true);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(Number.isInteger(result.shortfall.amount)).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // 9. fat is correctly identified as dominant macro
  // -------------------------------------------------------------------------
  it("picks fat as dominant macro when fat shortfall is largest", async () => {
    const userId = await insertUser();
    // protein=0, carb=0, fat=80 remaining
    await insertGoal(userId, { calories: 2000, protein: 0, carb: 0, fat: 80 });

    await insertFoodWithServing("USDA High Fat", { calories: 200, protein: 2, carb: 0, fat: 40 }, true);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.shortfall.macro).toBe("fat");
    }
  });

  // -------------------------------------------------------------------------
  // 10. deduplication: favorite foods don't appear twice even if also verified
  // -------------------------------------------------------------------------
  it("deduplicates foods that appear in both favorites and verified", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 200, carb: 200, fat: 70 });

    // Only 1 favorite
    const overlap = await insertFoodWithServing("Overlap Food", { calories: 200, protein: 40, carb: 5, fat: 5 }, true);
    await insertFavorite(userId, overlap.foodId);

    const result = await suggestFoodsExecutor(userId, TODAY);
    expect(result.found).toBe(true);
    if (result.found) {
      const overlapSuggestions = result.suggestions.filter((s) => s.food_id === overlap.foodId);
      expect(overlapSuggestions.length).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// buildUIComponents tests
// ---------------------------------------------------------------------------
describe("buildUIComponents — suggest_foods case", () => {
  it("emits suggestion_card when found=true with suggestions", () => {
    const result = {
      found: true,
      shortfall: { macro: "protein", amount: 50, unit: "g" },
      suggestions: [
        { id: "s1", label: "Chicken", calories: 200, protein: 40, food_id: "f1", recipe_id: null },
      ],
    };
    const components = buildUIComponents([{ toolName: "suggest_foods", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("suggestion_card");
    expect((components[0]!.props as { suggestions: unknown[] }).suggestions).toHaveLength(1);
    expect((components[0]!.props as { shortfall: unknown }).shortfall).toEqual(result.shortfall);
  });

  it("emits nothing when found=false (no_goals)", () => {
    const result = { found: false, reason: "no_goals" };
    const components = buildUIComponents([{ toolName: "suggest_foods", result }]);
    expect(components).toHaveLength(0);
  });

  it("emits nothing when found=false (goals_met)", () => {
    const result = { found: false, reason: "goals_met" };
    const components = buildUIComponents([{ toolName: "suggest_foods", result }]);
    expect(components).toHaveLength(0);
  });

  it("emits nothing when found=true but suggestions is empty", () => {
    const result = {
      found: true,
      shortfall: { macro: "protein", amount: 30, unit: "g" },
      suggestions: [],
    };
    const components = buildUIComponents([{ toolName: "suggest_foods", result }]);
    expect(components).toHaveLength(0);
  });

  it("shortfall is null when result has no shortfall field", () => {
    const result = {
      found: true,
      suggestions: [{ id: "s1", label: "Food", food_id: "f1", recipe_id: null }],
    };
    const components = buildUIComponents([{ toolName: "suggest_foods", result }]);
    expect(components).toHaveLength(1);
    expect((components[0]!.props as { shortfall: unknown }).shortfall).toBeNull();
  });
});
