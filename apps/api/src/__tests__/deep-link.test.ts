/**
 * Tests for deep link public recipe resolution.
 *
 * Replicates the GET /public/:username/:slug route logic as a local executor
 * (no HTTP mock), using the same in-memory libsql + migration loop pattern
 * as recipe-visibility.test.ts.
 *
 * Coverage:
 *  1. Public recipe resolves — 200 with recipe.id, title, slug, creator.username, ingredients
 *  2. OG-equivalent fields present — title, description, imageUrl all non-null strings
 *  3. Nonexistent slug returns 404
 *  4. Nonexistent username returns 404
 *  5. Private recipe returns 404 (not 403)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import * as schema from "../../../../packages/db/src/schema";

let client: Client;
let testDb: ReturnType<typeof drizzle>;

// ---------------------------------------------------------------------------
// DB setup with migrations
// ---------------------------------------------------------------------------
beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  testDb = drizzle(client, { schema });

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
// Helpers
// ---------------------------------------------------------------------------
async function insertUser(username?: string): Promise<string> {
  const id = createId();
  const name = username ?? `user-${id}`;
  await testDb.insert(schema.user).values({
    id,
    email: `${name}@test.com`,
    username: name,
    passwordHash: "x",
  });
  return id;
}

async function insertRecipe(
  userId: string,
  opts: {
    isPublic?: boolean;
    title?: string;
    description?: string | null;
    imageUrl?: string | null;
    slug?: string;
  } = {},
): Promise<string> {
  const id = createId();
  const now = new Date().toISOString();
  await testDb.insert(schema.recipe).values({
    id,
    userId,
    slug: opts.slug ?? `recipe-${id}`,
    title: opts.title ?? `Recipe ${id}`,
    description: opts.description ?? null,
    instructions: null,
    servings: 1,
    prepTime: null,
    cookTime: null,
    imageUrl: opts.imageUrl ?? null,
    isPublic: opts.isPublic ?? false,
    tags: [],
    caloriesPerServing: 400,
    proteinPerServing: 30,
    carbPerServing: 40,
    fatPerServing: 10,
    forkCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function insertFoodWithServing(
  name: string,
  macros: { calories: number; protein: number; carb: number; fat: number },
): Promise<{ foodId: string; servingId: string }> {
  const foodId = createId();
  const servingId = createId();
  const now = new Date().toISOString();
  await testDb.insert(schema.food).values({
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
  await testDb.insert(schema.serving).values({
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

async function insertIngredient(
  recipeId: string,
  foodId: string | null,
  servingId: string | null,
  label: string,
  sortOrder = 0,
): Promise<string> {
  const id = createId();
  await testDb.insert(schema.recipeIngredient).values({
    id,
    recipeId,
    foodId,
    servingId,
    quantity: 1,
    unit: null,
    label,
    sortOrder,
  });
  return id;
}

// ---------------------------------------------------------------------------
// Executor — replicates GET /public/:username/:slug logic from recipe.ts
// ---------------------------------------------------------------------------
async function publicRecipeExecutor(
  username: string,
  slug: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { user, recipe, recipeIngredient, food, serving } = schema;

  const creator = await testDb
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
    return { status: 404, body: { error: "User not found" } };
  }

  const row = await testDb
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
    return { status: 404, body: { error: "Recipe not found" } };
  }

  const ingredients = await testDb
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

  return {
    status: 200,
    body: {
      recipe: {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        imageUrl: row.imageUrl,
        isPublic: row.isPublic,
      },
      creator: {
        username: creator.username,
        displayName: creator.displayName,
        avatarUrl: creator.avatarUrl,
      },
      ingredients,
    },
  };
}

// ---------------------------------------------------------------------------
// Seed data (shared across tests in beforeAll)
// ---------------------------------------------------------------------------
let seedUserId: string;
let seedRecipeId: string;

beforeAll(async () => {
  seedUserId = await insertUser("dylan");
  seedRecipeId = await insertRecipe(seedUserId, {
    slug: "chicken-tikka",
    title: "Chicken Tikka Masala",
    description: "A classic Indian dish with tender chicken in a spiced tomato cream sauce.",
    imageUrl: "https://example.com/chicken-tikka.jpg",
    isPublic: true,
  });

  const { foodId, servingId } = await insertFoodWithServing("Chicken Breast", {
    calories: 165,
    protein: 31,
    carb: 0,
    fat: 4,
  });
  await insertIngredient(seedRecipeId, foodId, servingId, "Chicken Breast", 0);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("deep link — GET /public/:username/:slug", () => {
  // 1. Public recipe resolves
  it("public recipe resolves with 200 and expected fields", async () => {
    const result = await publicRecipeExecutor("dylan", "chicken-tikka");

    expect(result.status).toBe(200);

    const { recipe, creator, ingredients } = result.body as {
      recipe: { id: string; title: string; slug: string };
      creator: { username: string };
      ingredients: unknown[];
    };

    expect(recipe.id).toBe(seedRecipeId);
    expect(recipe.title).toBe("Chicken Tikka Masala");
    expect(recipe.slug).toBe("chicken-tikka");
    expect(creator.username).toBe("dylan");
    expect(ingredients.length).toBeGreaterThanOrEqual(1);
  });

  // 2. OG-equivalent fields present
  it("OG-equivalent fields (title, description, imageUrl) are non-null strings", async () => {
    const result = await publicRecipeExecutor("dylan", "chicken-tikka");

    expect(result.status).toBe(200);

    const { recipe } = result.body as {
      recipe: { title: string | null; description: string | null; imageUrl: string | null };
    };

    expect(typeof recipe.title).toBe("string");
    expect(recipe.title).not.toBeNull();
    expect(typeof recipe.description).toBe("string");
    expect(recipe.description).not.toBeNull();
    expect(typeof recipe.imageUrl).toBe("string");
    expect(recipe.imageUrl).not.toBeNull();
  });

  // 3. Nonexistent slug returns 404
  it("nonexistent slug returns 404", async () => {
    const result = await publicRecipeExecutor("dylan", "this-slug-does-not-exist");

    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toBeTruthy();
  });

  // 4. Nonexistent username returns 404
  it("nonexistent username returns 404", async () => {
    const result = await publicRecipeExecutor("nobody-here", "chicken-tikka");

    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toBeTruthy();
  });

  // 5. Private recipe returns 404 (not 403)
  it("private recipe returns 404", async () => {
    const userId = await insertUser();
    await insertRecipe(userId, {
      slug: "secret-recipe",
      title: "Secret Recipe",
      isPublic: false,
    });

    // Fetch the inserted user's username to pass to executor
    const userRow = await testDb
      .select({ username: schema.user.username })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .get();

    const result = await publicRecipeExecutor(userRow!.username, "secret-recipe");

    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toBeTruthy();
  });
});
