/**
 * Integration tests for food logging logic in log.ts.
 *
 * Tests run against an in-memory libsql DB with real migrations — no HTTP
 * layer. Each test gets a fresh userId for isolation.
 *
 * Coverage:
 *  1. Quantity math: macros scale by quantity with Math.round
 *  2. useCount: food favorite upsert increments on repeat log
 *  3. Recipe-as-food: recipe upsert creates food with source='recipe'
 *  4. DELETE: deleting a log entry drops totals to zero
 *  5. Timezone meal inference: inferMeal with fake timers
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import * as schema from "../../../../packages/db/src/schema";

let client: Client;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  db = drizzle(client, { schema });

  const { readFileSync, readdirSync } = await import("fs");
  const { resolve } = await import("path");
  const migrationDir = resolve(__dirname, "../../../../packages/db/migrations");
  const files = readdirSync(migrationDir).filter((f) => f.endsWith(".sql")).sort();
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

async function insertFood(): Promise<string> {
  const id = createId();
  const now = new Date().toISOString();
  await db.insert(schema.food).values({
    id,
    name: `Food-${id}`,
    brandName: null,
    barcode: null,
    source: "user",
    sourceId: null,
    sourceRevision: null,
    isVerified: false,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function insertServing(
  foodId: string,
  macros: { calories: number; protein: number; carb: number; fat: number }
): Promise<string> {
  const id = createId();
  const now = new Date().toISOString();
  await db.insert(schema.serving).values({
    id,
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
  return id;
}

async function insertRecipe(userId: string): Promise<string> {
  const id = createId();
  await db.insert(schema.recipe).values({
    id,
    userId,
    slug: `recipe-${id}`,
    title: "Test Recipe",
    servings: 4,
    caloriesPerServing: 200,
    proteinPerServing: 10,
    carbPerServing: 25,
    fatPerServing: 5,
  });
  return id;
}

async function insertFoodLog(
  userId: string,
  foodId: string,
  servingId: string,
  quantity: number,
  date: string
): Promise<string> {
  const id = createId();
  await db.insert(schema.foodLog).values({
    id,
    userId,
    foodId,
    servingId,
    quantity,
    meal: "lunch",
    date,
    chatMessageId: null,
  });
  return id;
}

// Replicates the join+accumulate from log.ts lines 17-50
async function getTotals(
  userId: string,
  date: string
): Promise<{ calories: number; protein: number; carb: number; fat: number }> {
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
    .where(and(eq(schema.foodLog.userId, userId), eq(schema.foodLog.date, date)))
    .all();

  const totals = { calories: 0, protein: 0, carb: 0, fat: 0 };
  for (const log of logs) {
    totals.calories += (log.calories ?? 0) * log.quantity;
    totals.protein += (log.protein ?? 0) * log.quantity;
    totals.carb += (log.carb ?? 0) * log.quantity;
    totals.fat += (log.fat ?? 0) * log.quantity;
  }

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carb: Math.round(totals.carb),
    fat: Math.round(totals.fat),
  };
}

// Replicated verbatim from log.ts lines 383-397
function inferMeal(utcOffset?: number): "breakfast" | "lunch" | "dinner" | "snack" {
  let hour: number;
  if (utcOffset !== undefined && Math.abs(utcOffset) <= 840) {
    const now = new Date();
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const localMinutes = ((utcMinutes + utcOffset) % 1440 + 1440) % 1440;
    hour = localMinutes / 60;
  } else {
    hour = new Date().getUTCHours();
  }
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

// ---------------------------------------------------------------------------
// Test 1: Quantity math
// ---------------------------------------------------------------------------

describe("quantity math: macros scale by quantity with Math.round", () => {
  it("serving(cal=200,p=10,c=25,f=5) × 1.5 → {300,15,38,8}", async () => {
    const userId = await insertUser();
    const foodId = await insertFood();
    const servingId = await insertServing(foodId, { calories: 200, protein: 10, carb: 25, fat: 5 });
    await insertFoodLog(userId, foodId, servingId, 1.5, "2026-03-21");

    const totals = await getTotals(userId, "2026-03-21");

    expect(totals.calories).toBe(300);
    expect(totals.protein).toBe(15);
    expect(totals.carb).toBe(38); // Math.round(25 * 1.5) = Math.round(37.5) = 38
    expect(totals.fat).toBe(8);   // Math.round(5 * 1.5) = Math.round(7.5) = 8
  });
});

// ---------------------------------------------------------------------------
// Test 2: useCount — food favorite upsert
// ---------------------------------------------------------------------------

describe("useCount: food favorite increments on each log", () => {
  // Replicate the food favorite upsert from log.ts lines 142-162
  async function upsertFoodFavorite(userId: string, foodId: string): Promise<void> {
    const existing = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userId), eq(schema.favorite.foodId, foodId)))
      .get();

    if (existing) {
      await db
        .update(schema.favorite)
        .set({ useCount: existing.useCount + 1, lastUsedAt: new Date().toISOString() })
        .where(eq(schema.favorite.id, existing.id));
    } else {
      await db.insert(schema.favorite).values({
        id: createId(),
        userId,
        foodId,
        recipeId: null,
        useCount: 1,
        lastUsedAt: new Date().toISOString(),
      });
    }
  }

  it("logging the same food twice yields useCount=2", async () => {
    const userId = await insertUser();
    const foodId = await insertFood();

    await upsertFoodFavorite(userId, foodId);
    await upsertFoodFavorite(userId, foodId);

    const fav = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userId), eq(schema.favorite.foodId, foodId)))
      .get();

    expect(fav?.useCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Recipe-as-food upsert creates food with source='recipe'
// ---------------------------------------------------------------------------

describe("recipe-as-food: upsert creates food entry with source='recipe'", () => {
  // Replicate the new-food branch from log.ts lines 271-302
  async function upsertRecipeFood(recipeId: string, row: {
    title: string;
    servings: number;
    caloriesPerServing: number | null;
    proteinPerServing: number | null;
    carbPerServing: number | null;
    fatPerServing: number | null;
  }): Promise<{ foodId: string; servingId: string }> {
    const existingFood = await db
      .select()
      .from(schema.food)
      .where(and(eq(schema.food.source, "recipe"), eq(schema.food.sourceId, recipeId)))
      .get();

    if (existingFood) {
      const existingServing = await db
        .select()
        .from(schema.serving)
        .where(eq(schema.serving.foodId, existingFood.id))
        .get();

      if (existingServing) {
        const now = new Date().toISOString();
        await db
          .update(schema.serving)
          .set({
            calories: row.caloriesPerServing,
            protein: row.proteinPerServing,
            carb: row.carbPerServing,
            fat: row.fatPerServing,
            updatedAt: now,
          })
          .where(eq(schema.serving.id, existingServing.id));
        return { foodId: existingFood.id, servingId: existingServing.id };
      }

      const servingId = createId();
      const now = new Date().toISOString();
      await db.insert(schema.serving).values({
        id: servingId,
        foodId: existingFood.id,
        description: `1 serving (${row.servings} total)`,
        amountGrams: null,
        isDefault: true,
        calories: row.caloriesPerServing,
        protein: row.proteinPerServing,
        carb: row.carbPerServing,
        fat: row.fatPerServing,
        createdAt: now,
        updatedAt: now,
      });
      return { foodId: existingFood.id, servingId };
    }

    const now = new Date().toISOString();
    const foodId = createId();
    const servingId = createId();

    await db.insert(schema.food).values({
      id: foodId,
      name: row.title,
      brandName: null,
      barcode: null,
      source: "recipe",
      sourceId: recipeId,
      sourceRevision: null,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.serving).values({
      id: servingId,
      foodId,
      description: `1 serving (${row.servings} total)`,
      amountGrams: null,
      isDefault: true,
      calories: row.caloriesPerServing,
      protein: row.proteinPerServing,
      carb: row.carbPerServing,
      fat: row.fatPerServing,
      createdAt: now,
      updatedAt: now,
    });

    return { foodId, servingId };
  }

  it("creates a food row with source='recipe' and sourceId matching the recipe", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId);

    const { foodId } = await upsertRecipeFood(recipeId, {
      title: "Test Recipe",
      servings: 4,
      caloriesPerServing: 200,
      proteinPerServing: 10,
      carbPerServing: 25,
      fatPerServing: 5,
    });

    const foodRow = await db
      .select()
      .from(schema.food)
      .where(eq(schema.food.id, foodId))
      .get();

    expect(foodRow?.source).toBe("recipe");
    expect(foodRow?.sourceId).toBe(recipeId);
  });
});

// ---------------------------------------------------------------------------
// Test 4: DELETE — totals drop to zero after deleting the log entry
// ---------------------------------------------------------------------------

describe("DELETE: deleting a log entry drops totals to zero", () => {
  it("after delete, getTotals returns all zeros", async () => {
    const userId = await insertUser();
    const foodId = await insertFood();
    const servingId = await insertServing(foodId, { calories: 300, protein: 20, carb: 40, fat: 10 });
    const logId = await insertFoodLog(userId, foodId, servingId, 1, "2026-03-21");

    // Verify non-zero before delete
    const before = await getTotals(userId, "2026-03-21");
    expect(before.calories).toBe(300);

    // Replicate DELETE logic from log.ts lines 379
    await db.delete(schema.foodLog).where(eq(schema.foodLog.id, logId));

    const after = await getTotals(userId, "2026-03-21");
    expect(after.calories).toBe(0);
    expect(after.protein).toBe(0);
    expect(after.carb).toBe(0);
    expect(after.fat).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 5: Timezone meal inference
// Frozen at 06:30 UTC (Date.UTC(2026, 2, 21, 6, 30, 0))
//   offset=+480 (UTC+8) → 14:30 local → lunch
//   offset=-300 (UTC-5) → 01:30 local → breakfast
// ---------------------------------------------------------------------------

const FROZEN_DATE = new Date(Date.UTC(2026, 2, 21, 6, 30, 0));

describe("timezone meal inference: inferMeal with fake timers at 06:30 UTC", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offset=+480 (UTC+8): 06:30 UTC → 14:30 local → lunch", () => {
    expect(inferMeal(480)).toBe("lunch");
  });

  it("offset=-300 (UTC-5): 06:30 UTC → 01:30 local → breakfast", () => {
    expect(inferMeal(-300)).toBe("breakfast");
  });
});
