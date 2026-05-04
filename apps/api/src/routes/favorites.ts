import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, favorite, food, serving } from "@savoro/db";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const favoritesRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// GET /favorites — list user's favorites ranked by useCount
// ---------------------------------------------------------------------------
favoritesRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 50);

  const results = await db
    .select({
      id: favorite.id,
      foodId: favorite.foodId,
      recipeId: favorite.recipeId,
      useCount: favorite.useCount,
      lastUsedAt: favorite.lastUsedAt,
      name: food.name,
      brandName: food.brandName,
      servingId: serving.id,
      calories: serving.calories,
    })
    .from(favorite)
    .leftJoin(food, eq(favorite.foodId, food.id))
    .leftJoin(serving, eq(serving.foodId, food.id))
    .where(eq(favorite.userId, userId))
    .orderBy(desc(favorite.useCount))
    .limit(limit)
    .all();

  return c.json({
    favorites: results.map((r) => ({
      id: r.id,
      foodId: r.foodId,
      recipeId: r.recipeId,
      useCount: r.useCount,
      lastUsedAt: r.lastUsedAt,
      name: r.name,
      brandName: r.brandName,
      servingId: r.servingId,
      calories: r.calories,
    })),
  });
});

// ---------------------------------------------------------------------------
// POST /favorites — add a food or recipe as favorite
// ---------------------------------------------------------------------------
favoritesRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{ foodId?: string; recipeId?: string }>();

  if (!body.foodId && !body.recipeId) {
    return c.json({ error: "foodId or recipeId is required" }, 400);
  }

  // Check if already favorited
  const existing = await db
    .select()
    .from(favorite)
    .where(
      and(
        eq(favorite.userId, userId),
        body.foodId
          ? eq(favorite.foodId, body.foodId)
          : eq(favorite.recipeId, body.recipeId!),
      ),
    )
    .get();

  if (existing) {
    return c.json({ favorite: existing });
  }

  const now = new Date().toISOString();
  const newFav = {
    id: createId(),
    userId,
    foodId: body.foodId ?? null,
    recipeId: body.recipeId ?? null,
    useCount: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(favorite).values(newFav);
  return c.json({ favorite: newFav }, 201);
});

// ---------------------------------------------------------------------------
// DELETE /favorites/:id — remove a favorite
// ---------------------------------------------------------------------------
favoritesRoutes.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const id = c.req.param("id");

  const existing = await db
    .select()
    .from(favorite)
    .where(and(eq(favorite.id, id), eq(favorite.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Favorite not found" }, 404);
  }

  await db
    .delete(favorite)
    .where(and(eq(favorite.id, id), eq(favorite.userId, userId)));

  return c.json({ deleted: true });
});

export default favoritesRoutes;
