/**
 * Tests for recipe sharing permissions.
 *
 * Coverage:
 *  1.  userB GET private → null (403)
 *  2.  userC GET private → null (403)
 *  3.  userB GET shared → row (200)
 *  4.  userC GET shared → null (403)
 *  5.  userC GET public → row (200)
 *  6.  userB PUT (non-owner) → 403
 *  7.  userA PUT (owner) → 200
 *  8.  userB Fork shared → 201
 *  9.  userC Fork private (not member) → 403
 * 10.  userC Fork public → 201
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
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
  opts: { isPublic?: boolean; title?: string } = {},
): Promise<string> {
  const id = createId();
  const now = new Date().toISOString();
  await testDb.insert(schema.recipe).values({
    id,
    userId,
    slug: `recipe-${id}`,
    title: opts.title ?? `Recipe ${id}`,
    description: null,
    instructions: null,
    servings: 1,
    prepTime: null,
    cookTime: null,
    imageUrl: null,
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

async function insertKitchen(ownerId: string): Promise<string> {
  const id = createId();
  const now = new Date().toISOString();
  await testDb.insert(schema.kitchen).values({
    id,
    name: `Kitchen ${id}`,
    ownerId,
    createdAt: now,
    updatedAt: now,
  });
  // Owner is automatically a member
  await testDb.insert(schema.kitchenMember).values({
    id: createId(),
    kitchenId: id,
    userId: ownerId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function addKitchenMember(kitchenId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await testDb.insert(schema.kitchenMember).values({
    id: createId(),
    kitchenId,
    userId,
    role: "member",
    createdAt: now,
    updatedAt: now,
  });
}

async function shareRecipeToKitchen(
  recipeId: string,
  sharedBy: string,
  kitchenId: string,
): Promise<string> {
  const id = createId();
  const now = new Date().toISOString();
  await testDb.insert(schema.recipeShare).values({
    id,
    recipeId,
    sharedBy,
    sharedToUserId: null,
    sharedToKitchenId: kitchenId,
    message: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------
import { and, or, exists, sql } from "drizzle-orm";

/** Returns recipe row if visible to userId, else null. */
async function getRecipeIfVisible(
  recipeId: string,
  userId: string | null,
): Promise<typeof schema.recipe.$inferSelect | null> {
  const { recipe, recipeShare, kitchenMember } = schema;

  if (userId) {
    const kitchenSharedSubquery = testDb
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

    const row = await testDb
      .select()
      .from(recipe)
      .where(
        and(
          eq(recipe.id, recipeId),
          or(
            eq(recipe.userId, userId),
            eq(recipe.isPublic, true),
            exists(kitchenSharedSubquery),
          ),
        ),
      )
      .get();
    return row ?? null;
  }

  const row = await testDb
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.isPublic, true)))
    .get();
  return row ?? null;
}

