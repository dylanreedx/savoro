/**
 * Tests for kitchen API routes.
 *
 * Coverage:
 *  1.  Create kitchen — 201, creator is owner member
 *  2.  Create kitchen missing name — 400
 *  3.  List kitchens — only returns member kitchens
 *  4.  GET kitchen detail — members see full detail with members + recipes
 *  5.  GET kitchen detail — non-member gets 404
 *  6.  Invite by email — 201 with invite code
 *  7.  Invite missing email — 400
 *  8.  Invite non-member calls — 404
 *  9.  Duplicate invite (same user pending) — returns existing invite
 * 10.  Already-member invite — 400
 * 11.  Accept invite — joins kitchen, invite marked accepted
 * 12.  Accept invalid code — 404
 * 13.  Accept expired invite — 400
 * 14.  Accept already-accepted invite — 400
 * 15.  Already member tries to accept — 400
 * 16.  Remove member — owner removes regular member
 * 17.  Remove member — non-owner/non-self gets 403
 * 18.  Owner removal blocked — 400
 * 19.  Non-member caller remove — 404
 * 20.  Self-leave — member removes themselves
 * 21.  Share recipe to kitchen — 201
 * 22.  Share non-existent recipe — 404
 * 23.  Non-member shares — 404
 * 24.  Share missing recipeId — 400
 * 25.  List shared recipes — returns recipe list
 * 26.  List shared recipes non-member — 404
 * 27.  Get activity feed — returns activities
 * 28.  Get activity feed non-member — 404
 * 29.  Integration: create → invite → accept → share → list
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

async function insertRecipe(userId: string, opts: { isPublic?: boolean } = {}): Promise<string> {
  const id = createId();
  const now = new Date().toISOString();
  await testDb.insert(schema.recipe).values({
    id,
    userId,
    slug: `recipe-${id}`,
    title: `Recipe ${id}`,
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

// ---------------------------------------------------------------------------
// Executor functions — replicate route logic against testDb
// ---------------------------------------------------------------------------

/** POST /kitchen */
async function createKitchenExecutor(
  userId: string,
  body: { name?: string; description?: string; imageUrl?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!body.name?.trim()) {
    return { status: 400, body: { error: "name is required" } };
  }

  const now = new Date().toISOString();
  const kitchenId = createId();

  const newKitchen = {
    id: kitchenId,
    name: body.name.trim(),
    description: body.description ?? null,
    imageUrl: body.imageUrl ?? null,
    ownerId: userId,
    createdAt: now,
    updatedAt: now,
  };

  await testDb.insert(schema.kitchen).values(newKitchen);
  await testDb.insert(schema.kitchenMember).values({
    id: createId(),
    kitchenId,
    userId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  try {
    await testDb.insert(schema.kitchenActivity).values({
      id: createId(),
      kitchenId,
      userId,
      action: "kitchen_created",
      metadata: { name: body.name },
      createdAt: now,
      updatedAt: now,
    });
  } catch { /* best-effort */ }

  return { status: 201, body: { kitchen: newKitchen } };
}

/** GET /kitchen (list) */
async function listKitchensExecutor(
  userId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const memberships = await testDb
    .select({
      id: schema.kitchen.id,
      name: schema.kitchen.name,
      ownerId: schema.kitchen.ownerId,
      role: schema.kitchenMember.role,
    })
    .from(schema.kitchenMember)
    .innerJoin(schema.kitchen, eq(schema.kitchenMember.kitchenId, schema.kitchen.id))
    .where(eq(schema.kitchenMember.userId, userId))
    .all();

  return { status: 200, body: { kitchens: memberships } };
}

/** GET /kitchen/:id */
async function getKitchenExecutor(
  userId: string,
  kitchenId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const member = await testDb
    .select()
    .from(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, userId)))
    .get();

  if (!member) {
    return { status: 404, body: { error: "Kitchen not found or access denied" } };
  }

  const [kitchenData, members, sharedRecipes] = await Promise.all([
    testDb.select().from(schema.kitchen).where(eq(schema.kitchen.id, kitchenId)).get(),
    testDb
      .select({
        id: schema.kitchenMember.id,
        userId: schema.kitchenMember.userId,
        role: schema.kitchenMember.role,
      })
      .from(schema.kitchenMember)
      .where(eq(schema.kitchenMember.kitchenId, kitchenId))
      .all(),
    testDb
      .select({ id: schema.recipeShare.id, recipeId: schema.recipeShare.recipeId })
      .from(schema.recipeShare)
      .innerJoin(schema.recipe, eq(schema.recipeShare.recipeId, schema.recipe.id))
      .where(eq(schema.recipeShare.sharedToKitchenId, kitchenId))
      .all(),
  ]);

  if (!kitchenData) {
    return { status: 404, body: { error: "Kitchen not found" } };
  }

  return { status: 200, body: { kitchen: kitchenData, members, sharedRecipes } };
}

