import { Hono } from "hono";
import { eq, and, desc, inArray, sql, gte, lte, or, exists } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, recipe, recipeIngredient, recipeFork, serving, food, user, favorite, recipeShare, kitchenMember } from "@savoro/db";
import { requireAuth, optionalAuth, type AuthEnv } from "../middleware/auth";

const recipeRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a URL-safe slug from a title */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Ensure slug is unique for this user by appending a suffix if needed */
async function uniqueSlug(userId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await db
      .select({ id: recipe.id })
      .from(recipe)
      .where(and(eq(recipe.userId, userId), eq(recipe.slug, candidate)))
      .get();
    if (!existing || existing.id === excludeId) return candidate;
    suffix++;
  }
}

/** Calculate per-serving macros from ingredients */
async function calculateMacros(ingredientIds: string[], servings: number) {
  if (ingredientIds.length === 0) return { calories: 0, protein: 0, carb: 0, fat: 0 };

  const ingredients = await db
    .select({
      quantity: recipeIngredient.quantity,
      servingId: recipeIngredient.servingId,
      servingCalories: serving.calories,
      servingProtein: serving.protein,
      servingCarb: serving.carb,
      servingFat: serving.fat,
    })
    .from(recipeIngredient)
    .leftJoin(serving, eq(recipeIngredient.servingId, serving.id))
    .where(inArray(recipeIngredient.id, ingredientIds))
    .all();

  let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
  for (const ing of ingredients) {
    const qty = ing.quantity ?? 1;
    totalCal += (ing.servingCalories ?? 0) * qty;
    totalPro += (ing.servingProtein ?? 0) * qty;
    totalCarb += (ing.servingCarb ?? 0) * qty;
    totalFat += (ing.servingFat ?? 0) * qty;
  }

  const div = servings || 1;
  return {
    calories: Math.round((totalCal / div) * 10) / 10,
    protein: Math.round((totalPro / div) * 10) / 10,
    carb: Math.round((totalCarb / div) * 10) / 10,
    fat: Math.round((totalFat / div) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// POST /recipe — create a recipe
// ---------------------------------------------------------------------------
recipeRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{
    title: string;
    description?: string;
    instructions?: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    tags?: string[];
    isPublic?: boolean;
    ingredients?: {
      foodId?: string;
      servingId?: string;
      quantity?: number;
      unit?: string;
      label: string;
    }[];
  }>();

  if (!body.title?.trim()) {
    return c.json({ error: "Title is required" }, 400);
  }

  const now = new Date().toISOString();
  const slug = await uniqueSlug(userId, slugify(body.title));
  const recipeId = createId();
  const servingsCount = body.servings ?? 1;

  // Insert ingredients
  const ingredientIds: string[] = [];
  if (body.ingredients?.length) {
    for (let i = 0; i < body.ingredients.length; i++) {
      const ing = body.ingredients[i];
      const ingId = createId();
      ingredientIds.push(ingId);
      await db.insert(recipeIngredient).values({
        id: ingId,
        recipeId,
        foodId: ing.foodId ?? null,
        servingId: ing.servingId ?? null,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        label: ing.label,
        sortOrder: i,
      });
    }
  }

  // Calculate macros from ingredients
  const macros = await calculateMacros(ingredientIds, servingsCount);

  await db.insert(recipe).values({
    id: recipeId,
    userId,
    slug,
    title: body.title.trim(),
    description: body.description ?? null,
    instructions: body.instructions ?? null,
    servings: servingsCount,
    prepTime: body.prepTime ?? null,
    cookTime: body.cookTime ?? null,
    imageUrl: null,
    isPublic: body.isPublic ?? false,
    tags: body.tags ?? [],
    caloriesPerServing: macros.calories,
    proteinPerServing: macros.protein,
    carbPerServing: macros.carb,
    fatPerServing: macros.fat,
    forkCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  const ingredients = await db
    .select()
    .from(recipeIngredient)
    .where(eq(recipeIngredient.recipeId, recipeId))
    .orderBy(recipeIngredient.sortOrder)
    .all();

  return c.json(
    {
      recipe: {
        id: recipeId,
        slug,
        title: body.title.trim(),
        description: body.description ?? null,
        instructions: body.instructions ?? null,
        servings: servingsCount,
        prepTime: body.prepTime ?? null,
        cookTime: body.cookTime ?? null,
        isPublic: body.isPublic ?? false,
        tags: body.tags ?? [],
        caloriesPerServing: macros.calories,
        proteinPerServing: macros.protein,
        carbPerServing: macros.carb,
        fatPerServing: macros.fat,
        ingredients,
      },
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET /recipe — list current user's recipes
// ---------------------------------------------------------------------------
recipeRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
  const offset = Number(c.req.query("offset")) || 0;

  const recipes = await db
    .select({
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      isPublic: recipe.isPublic,
      tags: recipe.tags,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinPerServing: recipe.proteinPerServing,
      carbPerServing: recipe.carbPerServing,
      fatPerServing: recipe.fatPerServing,
      forkCount: recipe.forkCount,
      createdAt: recipe.createdAt,
    })
    .from(recipe)
    .where(eq(recipe.userId, userId))
    .orderBy(desc(recipe.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return c.json({ recipes });
});

// ---------------------------------------------------------------------------
// GET /recipe/feed — paginated public recipe feed with filters
// (must appear before /:id to avoid being captured as a param)
// ---------------------------------------------------------------------------
recipeRoutes.get("/feed", optionalAuth, async (c) => {
  const cursor = c.req.query("cursor"); // ISO date string for keyset pagination
  const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
  const tagsParam = c.req.query("tags"); // comma-separated
  const maxCalories = c.req.query("maxCalories") ? Number(c.req.query("maxCalories")) : null;
  const minProtein = c.req.query("minProtein") ? Number(c.req.query("minProtein")) : null;
  const maxCarb = c.req.query("maxCarb") ? Number(c.req.query("maxCarb")) : null;
  const maxFat = c.req.query("maxFat") ? Number(c.req.query("maxFat")) : null;
  const sort = c.req.query("sort") === "recent" ? "recent" : "popular";

  const conditions = [eq(recipe.isPublic, true)];

  if (maxCalories !== null) {
    conditions.push(lte(recipe.caloriesPerServing, maxCalories));
  }
  if (minProtein !== null) {
    conditions.push(gte(recipe.proteinPerServing, minProtein));
  }
  if (maxCarb !== null) {
    conditions.push(lte(recipe.carbPerServing, maxCarb));
  }
  if (maxFat !== null) {
    conditions.push(lte(recipe.fatPerServing, maxFat));
  }

  if (cursor) {
    conditions.push(lte(recipe.createdAt, cursor));
  }

  const orderBy =
    sort === "popular"
      ? [desc(recipe.forkCount), desc(recipe.createdAt)]
      : [desc(recipe.createdAt)];

  const rows = await db
    .select({
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      imageUrl: recipe.imageUrl,
      tags: recipe.tags,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinPerServing: recipe.proteinPerServing,
      carbPerServing: recipe.carbPerServing,
      fatPerServing: recipe.fatPerServing,
      forkCount: recipe.forkCount,
      createdAt: recipe.createdAt,
      authorId: user.id,
      authorUsername: user.username,
      authorDisplayName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
    })
    .from(recipe)
    .innerJoin(user, eq(recipe.userId, user.id))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(limit + 1)
    .all();

  const hasMore = rows.length > limit;
  const results = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? results[results.length - 1].createdAt : null;

  // Filter by tags in-memory (JSON array in SQLite)
  let filtered = results;
  if (tagsParam) {
    const filterTags = tagsParam.split(",").map((t) => t.trim().toLowerCase());
    filtered = results.filter((r) => {
      const recipeTags = (r.tags as string[] | null) ?? [];
      return filterTags.some((ft) => recipeTags.map((t) => t.toLowerCase()).includes(ft));
    });
  }

  // If user is authenticated, mark which recipes are bookmarked
  const authedUser = c.get("user");
  let bookmarkedIds = new Set<string>();
  if (authedUser) {
    const recipeIds = filtered.map((r) => r.id);
    if (recipeIds.length > 0) {
      const favs = await db
        .select({ recipeId: favorite.recipeId })
        .from(favorite)
        .where(
          and(
            eq(favorite.userId, authedUser.id),
            inArray(favorite.recipeId, recipeIds),
          ),
        )
        .all();
      bookmarkedIds = new Set(favs.map((f) => f.recipeId!));
    }
  }

  return c.json({
    recipes: filtered.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      servings: r.servings,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      imageUrl: r.imageUrl,
      tags: r.tags,
      caloriesPerServing: r.caloriesPerServing,
      proteinPerServing: r.proteinPerServing,
      carbPerServing: r.carbPerServing,
      fatPerServing: r.fatPerServing,
      forkCount: r.forkCount,
      createdAt: r.createdAt,
      isBookmarked: bookmarkedIds.has(r.id),
      author: {
        id: r.authorId,
        username: r.authorUsername,
        displayName: r.authorDisplayName,
        avatarUrl: r.authorAvatarUrl,
      },
    })),
    nextCursor,
    hasMore,
  });
});

// ---------------------------------------------------------------------------
// GET /recipe/feed/similar/:id — recipes with overlapping ingredients
// (must appear before /:id to avoid being captured as a param)
// ---------------------------------------------------------------------------
recipeRoutes.get("/feed/similar/:id", async (c) => {
  const recipeId = c.req.param("id");
  const limit = Math.min(Number(c.req.query("limit")) || 6, 20);

  const targetIngredients = await db
    .select({ foodId: recipeIngredient.foodId })
    .from(recipeIngredient)
    .where(eq(recipeIngredient.recipeId, recipeId))
    .all();

  const foodIds = targetIngredients.map((i) => i.foodId).filter(Boolean) as string[];

  if (foodIds.length === 0) {
    return c.json({ recipes: [] });
  }

  const similar = await db
    .select({
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      tags: recipe.tags,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinPerServing: recipe.proteinPerServing,
      carbPerServing: recipe.carbPerServing,
      fatPerServing: recipe.fatPerServing,
      forkCount: recipe.forkCount,
      overlap: sql<number>`count(distinct ${recipeIngredient.foodId})`.as("overlap"),
      authorUsername: user.username,
      authorDisplayName: user.displayName,
    })
    .from(recipeIngredient)
    .innerJoin(recipe, eq(recipeIngredient.recipeId, recipe.id))
    .innerJoin(user, eq(recipe.userId, user.id))
    .where(
      and(
        inArray(recipeIngredient.foodId, foodIds),
        eq(recipe.isPublic, true),
        sql`${recipe.id} != ${recipeId}`,
      ),
    )
    .groupBy(recipe.id)
    .orderBy(sql`overlap DESC`, desc(recipe.forkCount))
    .limit(limit)
    .all();

  return c.json({
    recipes: similar.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      tags: r.tags,
      caloriesPerServing: r.caloriesPerServing,
      proteinPerServing: r.proteinPerServing,
      carbPerServing: r.carbPerServing,
      fatPerServing: r.fatPerServing,
      forkCount: r.forkCount,
      ingredientOverlap: r.overlap,
      author: {
        username: r.authorUsername,
        displayName: r.authorDisplayName,
      },
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /recipe/public/user/:username — public profile + public recipes (no auth)
// (must appear before /:id to avoid being captured as a param)
// ---------------------------------------------------------------------------
recipeRoutes.get("/public/user/:username", async (c) => {
  const username = c.req.param("username");

  const profile = await db
    .select({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    })
    .from(user)
    .where(and(eq(user.username, username), eq(user.isPublic, true)))
    .get();

  if (!profile) {
    return c.json({ error: "User not found" }, 404);
  }

  const recipes = await db
    .select({
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      tags: recipe.tags,
      imageUrl: recipe.imageUrl,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinPerServing: recipe.proteinPerServing,
      carbPerServing: recipe.carbPerServing,
      fatPerServing: recipe.fatPerServing,
      forkCount: recipe.forkCount,
      createdAt: recipe.createdAt,
    })
    .from(recipe)
    .where(and(eq(recipe.userId, profile.id), eq(recipe.isPublic, true)))
    .orderBy(desc(recipe.createdAt))
    .all();

  return c.json({ user: profile, recipes });
});

// ---------------------------------------------------------------------------
// GET /recipe/public/:username/:slug — public recipe page (no auth)
// (must appear before /:id to avoid being captured as a param)
// ---------------------------------------------------------------------------
recipeRoutes.get("/public/:username/:slug", async (c) => {
  const username = c.req.param("username");
  const slug = c.req.param("slug");

  const creator = await db
    .select({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })
    .from(user)
    .where(eq(user.username, username))
    .get();

  if (!creator) {
    return c.json({ error: "User not found" }, 404);
  }

  const row = await db
    .select()
    .from(recipe)
    .where(
      and(
        eq(recipe.userId, creator.id),
        eq(recipe.slug, slug),
        eq(recipe.isPublic, true),
      ),
    )
    .get();

  if (!row) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  const ingredients = await db
    .select({
      id: recipeIngredient.id,
      foodId: recipeIngredient.foodId,
      servingId: recipeIngredient.servingId,
      quantity: recipeIngredient.quantity,
      unit: recipeIngredient.unit,
      label: recipeIngredient.label,
      sortOrder: recipeIngredient.sortOrder,
      foodName: food.name,
      servingDescription: serving.description,
      servingCalories: serving.calories,
      servingProtein: serving.protein,
      servingCarb: serving.carb,
      servingFat: serving.fat,
    })
    .from(recipeIngredient)
    .leftJoin(food, eq(recipeIngredient.foodId, food.id))
    .leftJoin(serving, eq(recipeIngredient.servingId, serving.id))
    .where(eq(recipeIngredient.recipeId, row.id))
    .orderBy(recipeIngredient.sortOrder)
    .all();

  // Check if this recipe is a fork
  const forkRecord = await db
    .select({ originalRecipeId: recipeFork.originalRecipeId })
    .from(recipeFork)
    .where(eq(recipeFork.forkedRecipeId, row.id))
    .get();

  let forkedFrom = null;
  if (forkRecord) {
    const original = await db
      .select({
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug,
        authorUsername: user.username,
        authorDisplayName: user.displayName,
      })
      .from(recipe)
      .innerJoin(user, eq(recipe.userId, user.id))
      .where(eq(recipe.id, forkRecord.originalRecipeId))
      .get();
    if (original) {
      forkedFrom = {
        recipeId: original.id,
        title: original.title,
        slug: original.slug,
        author: { username: original.authorUsername, displayName: original.authorDisplayName },
      };
    }
  }

  return c.json({
    recipe: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      servings: row.servings,
      prepTime: row.prepTime,
      cookTime: row.cookTime,
      imageUrl: row.imageUrl,
      tags: row.tags,
      caloriesPerServing: row.caloriesPerServing,
      proteinPerServing: row.proteinPerServing,
      carbPerServing: row.carbPerServing,
      fatPerServing: row.fatPerServing,
      forkCount: row.forkCount,
      createdAt: row.createdAt,
      ingredients,
      forkedFrom,
    },
    creator,
  });
});

// ---------------------------------------------------------------------------
// GET /recipe/:id — get a single recipe with ingredients
// ---------------------------------------------------------------------------
recipeRoutes.get("/:id", optionalAuth, async (c) => {
  const authedUser = c.get("user");
  const userId = authedUser?.id ?? null;
  const recipeId = c.req.param("id");

  // Build visibility condition: owner OR public OR kitchen-shared to a kitchen the caller belongs to
  let visibilityCondition;
  if (userId) {
    const kitchenSharedSubquery = db
      .select({ one: sql<number>`1` })
      .from(recipeShare)
      .innerJoin(
        kitchenMember,
        and(
          eq(kitchenMember.kitchenId, recipeShare.sharedToKitchenId),
          eq(kitchenMember.userId, userId),
        ),
      )
      .where(eq(recipeShare.recipeId, recipe.id));

    visibilityCondition = and(
      eq(recipe.id, recipeId),
      or(
        eq(recipe.userId, userId),
        eq(recipe.isPublic, true),
        exists(kitchenSharedSubquery),
      ),
    );
  } else {
    // Unauthenticated: only public recipes
    visibilityCondition = and(
      eq(recipe.id, recipeId),
      eq(recipe.isPublic, true),
    );
  }

  const row = await db
    .select()
    .from(recipe)
    .where(visibilityCondition)
    .get();

  if (!row) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  const ingredients = await db
    .select({
      id: recipeIngredient.id,
      foodId: recipeIngredient.foodId,
      servingId: recipeIngredient.servingId,
      quantity: recipeIngredient.quantity,
      unit: recipeIngredient.unit,
      label: recipeIngredient.label,
      sortOrder: recipeIngredient.sortOrder,
      foodName: food.name,
      servingDescription: serving.description,
      servingCalories: serving.calories,
      servingProtein: serving.protein,
      servingCarb: serving.carb,
      servingFat: serving.fat,
    })
    .from(recipeIngredient)
    .leftJoin(food, eq(recipeIngredient.foodId, food.id))
    .leftJoin(serving, eq(recipeIngredient.servingId, serving.id))
    .where(eq(recipeIngredient.recipeId, recipeId))
    .orderBy(recipeIngredient.sortOrder)
    .all();

  // Check if this recipe is a fork
  const fork = await db
    .select({ originalRecipeId: recipeFork.originalRecipeId })
    .from(recipeFork)
    .where(eq(recipeFork.forkedRecipeId, recipeId))
    .get();

  let forkedFrom = null;
  if (fork) {
    const original = await db
      .select({
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug,
        authorUsername: user.username,
        authorDisplayName: user.displayName,
      })
      .from(recipe)
      .innerJoin(user, eq(recipe.userId, user.id))
      .where(eq(recipe.id, fork.originalRecipeId))
      .get();
    if (original) {
      forkedFrom = {
        recipeId: original.id,
        title: original.title,
        slug: original.slug,
        author: { username: original.authorUsername, displayName: original.authorDisplayName },
      };
    }
  }

  return c.json({
    recipe: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      servings: row.servings,
      prepTime: row.prepTime,
      cookTime: row.cookTime,
      imageUrl: row.imageUrl,
      isPublic: row.isPublic,
      tags: row.tags,
      caloriesPerServing: row.caloriesPerServing,
      proteinPerServing: row.proteinPerServing,
      carbPerServing: row.carbPerServing,
      fatPerServing: row.fatPerServing,
      forkCount: row.forkCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ingredients,
      forkedFrom,
    },
  });
});

// ---------------------------------------------------------------------------
// PATCH /recipe/:id — update a recipe
// ---------------------------------------------------------------------------
recipeRoutes.patch("/:id", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const recipeId = c.req.param("id");

  const existing = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  const body = await c.req.json<{
    title?: string;
    description?: string;
    instructions?: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    tags?: string[];
    isPublic?: boolean;
    ingredients?: {
      foodId?: string;
      servingId?: string;
      quantity?: number;
      unit?: string;
      label: string;
    }[];
  }>();

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (body.title !== undefined) {
    updates.title = body.title.trim();
    updates.slug = await uniqueSlug(userId, slugify(body.title), recipeId);
  }
  if (body.description !== undefined) updates.description = body.description;
  if (body.instructions !== undefined) updates.instructions = body.instructions;
  if (body.servings !== undefined) updates.servings = body.servings;
  if (body.prepTime !== undefined) updates.prepTime = body.prepTime;
  if (body.cookTime !== undefined) updates.cookTime = body.cookTime;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.isPublic !== undefined) updates.isPublic = body.isPublic;

  // Replace ingredients if provided
  if (body.ingredients !== undefined) {
    await db.delete(recipeIngredient).where(eq(recipeIngredient.recipeId, recipeId));

    const ingredientIds: string[] = [];
    for (let i = 0; i < body.ingredients.length; i++) {
      const ing = body.ingredients[i];
      const ingId = createId();
      ingredientIds.push(ingId);
      await db.insert(recipeIngredient).values({
        id: ingId,
        recipeId,
        foodId: ing.foodId ?? null,
        servingId: ing.servingId ?? null,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        label: ing.label,
        sortOrder: i,
      });
    }

    const servingsCount = (body.servings ?? existing.servings) || 1;
    const macros = await calculateMacros(ingredientIds, servingsCount);
    updates.caloriesPerServing = macros.calories;
    updates.proteinPerServing = macros.protein;
    updates.carbPerServing = macros.carb;
    updates.fatPerServing = macros.fat;
  } else if (body.servings !== undefined && body.servings !== existing.servings) {
    // Servings changed but ingredients didn't — recalculate from existing ingredients
    const existingIngs = await db
      .select({ id: recipeIngredient.id })
      .from(recipeIngredient)
      .where(eq(recipeIngredient.recipeId, recipeId))
      .all();
    const macros = await calculateMacros(
      existingIngs.map((i) => i.id),
      body.servings || 1,
    );
    updates.caloriesPerServing = macros.calories;
    updates.proteinPerServing = macros.protein;
    updates.carbPerServing = macros.carb;
    updates.fatPerServing = macros.fat;
  }

  await db.update(recipe).set(updates).where(eq(recipe.id, recipeId));

  // Return updated recipe
  const updated = await db.select().from(recipe).where(eq(recipe.id, recipeId)).get();
  const ingredients = await db
    .select()
    .from(recipeIngredient)
    .where(eq(recipeIngredient.recipeId, recipeId))
    .orderBy(recipeIngredient.sortOrder)
    .all();

  return c.json({ recipe: { ...updated, ingredients } });
});

// ---------------------------------------------------------------------------
// DELETE /recipe/:id
// ---------------------------------------------------------------------------
recipeRoutes.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const recipeId = c.req.param("id");

  const existing = await db
    .select({ id: recipe.id })
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  // Ingredients cascade-delete via FK
  await db.delete(recipe).where(eq(recipe.id, recipeId));

  return c.json({ deleted: true });
});

// ---------------------------------------------------------------------------
// POST /recipe/:id/fork — fork a recipe into the current user's collection
// ---------------------------------------------------------------------------
recipeRoutes.post("/:id/fork", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const originalId = c.req.param("id");

  // Fetch the original recipe (must be public or owned by user)
  const original = await db
    .select()
    .from(recipe)
    .where(eq(recipe.id, originalId))
    .get();

  if (!original) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  if (!original.isPublic && original.userId !== userId) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  // Cannot fork your own recipe
  if (original.userId === userId) {
    return c.json({ error: "Cannot fork your own recipe" }, 400);
  }

  const now = new Date().toISOString();
  const forkedId = createId();
  const slug = await uniqueSlug(userId, slugify(original.title));

  // Copy recipe
  await db.insert(recipe).values({
    id: forkedId,
    userId,
    slug,
    title: original.title,
    description: original.description,
    instructions: original.instructions,
    servings: original.servings,
    prepTime: original.prepTime,
    cookTime: original.cookTime,
    imageUrl: original.imageUrl,
    isPublic: false, // forks start private
    tags: original.tags ?? [],
    caloriesPerServing: original.caloriesPerServing,
    proteinPerServing: original.proteinPerServing,
    carbPerServing: original.carbPerServing,
    fatPerServing: original.fatPerServing,
    forkCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Copy ingredients
  const originalIngredients = await db
    .select()
    .from(recipeIngredient)
    .where(eq(recipeIngredient.recipeId, originalId))
    .orderBy(recipeIngredient.sortOrder)
    .all();

  for (const ing of originalIngredients) {
    await db.insert(recipeIngredient).values({
      id: createId(),
      recipeId: forkedId,
      foodId: ing.foodId,
      servingId: ing.servingId,
      quantity: ing.quantity,
      unit: ing.unit,
      label: ing.label,
      sortOrder: ing.sortOrder,
    });
  }

  // Create fork record
  await db.insert(recipeFork).values({
    id: createId(),
    originalRecipeId: originalId,
    forkedRecipeId: forkedId,
    createdAt: now,
    updatedAt: now,
  });

  // Increment fork count on original
  await db
    .update(recipe)
    .set({ forkCount: sql`${recipe.forkCount} + 1`, updatedAt: now })
    .where(eq(recipe.id, originalId));

  // Fetch the forked recipe with ingredients for response
  const forked = await db.select().from(recipe).where(eq(recipe.id, forkedId)).get();
  const ingredients = await db
    .select()
    .from(recipeIngredient)
    .where(eq(recipeIngredient.recipeId, forkedId))
    .orderBy(recipeIngredient.sortOrder)
    .all();

  // Get original author info for attribution
  const originalAuthor = await db
    .select({ username: user.username, displayName: user.displayName })
    .from(user)
    .where(eq(user.id, original.userId))
    .get();

  return c.json(
    {
      recipe: { ...forked, ingredients },
      forkedFrom: {
        recipeId: originalId,
        title: original.title,
        slug: original.slug,
        author: originalAuthor,
      },
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// POST /recipe/:id/food — create a food entry from this recipe for logging
// ---------------------------------------------------------------------------
recipeRoutes.post("/:id/food", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const recipeId = c.req.param("id");

  const row = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)))
    .get();

  if (!row) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  // Check if a food entry already exists for this recipe
  const existingFood = await db
    .select()
    .from(food)
    .where(and(eq(food.source, "recipe"), eq(food.sourceId, recipeId)))
    .get();

  if (existingFood) {
    // Update existing food's serving macros to stay in sync
    const existingServing = await db
      .select()
      .from(serving)
      .where(eq(serving.foodId, existingFood.id))
      .get();

    if (existingServing) {
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
    }

    return c.json({
      food: { id: existingFood.id, name: existingFood.name, source: "recipe" },
      serving: existingServing
        ? {
            id: existingServing.id,
            description: `1 serving (${row.servings} total)`,
            calories: row.caloriesPerServing,
            protein: row.proteinPerServing,
            carb: row.carbPerServing,
            fat: row.fatPerServing,
          }
        : null,
    });
  }

  const now = new Date().toISOString();
  const foodId = createId();
  const servingId = createId();

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

  return c.json(
    {
      food: { id: foodId, name: row.title, source: "recipe" },
      serving: {
        id: servingId,
        description: `1 serving (${row.servings} total)`,
        calories: row.caloriesPerServing,
        protein: row.proteinPerServing,
        carb: row.carbPerServing,
        fat: row.fatPerServing,
      },
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// POST /recipe/:id/share — share a recipe to a kitchen
// ---------------------------------------------------------------------------
recipeRoutes.post("/:id/share", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const recipeId = c.req.param("id");

  const body = await c.req.json<{ kitchenId: string; message?: string }>();

  if (!body.kitchenId) {
    return c.json({ error: "kitchenId is required" }, 400);
  }

  // Verify recipe exists
  const row = await db
    .select({ id: recipe.id, userId: recipe.userId })
    .from(recipe)
    .where(eq(recipe.id, recipeId))
    .get();

  if (!row) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  // Only owner can share
  if (row.userId !== userId) {
    return c.json({ error: "Only the recipe owner can share it" }, 403);
  }

  // Caller must be a member of the target kitchen
  const membership = await db
    .select({ id: kitchenMember.id })
    .from(kitchenMember)
    .where(and(eq(kitchenMember.kitchenId, body.kitchenId), eq(kitchenMember.userId, userId)))
    .get();

  if (!membership) {
    return c.json({ error: "You are not a member of this kitchen" }, 400);
  }

  // Idempotent: check if already shared to this kitchen
  const existing = await db
    .select({ id: recipeShare.id })
    .from(recipeShare)
    .where(
      and(
        eq(recipeShare.recipeId, recipeId),
        eq(recipeShare.sharedToKitchenId, body.kitchenId),
      ),
    )
    .get();

  if (existing) {
    return c.json({ share: { id: existing.id }, duplicate: true }, 200);
  }

  const now = new Date().toISOString();
  const shareId = createId();

  await db.insert(recipeShare).values({
    id: shareId,
    recipeId,
    sharedBy: userId,
    sharedToUserId: null,
    sharedToKitchenId: body.kitchenId,
    message: body.message ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ share: { id: shareId } }, 201);
});

export default recipeRoutes;
