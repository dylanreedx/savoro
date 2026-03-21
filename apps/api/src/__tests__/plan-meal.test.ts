/**
 * Tests for planMealExecutor in chat.ts.
 *
 * Because planMealExecutor is not exported, we replicate its logic
 * verbatim here — the same approach used in suggest-foods.test.ts and agent-tools.test.ts.
 *
 * Coverage:
 *  1. found:false when no food matches query
 *  2. found:true happy path with correct suggestedFood shape
 *  3. projectedMacros = currentMacros + food_macros * quantity (Math.rounded)
 *  4. goals:null when user has no active goal
 *  5. goals populated when user has active goal
 *  6. quantity > 1 correctly scales projected macros
 *  7. currentMacros reflects logged food for the day
 *  8. buildUIComponents: plan_meal case emits meal_plan component when found:true
 *  9. buildUIComponents: all four props present (suggestedFood, currentMacros, projectedMacros, goals)
 * 10. buildUIComponents: emits nothing when found:false
 * 11. buildUIComponents: goals:null still emits component
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
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
// Replica of getDailySummaryExecutor (verbatim from suggest-foods.test.ts)
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

// ---------------------------------------------------------------------------
// Replica of searchFoodExecutor (local-only, no OFF fallback)
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

  // Skip OFF network call — local-only replica for test isolation.
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
// Replica of planMealExecutor (verbatim from chat.ts lines 869-903)
// ---------------------------------------------------------------------------
async function planMealExecutor(userId: string, today: string, query: string, quantity: number) {
  const [searchResult, summaryResult] = await Promise.all([
    searchFoodExecutor(query, 1),
    getDailySummaryExecutor(userId, today),
  ]);

  if (!searchResult.foods.length) {
    return { found: false, error: `No food found for "${query}"` };
  }

  const f = searchResult.foods[0]!;
  const current = summaryResult.totals;
  const goals = summaryResult.goals;

  return {
    found: true,
    suggestedFood: {
      name: f.name,
      calories: f.calories,
      protein: f.protein,
      carb: f.carb,
      fat: f.fat,
      servingDescription: f.servingDescription,
      quantity,
    },
    currentMacros: current,
    projectedMacros: {
      calories: Math.round(current.calories + (f.calories ?? 0) * quantity),
      protein: Math.round(current.protein + (f.protein ?? 0) * quantity),
      carb: Math.round(current.carb + (f.carb ?? 0) * quantity),
      fat: Math.round(current.fat + (f.fat ?? 0) * quantity),
    },
    goals,
  };
}

// ---------------------------------------------------------------------------
// Replica of buildUIComponents plan_meal case (verbatim from chat.ts lines 1427-1441)
// ---------------------------------------------------------------------------
type UIComponent = { type: string; props: Record<string, unknown> };

function buildUIComponents(toolResults: Array<{ toolName: string; result: unknown }>): UIComponent[] {
  const components: UIComponent[] = [];
  for (const { toolName, result } of toolResults) {
    if (toolName === "plan_meal") {
      const r = result as { found: boolean; suggestedFood?: unknown; currentMacros?: unknown; projectedMacros?: unknown; goals?: unknown };
      if (r.found) {
        components.push({
          type: "meal_plan",
          props: {
            suggestedFood: r.suggestedFood,
            currentMacros: r.currentMacros,
            projectedMacros: r.projectedMacros,
            goals: r.goals,
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

describe("planMealExecutor", () => {
  // -------------------------------------------------------------------------
  // 1. found:false when no food matches query
  // -------------------------------------------------------------------------
  it("returns found:false when no food matches query", async () => {
    const userId = await insertUser();
    const result = await planMealExecutor(userId, TODAY, "xyzzy-nonexistent-planmeal-99999", 1);
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.error).toContain("No food found");
    }
  });

  // -------------------------------------------------------------------------
  // 2. found:true happy path with correct suggestedFood shape
  // -------------------------------------------------------------------------
  it("returns found:true with correct suggestedFood shape", async () => {
    const userId = await insertUser();
    const uniqueName = `Grilled Salmon PlanMeal-${createId()}`;
    await insertFoodWithServing(uniqueName, { calories: 250, protein: 35, carb: 0, fat: 12 });

    const result = await planMealExecutor(userId, TODAY, uniqueName, 1);
    expect(result.found).toBe(true);

    if (result.found) {
      const sf = result.suggestedFood as {
        name: string; calories: number | null; protein: number | null;
        carb: number | null; fat: number | null; servingDescription: string | null; quantity: number;
      };
      expect(sf.name).toBe(uniqueName);
      expect(sf.calories).toBe(250);
      expect(sf.protein).toBe(35);
      expect(sf.carb).toBe(0);
      expect(sf.fat).toBe(12);
      expect(sf.servingDescription).toBe("1 serving");
      expect(sf.quantity).toBe(1);
    }
  });

  // -------------------------------------------------------------------------
  // 3. projectedMacros = currentMacros + food_macros * quantity
  // -------------------------------------------------------------------------
  it("projectedMacros equals currentMacros + food macros * quantity (Math.rounded)", async () => {
    const userId = await insertUser();
    const foodName = `Brown Rice PlanMeal-${createId()}`;
    const { foodId, servingId } = await insertFoodWithServing(foodName, { calories: 200, protein: 5, carb: 40, fat: 2 });

    // Log some food first so currentMacros is non-zero
    const logFoodName = `PriorLog PlanMeal-${createId()}`;
    const { foodId: logFoodId, servingId: logServingId } = await insertFoodWithServing(logFoodName, { calories: 100, protein: 10, carb: 20, fat: 3 });
    await insertLog(userId, logFoodId, logServingId, 1, TODAY);

    const result = await planMealExecutor(userId, TODAY, foodName, 1);
    expect(result.found).toBe(true);

    if (result.found) {
      const current = result.currentMacros as { calories: number; protein: number; carb: number; fat: number };
      const projected = result.projectedMacros as { calories: number; protein: number; carb: number; fat: number };

      expect(current.calories).toBe(100);
      expect(current.protein).toBe(10);
      expect(current.carb).toBe(20);
      expect(current.fat).toBe(3);

      expect(projected.calories).toBe(Math.round(100 + 200 * 1));
      expect(projected.protein).toBe(Math.round(10 + 5 * 1));
      expect(projected.carb).toBe(Math.round(20 + 40 * 1));
      expect(projected.fat).toBe(Math.round(3 + 2 * 1));
    }
  });

  // -------------------------------------------------------------------------
  // 4. goals:null when user has no active goal
  // -------------------------------------------------------------------------
  it("returns goals:null when user has no active goal", async () => {
    const userId = await insertUser();
    const foodName = `Turkey PlanMeal-${createId()}`;
    await insertFoodWithServing(foodName, { calories: 180, protein: 30, carb: 0, fat: 5 });

    const result = await planMealExecutor(userId, TODAY, foodName, 1);
    expect(result.found).toBe(true);

    if (result.found) {
      expect(result.goals).toBeNull();
    }
  });

  // -------------------------------------------------------------------------
  // 5. goals populated when user has active goal
  // -------------------------------------------------------------------------
  it("returns goals populated when user has active goal", async () => {
    const userId = await insertUser();
    await insertGoal(userId, { calories: 2000, protein: 150, carb: 200, fat: 65 });

    const foodName = `Tuna PlanMeal-${createId()}`;
    await insertFoodWithServing(foodName, { calories: 120, protein: 28, carb: 0, fat: 1 });

    const result = await planMealExecutor(userId, TODAY, foodName, 1);
    expect(result.found).toBe(true);

    if (result.found) {
      const goals = result.goals as { calories: number | null; protein: number | null; carb: number | null; fat: number | null } | null;
      expect(goals).not.toBeNull();
      expect(goals!.calories).toBe(2000);
      expect(goals!.protein).toBe(150);
      expect(goals!.carb).toBe(200);
      expect(goals!.fat).toBe(65);
    }
  });

  // -------------------------------------------------------------------------
  // 6. quantity > 1 correctly scales projected macros
  // -------------------------------------------------------------------------
  it("scales projected macros correctly when quantity > 1", async () => {
    const userId = await insertUser();
    const foodName = `Oatmeal PlanMeal-${createId()}`;
    await insertFoodWithServing(foodName, { calories: 150, protein: 5, carb: 27, fat: 3 });

    const result = await planMealExecutor(userId, TODAY, foodName, 3);
    expect(result.found).toBe(true);

    if (result.found) {
      const current = result.currentMacros as { calories: number; protein: number; carb: number; fat: number };
      const projected = result.projectedMacros as { calories: number; protein: number; carb: number; fat: number };

      expect(projected.calories).toBe(Math.round(current.calories + 150 * 3));
      expect(projected.protein).toBe(Math.round(current.protein + 5 * 3));
      expect(projected.carb).toBe(Math.round(current.carb + 27 * 3));
      expect(projected.fat).toBe(Math.round(current.fat + 3 * 3));
    }
  });

  // -------------------------------------------------------------------------
  // 7. currentMacros reflects logged food for the day
  // -------------------------------------------------------------------------
  it("currentMacros reflects all food logged for the day", async () => {
    const userId = await insertUser();

    // Log two foods
    const food1Name = `Breakfast PlanMeal-${createId()}`;
    const food2Name = `Lunch PlanMeal-${createId()}`;
    const { foodId: fid1, servingId: sid1 } = await insertFoodWithServing(food1Name, { calories: 300, protein: 20, carb: 40, fat: 8 });
    const { foodId: fid2, servingId: sid2 } = await insertFoodWithServing(food2Name, { calories: 500, protein: 35, carb: 60, fat: 15 });
    await insertLog(userId, fid1, sid1, 1, TODAY);
    await insertLog(userId, fid2, sid2, 1, TODAY);

    const queryFoodName = `Dinner PlanMeal-${createId()}`;
    await insertFoodWithServing(queryFoodName, { calories: 400, protein: 40, carb: 30, fat: 18 });

    const result = await planMealExecutor(userId, TODAY, queryFoodName, 1);
    expect(result.found).toBe(true);

    if (result.found) {
      const current = result.currentMacros as { calories: number; protein: number; carb: number; fat: number };
      expect(current.calories).toBe(800);  // 300 + 500
      expect(current.protein).toBe(55);    // 20 + 35
      expect(current.carb).toBe(100);      // 40 + 60
      expect(current.fat).toBe(23);        // 8 + 15
    }
  });
});

// ---------------------------------------------------------------------------
// buildUIComponents — plan_meal case
// ---------------------------------------------------------------------------
describe("buildUIComponents — plan_meal case", () => {
  // -------------------------------------------------------------------------
  // 8. Emits meal_plan component when found:true
  // -------------------------------------------------------------------------
  it("emits meal_plan component when found:true", () => {
    const result = {
      found: true,
      suggestedFood: { name: "Chicken", calories: 200, protein: 35, carb: 0, fat: 5, servingDescription: "1 piece", quantity: 1 },
      currentMacros: { calories: 500, protein: 40, carb: 60, fat: 20 },
      projectedMacros: { calories: 700, protein: 75, carb: 60, fat: 25 },
      goals: { calories: 2000, protein: 150, carb: 200, fat: 65 },
    };
    const components = buildUIComponents([{ toolName: "plan_meal", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("meal_plan");
  });

  // -------------------------------------------------------------------------
  // 9. All four props present
  // -------------------------------------------------------------------------
  it("emitted component has all four props: suggestedFood, currentMacros, projectedMacros, goals", () => {
    const result = {
      found: true,
      suggestedFood: { name: "Salmon", calories: 250, protein: 35, carb: 0, fat: 12, servingDescription: "1 fillet", quantity: 2 },
      currentMacros: { calories: 800, protein: 60, carb: 90, fat: 30 },
      projectedMacros: { calories: 1300, protein: 130, carb: 90, fat: 54 },
      goals: null,
    };
    const components = buildUIComponents([{ toolName: "plan_meal", result }]);
    expect(components).toHaveLength(1);
    const props = components[0]!.props as {
      suggestedFood: unknown; currentMacros: unknown; projectedMacros: unknown; goals: unknown;
    };
    expect(props.suggestedFood).toBeDefined();
    expect(props.currentMacros).toBeDefined();
    expect(props.projectedMacros).toBeDefined();
    expect("goals" in props).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 10. Emits nothing when found:false
  // -------------------------------------------------------------------------
  it("emits nothing when found:false", () => {
    const result = { found: false, error: 'No food found for "xyz"' };
    const components = buildUIComponents([{ toolName: "plan_meal", result }]);
    expect(components).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 11. goals:null still emits component
  // -------------------------------------------------------------------------
  it("emits meal_plan component even when goals is null", () => {
    const result = {
      found: true,
      suggestedFood: { name: "Rice", calories: 200, protein: 4, carb: 44, fat: 1, servingDescription: "1 cup", quantity: 1 },
      currentMacros: { calories: 0, protein: 0, carb: 0, fat: 0 },
      projectedMacros: { calories: 200, protein: 4, carb: 44, fat: 1 },
      goals: null,
    };
    const components = buildUIComponents([{ toolName: "plan_meal", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("meal_plan");
    const props = components[0]!.props as { goals: unknown };
    expect(props.goals).toBeNull();
  });
});