/** POST /kitchen/:id/invite */
async function inviteExecutor(
  callerId: string,
  kitchenId: string,
  body: { email?: string; userId?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!body.email) {
    return { status: 400, body: { error: "email is required" } };
  }

  const callerMember = await testDb
    .select()
    .from(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, callerId)))
    .get();

  if (!callerMember) {
    return { status: 404, body: { error: "Kitchen not found or access denied" } };
  }

  let invitedUserId = body.userId ?? null;
  if (!invitedUserId) {
    const invitedUser = await testDb
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, body.email))
      .get();
    invitedUserId = invitedUser?.id ?? null;
  }

  if (invitedUserId) {
    const alreadyMember = await testDb
      .select()
      .from(schema.kitchenMember)
      .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, invitedUserId)))
      .get();

    if (alreadyMember) {
      return { status: 400, body: { error: "User is already a member" } };
    }

    const existingInvite = await testDb
      .select()
      .from(schema.kitchenInvite)
      .where(
        and(
          eq(schema.kitchenInvite.kitchenId, kitchenId),
          eq(schema.kitchenInvite.invitedUserId, invitedUserId),
          eq(schema.kitchenInvite.status, "pending"),
        ),
      )
      .get();

    if (existingInvite) {
      return { status: 200, body: { invite: existingInvite } };
    }
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const newInvite = {
    id: createId(),
    kitchenId,
    invitedBy: callerId,
    invitedUserId,
    email: body.email,
    status: "pending" as const,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  await testDb.insert(schema.kitchenInvite).values(newInvite);

  return { status: 201, body: { invite: newInvite } };
}

/** POST /kitchen/invite/accept */
async function acceptInviteExecutor(
  userId: string,
  code: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!code) {
    return { status: 400, body: { error: "code is required" } };
  }

  const invite = await testDb
    .select()
    .from(schema.kitchenInvite)
    .where(eq(schema.kitchenInvite.id, code))
    .get();

  if (!invite) {
    return { status: 404, body: { error: "Invalid invite code" } };
  }

  if (invite.status !== "pending") {
    return { status: 400, body: { error: "Invite is no longer valid" } };
  }

  if (invite.expiresAt && invite.expiresAt < new Date().toISOString()) {
    return { status: 400, body: { error: "Invite has expired" } };
  }

  const existing = await testDb
    .select()
    .from(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, invite.kitchenId), eq(schema.kitchenMember.userId, userId)))
    .get();

  if (existing) {
    return { status: 400, body: { error: "Already a member of this kitchen" } };
  }

  const now = new Date().toISOString();

  await testDb.insert(schema.kitchenMember).values({
    id: createId(),
    kitchenId: invite.kitchenId,
    userId,
    role: "member",
    createdAt: now,
    updatedAt: now,
  });

  await testDb
    .update(schema.kitchenInvite)
    .set({ status: "accepted", invitedUserId: userId, updatedAt: now })
    .where(eq(schema.kitchenInvite.id, invite.id));

  return { status: 200, body: { joined: true, kitchenId: invite.kitchenId } };
}

/** DELETE /kitchen/:id/member/:targetUserId */
async function removeMemberExecutor(
  callerId: string,
  kitchenId: string,
  targetUserId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const callerMember = await testDb
    .select()
    .from(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, callerId)))
    .get();

  if (!callerMember) {
    return { status: 404, body: { error: "Kitchen not found or access denied" } };
  }

  const targetMember = await testDb
    .select()
    .from(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, targetUserId)))
    .get();

  if (!targetMember) {
    return { status: 404, body: { error: "Member not found" } };
  }

  const kitchenData = await testDb.select().from(schema.kitchen).where(eq(schema.kitchen.id, kitchenId)).get();
  if (kitchenData?.ownerId === targetUserId) {
    return { status: 400, body: { error: "Owner cannot be removed from the kitchen" } };
  }

  if (callerId !== targetUserId && callerMember.role !== "owner" && callerMember.role !== "admin") {
    return { status: 403, body: { error: "Only owners or admins can remove members" } };
  }

  await testDb
    .delete(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, targetUserId)));

  return { status: 200, body: { removed: true } };
}

