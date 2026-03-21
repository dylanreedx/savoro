/**
 * Integration test — Recipe visibility full flow.
 *
 * Sequential workflow:
 *  1. userA creates a private recipe — invisible to userB
 *  2. userA shares it to a kitchen that both belong to
 *  3. getKitchenRecipes shows the recipe to userB
 *  4. userB forks — recipeFork provenance created, forkCount incremented to 1
 *  5. userA makes recipe public — getFeedRecipes includes it
 *  6. userA makes recipe private again — getFeedRecipes excludes it
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, sql } from "drizzle-orm";
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

/** Replicates POST /:id/share logic — owner-only, membership-checked */
async function shareRecipeExecutor(
  recipeId: string,
  callerId: string,
  kitchenId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { recipe, kitchenMember, recipeShare } = schema;

  const row = await testDb
    .select({ id: recipe.id, userId: recipe.userId })
    .from(recipe)
    .where(eq(recipe.id, recipeId))
    .get();

  if (!row) return { status: 404, body: { error: "Recipe not found" } };
  if (row.userId !== callerId) return { status: 403, body: { error: "Only the recipe owner can share it" } };

  const membership = await testDb
    .select({ id: kitchenMember.id })
    .from(kitchenMember)
    .where(and(eq(kitchenMember.kitchenId, kitchenId), eq(kitchenMember.userId, callerId)))
    .get();

  if (!membership) return { status: 400, body: { error: "You are not a member of this kitchen" } };

  const existing = await testDb
    .select({ id: recipeShare.id })
    .from(recipeShare)
    .where(and(eq(recipeShare.recipeId, recipeId), eq(recipeShare.sharedToKitchenId, kitchenId)))
    .get();

  if (existing) return { status: 200, body: { share: { id: existing.id }, duplicate: true } };

  const now = new Date().toISOString();
  const shareId = createId();
  await testDb.insert(recipeShare).values({
    id: shareId,
    recipeId,
    sharedBy: callerId,
    sharedToUserId: null,
    sharedToKitchenId: kitchenId,
    message: null,
    createdAt: now,
    updatedAt: now,
  });

  return { status: 201, body: { share: { id: shareId } } };
}

/**
 * Merged forkRecipeExecutor: combines kitchen-member visibility check with
 * full provenance logic (recipeFork insert + forkCount increment).
 */
async function forkRecipeExecutor(
  originalId: string,
  callerId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { recipe, recipeShare, kitchenMember, recipeFork } = schema;

  const original = await testDb
    .select()
    .from(recipe)
    .where(eq(recipe.id, originalId))
    .get();

  if (!original) return { status: 404, body: { error: "Recipe not found" } };
  if (original.userId === callerId) return { status: 400, body: { error: "Cannot fork your own recipe" } };

  // Check access: public OR shared to a kitchen the caller belongs to
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

  // Copy recipe
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

  // Create fork provenance record
  await testDb.insert(recipeFork).values({
    id: createId(),
    originalRecipeId: originalId,
    forkedRecipeId: forkedId,
    createdAt: now,
    updatedAt: now,
  });

  // Increment forkCount on original
  await testDb
    .update(recipe)
    .set({ forkCount: sql`${recipe.forkCount} + 1`, updatedAt: now })
    .where(eq(recipe.id, originalId));

  return { status: 201, body: { recipe: { id: forkedId } } };
}

/** Returns recipes visible to userId via kitchen membership (recipeShare joined to kitchenMember). */
async function getKitchenRecipes(
  kitchenId: string,
  userId: string,
): Promise<Array<typeof schema.recipe.$inferSelect>> {
  const { recipe, recipeShare, kitchenMember } = schema;

  // Confirm caller is a member of this kitchen
  const membership = await testDb
    .select({ id: kitchenMember.id })
    .from(kitchenMember)
    .where(and(eq(kitchenMember.kitchenId, kitchenId), eq(kitchenMember.userId, userId)))
    .get();

  if (!membership) return [];

  return testDb
    .select({ recipe })
    .from(recipeShare)
    .innerJoin(recipe, eq(recipe.id, recipeShare.recipeId))
    .where(eq(recipeShare.sharedToKitchenId, kitchenId))
    .all()
    .then((rows) => rows.map((r) => r.recipe));
}