/** Replicates PUT /:id logic — checks ownership before update. */
async function updateRecipeExecutor(
  recipeId: string,
  callerId: string,
  patch: { title?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { recipe } = schema;

  const row = await testDb
    .select({ id: recipe.id, userId: recipe.userId })
    .from(recipe)
    .where(eq(recipe.id, recipeId))
    .get();

  if (!row) return { status: 404, body: { error: "Recipe not found" } };
  if (row.userId !== callerId) {
    return { status: 403, body: { error: "Only the recipe owner can edit" } };
  }

  const now = new Date().toISOString();
  await testDb
    .update(recipe)
    .set({ ...patch, updatedAt: now })
    .where(eq(recipe.id, recipeId));

  const updated = await testDb
    .select()
    .from(recipe)
    .where(eq(recipe.id, recipeId))
    .get();

  return { status: 200, body: { recipe: updated } };
}

/** Replicates POST /:id/fork logic — kitchen-aware permission check. */
async function forkRecipeExecutor(
  originalId: string,
  callerId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { recipe, recipeShare, kitchenMember } = schema;

  const original = await testDb
    .select()
    .from(recipe)
    .where(eq(recipe.id, originalId))
    .get();

  if (!original) return { status: 404, body: { error: "Recipe not found" } };

  if (original.userId === callerId) {
    return { status: 400, body: { error: "Cannot fork your own recipe" } };
  }

  if (!original.isPublic) {
    const sharedRow = await testDb
      .select({ one: sql<number>`1` })
      .from(recipeShare)
      .innerJoin(
        kitchenMember,
        and(
          eq(kitchenMember.kitchenId, recipeShare.sharedToKitchenId),
          eq(kitchenMember.userId, callerId),
        ),
      )
      .where(eq(recipeShare.recipeId, originalId))
      .get();

    if (!sharedRow) {
      return { status: 403, body: { error: "You do not have permission to fork this recipe" } };
    }
  }

  const now = new Date().toISOString();
  const forkedId = createId();
  await testDb.insert(recipe).values({
    id: forkedId,
    userId: callerId,
    slug: `forked-${forkedId}`,
    title: original.title,
    description: original.description,
    instructions: original.instructions,
    servings: original.servings,
    prepTime: original.prepTime,
    cookTime: original.cookTime,
    imageUrl: original.imageUrl,
    isPublic: false,
    tags: original.tags ?? [],
    caloriesPerServing: original.caloriesPerServing,
    proteinPerServing: original.proteinPerServing,
    carbPerServing: original.carbPerServing,
    fatPerServing: original.fatPerServing,
    forkCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  return { status: 201, body: { recipe: { id: forkedId } } };
}

// ---------------------------------------------------------------------------
// Shared fixture (module-level state, populated in beforeAll of the suite)
// ---------------------------------------------------------------------------
let userA: string; // owner
let userB: string; // kitchen member
let userC: string; // outsider
let kitchenId: string;
let recipeId: string;

beforeAll(async () => {
  userA = await insertUser("perm-userA");
  userB = await insertUser("perm-userB");
  userC = await insertUser("perm-userC");
  kitchenId = await insertKitchen(userA);
  await addKitchenMember(kitchenId, userB);
  recipeId = await insertRecipe(userA, { isPublic: false });
});

// ---------------------------------------------------------------------------
// Tests — visibility: private recipe
// ---------------------------------------------------------------------------
describe("recipe permissions — visibility (private)", () => {
  // 1. userB GET private → null
  it("kitchen member (userB) cannot see owner's private recipe before sharing", async () => {
    const row = await getRecipeIfVisible(recipeId, userB);
    expect(row).toBeNull();
  });

  // 2. userC GET private → null
  it("outsider (userC) cannot see owner's private recipe", async () => {
    const row = await getRecipeIfVisible(recipeId, userC);
    expect(row).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — visibility: shared recipe (kitchen-scoped)
// ---------------------------------------------------------------------------
describe("recipe permissions — visibility (shared to kitchen)", () => {
  beforeAll(async () => {
    // Transition: share recipe to kitchen
    await shareRecipeToKitchen(recipeId, userA, kitchenId);
  });

  // 3. userB GET shared → row
  it("kitchen member (userB) can see recipe after it is shared to their kitchen", async () => {
    const row = await getRecipeIfVisible(recipeId, userB);
    expect(row).not.toBeNull();
    expect(row!.id).toBe(recipeId);
  });

  // 4. userC GET shared → null
  it("outsider (userC) cannot see recipe shared only to a kitchen they are not in", async () => {
    const row = await getRecipeIfVisible(recipeId, userC);
    expect(row).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — visibility: public recipe
// ---------------------------------------------------------------------------
describe("recipe permissions — visibility (public)", () => {
  beforeAll(async () => {
    // Transition: make recipe public
    await testDb
      .update(schema.recipe)
      .set({ isPublic: true })
      .where(eq(schema.recipe.id, recipeId));
  });

  // 5. userC GET public → row
  it("outsider (userC) can see recipe once it is made public", async () => {
    const row = await getRecipeIfVisible(recipeId, userC);
    expect(row).not.toBeNull();
    expect(row!.id).toBe(recipeId);
  });
});

// ---------------------------------------------------------------------------
// Tests — edit ownership
// ---------------------------------------------------------------------------
describe("recipe permissions — edit ownership (PUT)", () => {
  // Recipe is currently public (from previous describe block transition).
  // Ownership check is independent of visibility state.

  // 6. userB PUT (non-owner) → 403
  it("non-owner (userB) updating a recipe returns 403", async () => {
    const result = await updateRecipeExecutor(recipeId, userB, { title: "Hijacked" });
    expect(result.status).toBe(403);
    expect((result.body as { error: string }).error).toBe("Only the recipe owner can edit");
  });

  // 7. userA PUT (owner) → 200
  it("owner (userA) updating their own recipe returns 200", async () => {
    const result = await updateRecipeExecutor(recipeId, userA, { title: "Updated Title" });
    expect(result.status).toBe(200);
    expect((result.body.recipe as { title: string }).title).toBe("Updated Title");
  });
});

// ---------------------------------------------------------------------------
// Tests — fork permissions
// ---------------------------------------------------------------------------
describe("recipe permissions — fork", () => {
  // At this point the recipe is public and shared to kitchen (userB is member).

  // 8. userB Fork shared → 201
  it("kitchen member (userB) can fork a recipe shared to their kitchen — 201", async () => {
    // Make private first to test kitchen-share path specifically
    await testDb
      .update(schema.recipe)
      .set({ isPublic: false })
      .where(eq(schema.recipe.id, recipeId));

    const result = await forkRecipeExecutor(recipeId, userB);
    expect(result.status).toBe(201);
    expect((result.body.recipe as { id: string }).id).toBeTruthy();
  });

  // 9. userC Fork private (not member) → 403
  it("outsider (userC) forking a private non-shared recipe returns 403", async () => {
    // Recipe is already private from above
    const result = await forkRecipeExecutor(recipeId, userC);
    expect(result.status).toBe(403);
    expect((result.body as { error: string }).error).toBe(
      "You do not have permission to fork this recipe",
    );
  });

  // 10. userC Fork public → 201
  it("outsider (userC) can fork a public recipe — 201", async () => {
    await testDb
      .update(schema.recipe)
      .set({ isPublic: true })
      .where(eq(schema.recipe.id, recipeId));

    const result = await forkRecipeExecutor(recipeId, userC);
    expect(result.status).toBe(201);
    expect((result.body.recipe as { id: string }).id).toBeTruthy();
  });
});
