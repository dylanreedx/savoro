import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, foodLog, food, serving, userGoal, favorite, recipe } from "@savoro/db";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const logRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// GET /log?date=YYYY-MM-DD — daily macro totals and goals
// ---------------------------------------------------------------------------
logRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);

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
    .where(and(eq(foodLog.userId, userId), eq(foodLog.date, date)))
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

  return c.json({
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carb: Math.round(totals.carb),
      fat: Math.round(totals.fat),
    },
    goals: goal
      ? { calories: goal.calories, protein: goal.protein, carb: goal.carb, fat: goal.fat }
      : null,
  });
});

// ---------------------------------------------------------------------------
// GET /log/entries?date=YYYY-MM-DD — individual log entries with food details
// ---------------------------------------------------------------------------
logRoutes.get("/entries", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);

  const entries = await db
    .select({
      id: foodLog.id,
      foodId: foodLog.foodId,
      servingId: foodLog.servingId,
      quantity: foodLog.quantity,
      meal: foodLog.meal,
      date: foodLog.date,
      foodName: food.name,
      brandName: food.brandName,
      servingDescription: serving.description,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(foodLog)
    .innerJoin(food, eq(foodLog.foodId, food.id))
    .innerJoin(serving, eq(foodLog.servingId, serving.id))
    .where(and(eq(foodLog.userId, userId), eq(foodLog.date, date)))
    .all();

  return c.json({
    entries: entries.map((e) => ({
      id: e.id,
      foodId: e.foodId,
      foodName: e.foodName,
      brandName: e.brandName,
      servingId: e.servingId,
      servingDescription: e.servingDescription,
      quantity: e.quantity,
      meal: e.meal,
      date: e.date,
      calories: Math.round((e.calories ?? 0) * e.quantity),
      protein: Math.round((e.protein ?? 0) * e.quantity),
      carb: Math.round((e.carb ?? 0) * e.quantity),
      fat: Math.round((e.fat ?? 0) * e.quantity),
    })),
  });
});

// ---------------------------------------------------------------------------
// POST /log — create a food log entry
// ---------------------------------------------------------------------------
logRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{
    foodId: string;
    servingId: string;
    quantity?: number;
    meal?: "breakfast" | "lunch" | "dinner" | "snack";
    date?: string;
    utcOffset?: number;
  }>();

  const { foodId, servingId, quantity = 1, meal, date, utcOffset } = body;

  if (!foodId || !servingId) {
    return c.json({ error: "foodId and servingId are required" }, 400);
  }

  // Infer meal from time of day if not provided
  const mealValue = meal ?? inferMeal(utcOffset);
  const dateValue = date ?? new Date().toISOString().slice(0, 10);

  const logEntry = {
    id: createId(),
    userId,
    foodId,
    servingId,
    quantity,
    meal: mealValue,
    date: dateValue,
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

  // Return the new log entry + updated totals
  const servingData = await db
    .select()
    .from(serving)
    .where(eq(serving.id, servingId))
    .get();

  const foodData = await db
    .select()
    .from(food)
    .where(eq(food.id, foodId))
    .get();

  return c.json({
    log: {
      id: logEntry.id,
      foodId,
      foodName: foodData?.name ?? null,
      servingId,
      servingDescription: servingData?.description ?? null,
      quantity,
      meal: mealValue,
      date: dateValue,
      calories: (servingData?.calories ?? 0) * quantity,
      protein: (servingData?.protein ?? 0) * quantity,
      carb: (servingData?.carb ?? 0) * quantity,
      fat: (servingData?.fat ?? 0) * quantity,
    },
  }, 201);
});

// ---------------------------------------------------------------------------
// POST /log/recipe — log a serving of a recipe
// ---------------------------------------------------------------------------
logRoutes.post("/recipe", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{
    recipeId: string;
    quantity?: number;
    meal?: "breakfast" | "lunch" | "dinner" | "snack";
    date?: string;
    utcOffset?: number;
  }>();

  const { recipeId, quantity = 1, meal, date, utcOffset } = body;

  if (!recipeId) {
    return c.json({ error: "recipeId is required" }, 400);
  }

  const row = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)))
    .get();

  if (!row) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  // Get or create food entry for this recipe
  let foodId: string;
  let servingId: string;

  const existingFood = await db
    .select()
    .from(food)
    .where(and(eq(food.source, "recipe"), eq(food.sourceId, recipeId)))
    .get();

  if (existingFood) {
    foodId = existingFood.id;
    const existingServing = await db
      .select()
      .from(serving)
      .where(eq(serving.foodId, existingFood.id))
      .get();

    if (existingServing) {
      servingId = existingServing.id;
      await db
        .update(serving)
        .set({
          calories: row.caloriesPerServing,
          protein: row.proteinPerServing,
          carb: row.carbPerServing,
          fat: row.fatPerServing,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(serving.id, existingServing.id));
    } else {
      servingId = createId();
      const now = new Date().toISOString();
      await db.insert(serving).values({
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
    }
  } else {
    const now = new Date().toISOString();
    foodId = createId();
    servingId = createId();

    await db.insert(food).values({
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

    await db.insert(serving).values({
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
  }

  const mealValue = meal ?? inferMeal(utcOffset);
  const dateValue = date ?? new Date().toISOString().slice(0, 10);

  const logEntry = {
    id: createId(),
    userId,
    foodId,
    servingId,
    quantity,
    meal: mealValue,
    date: dateValue,
    chatMessageId: null,
  };

  await db.insert(foodLog).values(logEntry);

  // Update favorite
  const existingFav = await db
    .select()
    .from(favorite)
    .where(and(eq(favorite.userId, userId), eq(favorite.recipeId, recipeId)))
    .get();

  if (existingFav) {
    await db
      .update(favorite)
      .set({ useCount: existingFav.useCount + 1, lastUsedAt: new Date().toISOString() })
      .where(eq(favorite.id, existingFav.id));
  } else {
    await db.insert(favorite).values({
      id: createId(),
      userId,
      foodId: null,
      recipeId,
      useCount: 1,
      lastUsedAt: new Date().toISOString(),
    });
  }

  return c.json({
    log: {
      id: logEntry.id,
      recipeId,
      foodId,
      foodName: row.title,
      servingId,
      servingDescription: `1 serving (${row.servings} total)`,
      quantity,
      meal: mealValue,
      date: dateValue,
      calories: (row.caloriesPerServing ?? 0) * quantity,
      protein: (row.proteinPerServing ?? 0) * quantity,
      carb: (row.carbPerServing ?? 0) * quantity,
      fat: (row.fatPerServing ?? 0) * quantity,
    },
  }, 201);
});

// ---------------------------------------------------------------------------
// DELETE /log/:id — delete a food log entry
// ---------------------------------------------------------------------------
logRoutes.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const logId = c.req.param("id");

  const existing = await db
    .select()
    .from(foodLog)
    .where(and(eq(foodLog.id, logId), eq(foodLog.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Log entry not found" }, 404);
  }

  await db.delete(foodLog).where(eq(foodLog.id, logId));
  return c.json({ deleted: true });
});

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

export default logRoutes;
