import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, userGoal } from "@savoro/db";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const goalRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// GET /goal/current — get the active goal (endDate is null)
// ---------------------------------------------------------------------------
goalRoutes.get("/current", requireAuth, async (c) => {
  const userId = c.get("user").id;

  const goal = await db
    .select()
    .from(userGoal)
    .where(and(eq(userGoal.userId, userId), isNull(userGoal.endDate)))
    .get();

  return c.json({
    goal: goal
      ? {
          id: goal.id,
          calories: goal.calories,
          protein: goal.protein,
          carb: goal.carb,
          fat: goal.fat,
          fiber: goal.fiber,
          startDate: goal.startDate,
        }
      : null,
  });
});

// ---------------------------------------------------------------------------
// POST /goal — create a new goal (closes the previous one)
// ---------------------------------------------------------------------------
goalRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{
    calories?: number;
    protein?: number;
    carb?: number;
    fat?: number;
    fiber?: number;
  }>();

  const { calories, protein, carb, fat, fiber } = body;

  if (!calories && !protein && !carb && !fat) {
    return c.json({ error: "At least one macro target is required" }, 400);
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // Close the current active goal
  const current = await db
    .select()
    .from(userGoal)
    .where(and(eq(userGoal.userId, userId), isNull(userGoal.endDate)))
    .get();

  if (current) {
    await db
      .update(userGoal)
      .set({ endDate: today, updatedAt: now })
      .where(eq(userGoal.id, current.id));
  }

  // Create the new goal
  const newGoal = {
    id: createId(),
    userId,
    calories: calories ?? null,
    protein: protein ?? null,
    carb: carb ?? null,
    fat: fat ?? null,
    fiber: fiber ?? null,
    startDate: today,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(userGoal).values(newGoal);

  return c.json(
    {
      goal: {
        id: newGoal.id,
        calories: newGoal.calories,
        protein: newGoal.protein,
        carb: newGoal.carb,
        fat: newGoal.fat,
        fiber: newGoal.fiber,
        startDate: newGoal.startDate,
      },
    },
    201,
  );
});

export default goalRoutes;