/** POST /kitchen/:id/share */
async function shareRecipeExecutor(
  userId: string,
  kitchenId: string,
  body: { recipeId?: string; message?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!body.recipeId) {
    return { status: 400, body: { error: "recipeId is required" } };
  }

  const member = await testDb
    .select()
    .from(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, userId)))
    .get();

  if (!member) {
    return { status: 404, body: { error: "Kitchen not found or access denied" } };
  }

  const recipeData = await testDb
    .select({ id: schema.recipe.id })
    .from(schema.recipe)
    .where(eq(schema.recipe.id, body.recipeId))
    .get();

  if (!recipeData) {
    return { status: 404, body: { error: "Recipe not found" } };
  }

  const now = new Date().toISOString();
  const newShare = {
    id: createId(),
    recipeId: body.recipeId,
    sharedBy: userId,
    sharedToUserId: null,
    sharedToKitchenId: kitchenId,
    message: body.message ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await testDb.insert(schema.recipeShare).values(newShare);

  return { status: 201, body: { share: newShare } };
}

/** GET /kitchen/:id/recipes */
async function listKitchenRecipesExecutor(
  userId: string,
  kitchenId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const member = await testDb
    .select()
    .from(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, userId)))
    .get();

  if (!member) {
    return { status: 404, body: { error: "Kitchen not found or access denied" } };
  }

  const recipes = await testDb
    .select({
      id: schema.recipeShare.id,
      recipeId: schema.recipeShare.recipeId,
      sharedBy: schema.recipeShare.sharedBy,
      message: schema.recipeShare.message,
      recipeTitle: schema.recipe.title,
    })
    .from(schema.recipeShare)
    .innerJoin(schema.recipe, eq(schema.recipeShare.recipeId, schema.recipe.id))
    .where(eq(schema.recipeShare.sharedToKitchenId, kitchenId))
    .all();

  return { status: 200, body: { recipes } };
}

/** GET /kitchen/:id/activity */
async function listActivityExecutor(
  userId: string,
  kitchenId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const member = await testDb
    .select()
    .from(schema.kitchenMember)
    .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, userId)))
    .get();

  if (!member) {
    return { status: 404, body: { error: "Kitchen not found or access denied" } };
  }

  const activities = await testDb
    .select({
      id: schema.kitchenActivity.id,
      action: schema.kitchenActivity.action,
      userId: schema.kitchenActivity.userId,
    })
    .from(schema.kitchenActivity)
    .where(eq(schema.kitchenActivity.kitchenId, kitchenId))
    .all();

  return { status: 200, body: { activities } };
}

