/**
 * Full agent flow integration test.
 *
 * Exercises all 6 steps of the agent flow in sequence using shared state:
 *  1. searchFoodExecutor returns foods with "Chicken Breast"
 *  2. handleSmartRoute search case yields food_list uiComponent
 *  3. Insert chatMessage rows (user + assistant), verify 2 rows
 *  4. logFoodExecutor returns { totals, goals }
 *  5. Daily totals: calories=165, protein=31, carb=0, fat=4
 *  6. Chat messages: both rows present, assistant has food_list uiComponent
 *
 * Follows the exact patterns from agent-tools.test.ts.
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
// Replica of searchFoodExecutor (verbatim from chat.ts)
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
// Replica of getDailySummaryExecutor (verbatim from chat.ts)
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
// Replica of logFoodExecutor (verbatim from chat.ts)
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
// Replica of handleSmartRoute search case (verbatim from chat.ts)
// ---------------------------------------------------------------------------
type UIComponent = { type: string; props: Record<string, unknown> };

async function handleSmartRouteSearch(
  query: string,
): Promise<{ content: string | null; uiComponents: UIComponent[] | null }> {
  const results = await searchFoodExecutor(query, 5);
  if (results.foods.length === 0) {
    return { content: `No results for "${query}".`, uiComponents: null };
  }
  return {
    content: null,
    uiComponents: [{ type: "food_list", props: { foods: results.foods } }],
  };
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

async function insertFood(name: string): Promise<string> {
  const foodId = createId();
  const now = new Date().toISOString();
  await db.insert(schema.food).values({
    id: foodId,
    name,
    brandName: null,
    barcode: null,
    source: "usda",
    sourceId: null,
    sourceRevision: null,
    isVerified: false,
    createdAt: now,
    updatedAt: now,
  });
  return foodId;
}

async function insertServing(
  foodId: string,
  macros: { calories: number; protein: number; carb: number; fat: number },
): Promise<string> {
  const servingId = createId();
  const now = new Date().toISOString();
  await db.insert(schema.serving).values({
    id: servingId,
    foodId,
    description: "100g",
    amountGrams: null,
    isDefault: true,
    calories: macros.calories,
    protein: macros.protein,
    carb: macros.carb,
    fat: macros.fat,
    createdAt: now,
    updatedAt: now,
  });
  return servingId;
}

// ---------------------------------------------------------------------------
// Full agent flow integration test
// ---------------------------------------------------------------------------
const TODAY = "2026-03-21";
const CHICKEN_MACROS = { calories: 165, protein: 31, carb: 0, fat: 4 };

describe("Full Agent Flow Integration", () => {
  // Shared state across sequential steps
  let userId: string;
  let foodId1: string;
  let servingId1: string;

  // Step 0: Seed data before tests run
  beforeAll(async () => {
    userId = await insertUser();

    // Seed 3 chicken breast foods with servings (cal=165, p=31, c=0, f=4 per 100g)
    foodId1 = await insertFood("Chicken Breast Raw");
    servingId1 = await insertServing(foodId1, CHICKEN_MACROS);

    const foodId2 = await insertFood("Chicken Breast Cooked");
    await insertServing(foodId2, CHICKEN_MACROS);

    const foodId3 = await insertFood("Chicken Breast Grilled");
    await insertServing(foodId3, CHICKEN_MACROS);
  });

  it("Step 1 — searchFoodExecutor returns foods with 'Chicken Breast'", async () => {
    const result = await searchFoodExecutor("Chicken Breast");
    expect(result.foods.length).toBeGreaterThanOrEqual(3);
    const names = result.foods.map((f) => f.name);
    expect(names.some((n) => n.includes("Chicken Breast"))).toBe(true);
  });

  it("Step 2 — handleSmartRoute search case yields food_list uiComponent", async () => {
    const result = await handleSmartRouteSearch("Chicken Breast");
    expect(result.uiComponents).not.toBeNull();
    expect(result.uiComponents![0].type).toBe("food_list");
    const foods = result.uiComponents![0].props.foods as unknown[];
    expect(foods.length).toBeGreaterThanOrEqual(3);
  });

  it("Step 3 — insert user + assistant chatMessage rows, verify 2 rows", async () => {
    const { chatMessage } = schema;
    const uiComponents: UIComponent[] = [
      { type: "food_list", props: { foods: [] } },
    ];

    const userMsgId = createId();
    const assistantMsgId = createId();

    await db.insert(chatMessage).values({
      id: userMsgId,
      userId,
      role: "user",
      content: "find chicken breast",
      toolCalls: null,
      uiComponents: null,
      attachments: null,
      date: TODAY,
    });

    await db.insert(chatMessage).values({
      id: assistantMsgId,
      userId,
      role: "assistant",
      content: null,
      toolCalls: null,
      uiComponents: uiComponents as unknown as null,
      attachments: null,
      date: TODAY,
    });

    const rows = await db
      .select()
      .from(chatMessage)
      .where(and(eq(chatMessage.userId, userId), eq(chatMessage.date, TODAY)))
      .all();

    expect(rows.length).toBe(2);
  });

  it("Step 4 — logFoodExecutor returns { totals, goals }", async () => {
    const result = await logFoodExecutor(userId, TODAY, foodId1, servingId1, 1, "lunch");
    expect(result).toHaveProperty("totals");
    expect(result).toHaveProperty("goals");
  });

  it("Step 5 — daily totals: calories=165, protein=31, carb=0, fat=4", async () => {
    const summary = await getDailySummaryExecutor(userId, TODAY);
    expect(summary.totals.calories).toBe(165);
    expect(summary.totals.protein).toBe(31);
    expect(summary.totals.carb).toBe(0);
    expect(summary.totals.fat).toBe(4);
  });

  it("Step 6 — chat messages: both rows present, assistant has food_list uiComponent", async () => {
    const { chatMessage } = schema;
    const rows = await db
      .select()
      .from(chatMessage)
      .where(and(eq(chatMessage.userId, userId), eq(chatMessage.date, TODAY)))
      .all();

    expect(rows.length).toBe(2);

    const userRow = rows.find((r) => r.role === "user");
    const assistantRow = rows.find((r) => r.role === "assistant");

    expect(userRow).toBeDefined();
    expect(assistantRow).toBeDefined();

    const uiComponents = assistantRow!.uiComponents as UIComponent[] | null;
    expect(uiComponents).not.toBeNull();
    expect(uiComponents![0].type).toBe("food_list");
  });
});