/** Returns all public recipes (feed). */
async function getFeedRecipes(): Promise<Array<typeof schema.recipe.$inferSelect>> {
  return testDb
    .select()
    .from(schema.recipe)
    .where(eq(schema.recipe.isPublic, true))
    .all();
}

// ---------------------------------------------------------------------------
// Shared workflow state (describe scope)
// ---------------------------------------------------------------------------
let userA: string;
let userB: string;
let kitchenId: string;
let recipeId: string;
let forkedId: string;

// ---------------------------------------------------------------------------
// Full visibility flow — sequential steps
// ---------------------------------------------------------------------------
describe("recipe visibility full flow", () => {
  beforeAll(async () => {
    userA = await insertUser("flow-userA");
    userB = await insertUser("flow-userB");
    kitchenId = await insertKitchen(userA);
    await addKitchenMember(kitchenId, userB);
    recipeId = await insertRecipe(userA, { isPublic: false, title: "Flow Recipe" });
  });

  // Step 1: private recipe invisible to userB
  it("step 1: userA private recipe is not visible to userB via getKitchenRecipes (not yet shared)", async () => {
    const recipes = await getKitchenRecipes(kitchenId, userB);
    const found = recipes.find((r) => r.id === recipeId);
    expect(found).toBeUndefined();
  });

  // Step 2: userA shares recipe to kitchen
  it("step 2: userA shares recipe to kitchen — returns 201", async () => {
    const result = await shareRecipeExecutor(recipeId, userA, kitchenId);
    expect(result.status).toBe(201);
    expect((result.body.share as { id: string }).id).toBeTruthy();
  });

  // Step 3: userB can now see recipe via getKitchenRecipes
  it("step 3: userB sees recipe in kitchen after share", async () => {
    const recipes = await getKitchenRecipes(kitchenId, userB);
    const found = recipes.find((r) => r.id === recipeId);
    expect(found).toBeDefined();
    expect(found!.id).toBe(recipeId);
  });

  // Step 4: userB forks — provenance + forkCount
  it("step 4: userB forks shared recipe — 201, recipeFork provenance exists, forkCount=1", async () => {
    const result = await forkRecipeExecutor(recipeId, userB);
    expect(result.status).toBe(201);
    forkedId = (result.body as { recipe: { id: string } }).recipe.id;
    expect(forkedId).toBeTruthy();
    expect(forkedId).not.toBe(recipeId);

    // Verify provenance record
    const forkRecord = await testDb
      .select()
      .from(schema.recipeFork)
      .where(eq(schema.recipeFork.originalRecipeId, recipeId))
      .get();
    expect(forkRecord).toBeDefined();
    expect(forkRecord!.originalRecipeId).toBe(recipeId);
    expect(forkRecord!.forkedRecipeId).toBe(forkedId);

    // Verify forkCount incremented
    const original = await testDb
      .select({ forkCount: schema.recipe.forkCount })
      .from(schema.recipe)
      .where(eq(schema.recipe.id, recipeId))
      .get();
    expect(original!.forkCount).toBe(1);
  });

  // Step 5: forked recipe belongs to userB and starts private
  it("step 4b: forked recipe belongs to userB and is private", async () => {
    const forked = await testDb
      .select()
      .from(schema.recipe)
      .where(eq(schema.recipe.id, forkedId))
      .get();
    expect(forked).toBeDefined();
    expect(forked!.userId).toBe(userB);
    expect(forked!.isPublic).toBe(false);
  });

  // Step 6: userA makes original recipe public — appears in feed
  it("step 5: after making public, recipe appears in getFeedRecipes", async () => {
    await testDb
      .update(schema.recipe)
      .set({ isPublic: true })
      .where(eq(schema.recipe.id, recipeId));

    const feed = await getFeedRecipes();
    const found = feed.find((r) => r.id === recipeId);
    expect(found).toBeDefined();
    expect(found!.isPublic).toBe(true);
  });

  // Step 7: userA makes recipe private again — excluded from feed
  it("step 6: after making private, recipe no longer in getFeedRecipes", async () => {
    await testDb
      .update(schema.recipe)
      .set({ isPublic: false })
      .where(eq(schema.recipe.id, recipeId));

    const feed = await getFeedRecipes();
    const found = feed.find((r) => r.id === recipeId);
    expect(found).toBeUndefined();
  });
});