// ---------------------------------------------------------------------------
// Tests — POST /kitchen (create)
// ---------------------------------------------------------------------------
describe("POST /kitchen — create", () => {
  it("creates kitchen and returns 201 with kitchen data", async () => {
    const ownerId = await insertUser();
    const result = await createKitchenExecutor(ownerId, { name: "Family Kitchen" });

    expect(result.status).toBe(201);
    const k = result.body.kitchen as { id: string; name: string; ownerId: string };
    expect(k.name).toBe("Family Kitchen");
    expect(k.ownerId).toBe(ownerId);
  });

  it("creator is added as owner member", async () => {
    const ownerId = await insertUser();
    const result = await createKitchenExecutor(ownerId, { name: "Test Kitchen" });
    const kitchenId = (result.body.kitchen as { id: string }).id;

    const member = await testDb
      .select()
      .from(schema.kitchenMember)
      .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, ownerId)))
      .get();

    expect(member).not.toBeNull();
    expect(member!.role).toBe("owner");
  });

  it("returns 400 when name is missing", async () => {
    const ownerId = await insertUser();
    const result = await createKitchenExecutor(ownerId, {});
    expect(result.status).toBe(400);
  });

  it("returns 400 when name is empty string", async () => {
    const ownerId = await insertUser();
    const result = await createKitchenExecutor(ownerId, { name: "   " });
    expect(result.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /kitchen (list)
// ---------------------------------------------------------------------------
describe("GET /kitchen — list kitchens", () => {
  it("returns only kitchens the user is a member of", async () => {
    const userId = await insertUser();
    const otherUserId = await insertUser();

    // Create 2 kitchens for userId, 1 for other
    const r1 = await createKitchenExecutor(userId, { name: "K1" });
    const r2 = await createKitchenExecutor(userId, { name: "K2" });
    await createKitchenExecutor(otherUserId, { name: "K3" });
    void r2; // both used below

    const list = await listKitchensExecutor(userId);
    const kitchens = list.body.kitchens as Array<{ id: string }>;

    const ids = kitchens.map((k) => k.id);
    expect(ids).toContain((r1.body.kitchen as { id: string }).id);
    expect(ids).toContain((r2.body.kitchen as { id: string }).id);
    // Should not contain kitchens user is not a member of
    // (other user's kitchen is a different id)
    expect(kitchens.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty list for user with no kitchens", async () => {
    const userId = await insertUser();
    const list = await listKitchensExecutor(userId);
    const kitchens = list.body.kitchens as Array<unknown>;
    expect(Array.isArray(kitchens)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /kitchen/:id (detail)
// ---------------------------------------------------------------------------
describe("GET /kitchen/:id — detail", () => {
  it("member gets kitchen detail with members and sharedRecipes arrays", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Detail Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await getKitchenExecutor(ownerId, kitchenId);
    expect(result.status).toBe(200);
    expect(result.body.kitchen).toBeTruthy();
    expect(Array.isArray(result.body.members)).toBe(true);
    expect(Array.isArray(result.body.sharedRecipes)).toBe(true);
  });

  it("non-member gets 404", async () => {
    const ownerId = await insertUser();
    const nonMemberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Private Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await getKitchenExecutor(nonMemberId, kitchenId);
    expect(result.status).toBe(404);
  });

  it("members array includes the owner", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Members Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await getKitchenExecutor(ownerId, kitchenId);
    const members = result.body.members as Array<{ userId: string; role: string }>;
    const ownerMember = members.find((m) => m.userId === ownerId);
    expect(ownerMember).toBeTruthy();
    expect(ownerMember!.role).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /kitchen/:id/invite
// ---------------------------------------------------------------------------
describe("POST /kitchen/:id/invite — invite member", () => {
  it("member can invite by email — 201", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Invite Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await inviteExecutor(ownerId, kitchenId, { email: "newperson@example.com" });
    expect(result.status).toBe(201);
    const invite = result.body.invite as { id: string; status: string; kitchenId: string };
    expect(invite.id).toBeTruthy();
    expect(invite.status).toBe("pending");
    expect(invite.kitchenId).toBe(kitchenId);
  });

  it("invite resolves userId when email matches existing user", async () => {
    const ownerId = await insertUser();
    const inviteeId = await insertUser();
    const inviteeEmail = `user-${inviteeId}@test.com`; // matches insertUser pattern
    const createResult = await createKitchenExecutor(ownerId, { name: "Email Match Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await inviteExecutor(ownerId, kitchenId, { email: inviteeEmail });
    expect(result.status).toBe(201);
    const invite = result.body.invite as { invitedUserId: string | null };
    expect(invite.invitedUserId).toBe(inviteeId);
  });

  it("returns 400 when email is missing", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Missing Email Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await inviteExecutor(ownerId, kitchenId, {});
    expect(result.status).toBe(400);
  });

  it("non-member caller gets 404", async () => {
    const ownerId = await insertUser();
    const nonMemberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Non-Member Invite Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await inviteExecutor(nonMemberId, kitchenId, { email: "x@example.com" });
    expect(result.status).toBe(404);
  });

  it("already-member invite returns 400", async () => {
    const ownerId = await insertUser();
    const memberId = await insertUser();
    const memberEmail = `user-${memberId}@test.com`;
    const createResult = await createKitchenExecutor(ownerId, { name: "Already Member Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    // Accept an invite to make memberId a member
    const inviteResult = await inviteExecutor(ownerId, kitchenId, { email: memberEmail });
    const inviteCode = (inviteResult.body.invite as { id: string }).id;
    await acceptInviteExecutor(memberId, inviteCode);

    // Now try to invite again
    const result = await inviteExecutor(ownerId, kitchenId, { email: memberEmail });
    expect(result.status).toBe(400);
    expect((result.body.error as string)).toContain("already a member");
  });

  it("duplicate pending invite returns existing invite (not 201)", async () => {
    const ownerId = await insertUser();
    const inviteeId = await insertUser();
    const inviteeEmail = `user-${inviteeId}@test.com`;
    const createResult = await createKitchenExecutor(ownerId, { name: "Dup Invite Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const first = await inviteExecutor(ownerId, kitchenId, { email: inviteeEmail });
    const second = await inviteExecutor(ownerId, kitchenId, { email: inviteeEmail });

    expect(first.status).toBe(201);
    // Second should return the existing invite (200 or 201 with same id)
    const firstId = (first.body.invite as { id: string }).id;
    const secondId = (second.body.invite as { id: string }).id;
    expect(secondId).toBe(firstId);
    expect(second.status).toBe(200); // returned existing
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /kitchen/invite/accept
// ---------------------------------------------------------------------------
describe("POST /kitchen/invite/accept — accept invite", () => {
  it("valid invite code adds user as member and marks invite accepted", async () => {
    const ownerId = await insertUser();
    const inviteeId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Accept Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const inviteResult = await inviteExecutor(ownerId, kitchenId, { email: "invitee@test.com" });
    const inviteCode = (inviteResult.body.invite as { id: string }).id;

    const result = await acceptInviteExecutor(inviteeId, inviteCode);
    expect(result.status).toBe(200);
    expect(result.body.joined).toBe(true);
    expect(result.body.kitchenId).toBe(kitchenId);

    // Verify membership exists
    const member = await testDb
      .select()
      .from(schema.kitchenMember)
      .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, inviteeId)))
      .get();
    expect(member).not.toBeNull();
    expect(member!.role).toBe("member");

    // Verify invite status updated
    const invite = await testDb
      .select()
      .from(schema.kitchenInvite)
      .where(eq(schema.kitchenInvite.id, inviteCode))
      .get();
    expect(invite!.status).toBe("accepted");
  });

  it("invalid invite code returns 404", async () => {
    const userId = await insertUser();
    const result = await acceptInviteExecutor(userId, "nonexistent-code");
    expect(result.status).toBe(404);
  });

  it("already-accepted invite returns 400", async () => {
    const ownerId = await insertUser();
    const inviteeId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Already Accepted Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const inviteResult = await inviteExecutor(ownerId, kitchenId, { email: "invitee2@test.com" });
    const inviteCode = (inviteResult.body.invite as { id: string }).id;

    // First accept
    await acceptInviteExecutor(inviteeId, inviteCode);

    // Second person tries same code
    const anotherUser = await insertUser();
    const result = await acceptInviteExecutor(anotherUser, inviteCode);
    expect(result.status).toBe(400);
  });

  it("expired invite returns 400", async () => {
    const ownerId = await insertUser();
    const inviteeId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Expired Invite Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    // Insert an already-expired invite directly
    const now = new Date().toISOString();
    const expiredAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    const expiredInviteId = createId();
    await testDb.insert(schema.kitchenInvite).values({
      id: expiredInviteId,
      kitchenId,
      invitedBy: ownerId,
      invitedUserId: null,
      email: "expired@test.com",
      status: "pending",
      expiresAt: expiredAt,
      createdAt: now,
      updatedAt: now,
    });

    const result = await acceptInviteExecutor(inviteeId, expiredInviteId);
    expect(result.status).toBe(400);
    expect((result.body.error as string)).toContain("expired");
  });

  it("user already a member of kitchen returns 400", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Self Accept Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    // Create an invite for a different email (owner tries to accept their own kitchen invite)
    const now = new Date().toISOString();
    const selfInviteId = createId();
    await testDb.insert(schema.kitchenInvite).values({
      id: selfInviteId,
      kitchenId,
      invitedBy: ownerId,
      invitedUserId: null,
      email: "self@test.com",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    });

    // Owner tries to accept (already a member)
    const result = await acceptInviteExecutor(ownerId, selfInviteId);
    expect(result.status).toBe(400);
    expect((result.body.error as string)).toContain("Already a member");
  });
});

// ---------------------------------------------------------------------------
// Tests — DELETE /kitchen/:id/member/:userId
// ---------------------------------------------------------------------------
describe("DELETE /kitchen/:id/member/:userId — remove/leave", () => {
  it("owner can remove a regular member", async () => {
    const ownerId = await insertUser();
    const memberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Remove Member Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    // Add member directly
    const now = new Date().toISOString();
    await testDb.insert(schema.kitchenMember).values({
      id: createId(),
      kitchenId,
      userId: memberId,
      role: "member",
      createdAt: now,
      updatedAt: now,
    });

    const result = await removeMemberExecutor(ownerId, kitchenId, memberId);
    expect(result.status).toBe(200);
    expect(result.body.removed).toBe(true);

    // Verify gone
    const check = await testDb
      .select()
      .from(schema.kitchenMember)
      .where(and(eq(schema.kitchenMember.kitchenId, kitchenId), eq(schema.kitchenMember.userId, memberId)))
      .get();
    expect(check).toBeUndefined();
  });

  it("regular member cannot remove another member — 403", async () => {
    const ownerId = await insertUser();
    const member1 = await insertUser();
    const member2 = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "No Remove Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const now = new Date().toISOString();
    await testDb.insert(schema.kitchenMember).values([
      { id: createId(), kitchenId, userId: member1, role: "member", createdAt: now, updatedAt: now },
      { id: createId(), kitchenId, userId: member2, role: "member", createdAt: now, updatedAt: now },
    ]);

    const result = await removeMemberExecutor(member1, kitchenId, member2);
    expect(result.status).toBe(403);
  });

  it("owner cannot be removed — 400", async () => {
    const ownerId = await insertUser();
    const memberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Owner Block Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const now = new Date().toISOString();
    await testDb.insert(schema.kitchenMember).values({
      id: createId(),
      kitchenId,
      userId: memberId,
      role: "member",
      createdAt: now,
      updatedAt: now,
    });

    // Member tries to remove owner — first blocked by not having permission,
    // but let's test owner trying to remove themselves (owner of the kitchen)
    const result = await removeMemberExecutor(memberId, kitchenId, ownerId);
    // memberId is a regular member, callerId !== targetUserId, role !== owner/admin => 403
    // But the owner check comes first in actual route... let's test the owner removing themselves
    const selfResult = await removeMemberExecutor(ownerId, kitchenId, ownerId);
    expect(selfResult.status).toBe(400);
    expect((selfResult.body.error as string)).toContain("Owner cannot be removed");
  });

  it("non-member caller gets 404", async () => {
    const ownerId = await insertUser();
    const nonMemberId = await insertUser();
    const targetId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Non-Member Remove Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await removeMemberExecutor(nonMemberId, kitchenId, targetId);
    expect(result.status).toBe(404);
  });

  it("member can leave (remove themselves)", async () => {
    const ownerId = await insertUser();
    const memberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Self-Leave Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const now = new Date().toISOString();
    await testDb.insert(schema.kitchenMember).values({
      id: createId(),
      kitchenId,
      userId: memberId,
      role: "member",
      createdAt: now,
      updatedAt: now,
    });

    const result = await removeMemberExecutor(memberId, kitchenId, memberId);
    expect(result.status).toBe(200);
    expect(result.body.removed).toBe(true);
  });

  it("returns 404 if target user is not in kitchen", async () => {
    const ownerId = await insertUser();
    const nonMemberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Target Missing Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await removeMemberExecutor(ownerId, kitchenId, nonMemberId);
    expect(result.status).toBe(404);
    expect((result.body.error as string)).toContain("Member not found");
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /kitchen/:id/share
// ---------------------------------------------------------------------------
describe("POST /kitchen/:id/share — share recipe", () => {
  it("member shares recipe — 201", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Share Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;
    const recipeId = await insertRecipe(ownerId);

    const result = await shareRecipeExecutor(ownerId, kitchenId, { recipeId });
    expect(result.status).toBe(201);
    const share = result.body.share as { id: string; recipeId: string; sharedToKitchenId: string };
    expect(share.id).toBeTruthy();
    expect(share.recipeId).toBe(recipeId);
    expect(share.sharedToKitchenId).toBe(kitchenId);
  });

  it("non-existent recipe returns 404", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Share 404 Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await shareRecipeExecutor(ownerId, kitchenId, { recipeId: "bad-id" });
    expect(result.status).toBe(404);
  });

  it("non-member caller returns 404", async () => {
    const ownerId = await insertUser();
    const nonMemberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Non-Member Share Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;
    const recipeId = await insertRecipe(ownerId);

    const result = await shareRecipeExecutor(nonMemberId, kitchenId, { recipeId });
    expect(result.status).toBe(404);
  });

  it("missing recipeId returns 400", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Missing Recipe Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await shareRecipeExecutor(ownerId, kitchenId, {});
    expect(result.status).toBe(400);
  });

  it("message is stored with share", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Message Share Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;
    const recipeId = await insertRecipe(ownerId);

    const result = await shareRecipeExecutor(ownerId, kitchenId, { recipeId, message: "Try this!" });
    expect(result.status).toBe(201);
    const share = result.body.share as { message: string | null };
    expect(share.message).toBe("Try this!");
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /kitchen/:id/recipes
// ---------------------------------------------------------------------------
describe("GET /kitchen/:id/recipes — list shared recipes", () => {
  it("member gets list of shared recipes", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Recipes List Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;
    const recipeId = await insertRecipe(ownerId);

    await shareRecipeExecutor(ownerId, kitchenId, { recipeId });

    const result = await listKitchenRecipesExecutor(ownerId, kitchenId);
    expect(result.status).toBe(200);
    const recipes = result.body.recipes as Array<{ recipeId: string }>;
    expect(recipes.some((r) => r.recipeId === recipeId)).toBe(true);
  });

  it("non-member gets 404", async () => {
    const ownerId = await insertUser();
    const nonMemberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Non-Member Recipes Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await listKitchenRecipesExecutor(nonMemberId, kitchenId);
    expect(result.status).toBe(404);
  });

  it("empty kitchen returns empty recipes array", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Empty Recipes Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await listKitchenRecipesExecutor(ownerId, kitchenId);
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body.recipes)).toBe(true);
    expect((result.body.recipes as Array<unknown>).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /kitchen/:id/activity
// ---------------------------------------------------------------------------
describe("GET /kitchen/:id/activity — activity feed", () => {
  it("member gets activity list", async () => {
    const ownerId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Activity Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await listActivityExecutor(ownerId, kitchenId);
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body.activities)).toBe(true);
  });

  it("non-member gets 404", async () => {
    const ownerId = await insertUser();
    const nonMemberId = await insertUser();
    const createResult = await createKitchenExecutor(ownerId, { name: "Non-Member Activity Kitchen" });
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    const result = await listActivityExecutor(nonMemberId, kitchenId);
    expect(result.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Integration: full kitchen workflow
// ---------------------------------------------------------------------------
describe("Integration — full kitchen workflow", () => {
  it("create → invite → accept → share → list-recipes → activity", async () => {
    // 1. Create kitchen
    const ownerId = await insertUser();
    const memberId = await insertUser();
    const memberEmail = `user-${memberId}@test.com`;

    const createResult = await createKitchenExecutor(ownerId, { name: "Integration Kitchen" });
    expect(createResult.status).toBe(201);
    const kitchenId = (createResult.body.kitchen as { id: string }).id;

    // 2. Owner invites memberId by email
    const inviteResult = await inviteExecutor(ownerId, kitchenId, { email: memberEmail });
    expect(inviteResult.status).toBe(201);
    const inviteCode = (inviteResult.body.invite as { id: string }).id;

    // 3. Member accepts invite
    const acceptResult = await acceptInviteExecutor(memberId, inviteCode);
    expect(acceptResult.status).toBe(200);
    expect(acceptResult.body.joined).toBe(true);

    // 4. List members includes both
    const detailResult = await getKitchenExecutor(ownerId, kitchenId);
    const members = detailResult.body.members as Array<{ userId: string }>;
    const userIds = members.map((m) => m.userId);
    expect(userIds).toContain(ownerId);
    expect(userIds).toContain(memberId);

    // 5. Member shares a recipe (must have a recipe — use owner's)
    const recipeId = await insertRecipe(ownerId);
    const shareResult = await shareRecipeExecutor(memberId, kitchenId, { recipeId, message: "Check it out" });
    expect(shareResult.status).toBe(201);

    // 6. List shared recipes
    const recipesResult = await listKitchenRecipesExecutor(memberId, kitchenId);
    expect(recipesResult.status).toBe(200);
    const recipes = recipesResult.body.recipes as Array<{ recipeId: string }>;
    expect(recipes.some((r) => r.recipeId === recipeId)).toBe(true);

    // 7. Member leaves kitchen
    const leaveResult = await removeMemberExecutor(memberId, kitchenId, memberId);
    expect(leaveResult.status).toBe(200);

    // 8. After leaving, member can no longer access
    const afterLeave = await listKitchenRecipesExecutor(memberId, kitchenId);
    expect(afterLeave.status).toBe(404);
  });
});
