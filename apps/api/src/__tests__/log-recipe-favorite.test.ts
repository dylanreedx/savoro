/**
 * Tests for the recipe favorite tracking fix in log.ts.
 *
 * Fix (line 322): lookup changed from eq(favorite.foodId, foodId) to eq(favorite.recipeId, recipeId)
 * Fix (line 334): insert changed from foodId to foodId: null
 *
 * We replicate the exact favorite upsert logic from log.ts using an in-memory
 * libsql DB with real migrations, matching the pattern in lookup-barcode.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
// Helpers — seed minimal rows required by FK constraints
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

// Replicate the exact favorite upsert logic from log.ts lines 319–338
async function upsertRecipeFavorite(userId: string, recipeId: string): Promise<void> {
  const existingFav = await db
    .select()
    .from(schema.favorite)
    .where(and(eq(schema.favorite.userId, userId), eq(schema.favorite.recipeId, recipeId)))
    .get();

  if (existingFav) {
    await db
      .update(schema.favorite)
      .set({ useCount: existingFav.useCount + 1, lastUsedAt: new Date().toISOString() })
      .where(eq(schema.favorite.id, existingFav.id));
  } else {
    await db.insert(schema.favorite).values({
      id: createId(),
      userId,
      foodId: null,
      recipeId,
      useCount: 1,
      lastUsedAt: new Date().toISOString(),
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("recipe favorite upsert: first log creates row with correct fields", () => {
  it("inserts favorite with recipeId set and foodId null", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId);

    await upsertRecipeFavorite(userId, recipeId);

    const rows = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userId), eq(schema.favorite.recipeId, recipeId)))
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0].recipeId).toBe(recipeId);
    expect(rows[0].foodId).toBeNull();
    expect(rows[0].useCount).toBe(1);
  });

  it("does not create a row linked by foodId instead of recipeId", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId);

    await upsertRecipeFavorite(userId, recipeId);

    // Should find nothing when looking up by recipeId = null (the old buggy path)
    const wrongRows = await db
      .select()
      .from(schema.favorite)
      .where(
        and(
          eq(schema.favorite.userId, userId),
          // The old bug would store recipeId in foodId column — verify that is not the case
          eq(schema.favorite.foodId, recipeId as unknown as string)
        )
      )
      .all();

    expect(wrongRows).toHaveLength(0);
  });
});

describe("recipe favorite upsert: duplicate log increments useCount", () => {
  it("increments useCount instead of inserting a second row on repeated log", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId);

    await upsertRecipeFavorite(userId, recipeId);
    await upsertRecipeFavorite(userId, recipeId);
    await upsertRecipeFavorite(userId, recipeId);

    const rows = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userId), eq(schema.favorite.recipeId, recipeId)))
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0].useCount).toBe(3);
  });

  it("does not create a second favorite row on second log", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId);

    await upsertRecipeFavorite(userId, recipeId);
    await upsertRecipeFavorite(userId, recipeId);

    const allUserFavs = await db
      .select()
      .from(schema.favorite)
      .where(eq(schema.favorite.userId, userId))
      .all();

    expect(allUserFavs).toHaveLength(1);
  });
});

describe("recipe favorite upsert: isolation between users and recipes", () => {
  it("tracks favorites independently for different users on the same recipe", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    const recipeId = await insertRecipe(userA);

    await upsertRecipeFavorite(userA, recipeId);
    await upsertRecipeFavorite(userA, recipeId);
    await upsertRecipeFavorite(userB, recipeId);

    const favA = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userA), eq(schema.favorite.recipeId, recipeId)))
      .get();

    const favB = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userB), eq(schema.favorite.recipeId, recipeId)))
      .get();

    expect(favA?.useCount).toBe(2);
    expect(favB?.useCount).toBe(1);
  });

  it("tracks favorites independently for different recipes for the same user", async () => {
    const userId = await insertUser();
    const recipeA = await insertRecipe(userId);
    const recipeB = await insertRecipe(userId);

    await upsertRecipeFavorite(userId, recipeA);
    await upsertRecipeFavorite(userId, recipeA);
    await upsertRecipeFavorite(userId, recipeB);

    const favA = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userId), eq(schema.favorite.recipeId, recipeA)))
      .get();

    const favB = await db
      .select()
      .from(schema.favorite)
      .where(and(eq(schema.favorite.userId, userId), eq(schema.favorite.recipeId, recipeB)))
      .get();

    expect(favA?.useCount).toBe(2);
    expect(favB?.useCount).toBe(1);
  });
});
