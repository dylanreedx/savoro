import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  db,
  kitchen,
  kitchenMember,
  kitchenInvite,
  recipeShare,
  kitchenActivity,
  recipe,
  user,
} from "@savoro/db";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const kitchenRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getMember(kitchenId: string, userId: string) {
  return db
    .select()
    .from(kitchenMember)
    .where(and(eq(kitchenMember.kitchenId, kitchenId), eq(kitchenMember.userId, userId)))
    .get();
}

async function logActivity(
  kitchenId: string,
  userId: string,
  action: string,
  metadata?: Record<string, unknown>,
) {
  try {
    const now = new Date().toISOString();
    await db.insert(kitchenActivity).values({
      id: createId(),
      kitchenId,
      userId,
      action,
      metadata: metadata ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    // best-effort, swallow errors
  }
}

// ---------------------------------------------------------------------------
// POST /kitchen — create kitchen, creator is owner
// ---------------------------------------------------------------------------
kitchenRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{ name: string; description?: string; imageUrl?: string }>();

  if (!body.name?.trim()) {
    return c.json({ error: "name is required" }, 400);
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

  await db.insert(kitchen).values(newKitchen);

  // Add creator as owner member
  await db.insert(kitchenMember).values({
    id: createId(),
    kitchenId,
    userId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  await logActivity(kitchenId, userId, "kitchen_created", { name: body.name });

  return c.json({ kitchen: newKitchen }, 201);
});

// ---------------------------------------------------------------------------
// POST /kitchen/invite/accept — accept invite by code
// MUST be registered before GET /:id to avoid Hono matching "invite" as :id
// ---------------------------------------------------------------------------
kitchenRoutes.post("/invite/accept", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{ code: string }>();

  if (!body.code) {
    return c.json({ error: "code is required" }, 400);
  }

  const invite = await db
    .select()
    .from(kitchenInvite)
    .where(eq(kitchenInvite.id, body.code))
    .get();

  if (!invite) {
    return c.json({ error: "Invalid invite code" }, 404);
  }

  if (invite.status !== "pending") {
    return c.json({ error: "Invite is no longer valid" }, 400);
  }

  if (invite.expiresAt && invite.expiresAt < new Date().toISOString()) {
    return c.json({ error: "Invite has expired" }, 400);
  }

  // Check if already a member
  const existing = await getMember(invite.kitchenId, userId);
  if (existing) {
    return c.json({ error: "Already a member of this kitchen" }, 400);
  }

  const now = new Date().toISOString();

  // Add member
  await db.insert(kitchenMember).values({
    id: createId(),
    kitchenId: invite.kitchenId,
    userId,
    role: "member",
    createdAt: now,
    updatedAt: now,
  });

  // Mark invite accepted
  await db
    .update(kitchenInvite)
    .set({ status: "accepted", invitedUserId: userId, updatedAt: now })
    .where(eq(kitchenInvite.id, invite.id));

  await logActivity(invite.kitchenId, userId, "member_joined", { inviteId: invite.id });

  return c.json({ joined: true, kitchenId: invite.kitchenId });
});

// ---------------------------------------------------------------------------
// GET /kitchen — list user's kitchens (as member)
// ---------------------------------------------------------------------------
kitchenRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("user").id;

  const memberships = await db
    .select({
      id: kitchen.id,
      name: kitchen.name,
      description: kitchen.description,
      imageUrl: kitchen.imageUrl,
      ownerId: kitchen.ownerId,
      createdAt: kitchen.createdAt,
      role: kitchenMember.role,
    })
    .from(kitchenMember)
    .innerJoin(kitchen, eq(kitchenMember.kitchenId, kitchen.id))
    .where(eq(kitchenMember.userId, userId))
    .orderBy(desc(kitchen.createdAt))
    .all();

  return c.json({ kitchens: memberships });
});

// ---------------------------------------------------------------------------
// GET /kitchen/:id — kitchen detail + members + shared recipes
// ---------------------------------------------------------------------------
kitchenRoutes.get("/:id", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const kitchenId = c.req.param("id");

  const member = await getMember(kitchenId, userId);
  if (!member) {
    return c.json({ error: "Kitchen not found or access denied" }, 404);
  }

  const [kitchenData, members, sharedRecipes] = await Promise.all([
    db.select().from(kitchen).where(eq(kitchen.id, kitchenId)).get(),
    db
      .select({
        id: kitchenMember.id,
        userId: kitchenMember.userId,
        role: kitchenMember.role,
        joinedAt: kitchenMember.createdAt,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      })
      .from(kitchenMember)
      .innerJoin(user, eq(kitchenMember.userId, user.id))
      .where(eq(kitchenMember.kitchenId, kitchenId))
      .all(),
    db
      .select({
        id: recipeShare.id,
        recipeId: recipeShare.recipeId,
        sharedBy: recipeShare.sharedBy,
        message: recipeShare.message,
        sharedAt: recipeShare.createdAt,
        recipeTitle: recipe.title,
      })
      .from(recipeShare)
      .innerJoin(recipe, eq(recipeShare.recipeId, recipe.id))
      .where(eq(recipeShare.sharedToKitchenId, kitchenId))
      .orderBy(desc(recipeShare.createdAt))
      .limit(20)
      .all(),
  ]);

  if (!kitchenData) {
    return c.json({ error: "Kitchen not found" }, 404);
  }

  return c.json({ kitchen: kitchenData, members, sharedRecipes });
});

// ---------------------------------------------------------------------------
// POST /kitchen/:id/invite — invite by email, generate code
// ---------------------------------------------------------------------------
kitchenRoutes.post("/:id/invite", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const kitchenId = c.req.param("id");
  const body = await c.req.json<{ email: string; userId?: string }>();

  if (!body.email) {
    return c.json({ error: "email is required" }, 400);
  }

  const member = await getMember(kitchenId, userId);
  if (!member) {
    return c.json({ error: "Kitchen not found or access denied" }, 404);
  }

  // Look up invited user by email if userId not provided
  let invitedUserId = body.userId ?? null;
  if (!invitedUserId) {
    const invitedUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, body.email))
      .get();
    invitedUserId = invitedUser?.id ?? null;
  }

  // Check if already a member
  if (invitedUserId) {
    const alreadyMember = await getMember(kitchenId, invitedUserId);
    if (alreadyMember) {
      return c.json({ error: "User is already a member" }, 400);
    }

    // Check for existing pending invite for this user
    const existingInvite = await db
      .select()
      .from(kitchenInvite)
      .where(
        and(
          eq(kitchenInvite.kitchenId, kitchenId),
          eq(kitchenInvite.invitedUserId, invitedUserId),
          eq(kitchenInvite.status, "pending"),
        ),
      )
      .get();

    if (existingInvite) {
      return c.json({ invite: existingInvite });
    }
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const newInvite = {
    id: createId(),
    kitchenId,
    invitedBy: userId,
    invitedUserId,
    email: body.email,
    status: "pending" as const,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(kitchenInvite).values(newInvite);
  await logActivity(kitchenId, userId, "member_invited", { email: body.email });

  return c.json({ invite: newInvite }, 201);
});

// ---------------------------------------------------------------------------
// DELETE /kitchen/:id/member/:userId — remove member (owner only) or leave (self)
// ---------------------------------------------------------------------------
kitchenRoutes.delete("/:id/member/:userId", requireAuth, async (c) => {
  const callerId = c.get("user").id;
  const kitchenId = c.req.param("id");
  const targetUserId = c.req.param("userId");

  const callerMember = await getMember(kitchenId, callerId);
  if (!callerMember) {
    return c.json({ error: "Kitchen not found or access denied" }, 404);
  }

  const targetMember = await getMember(kitchenId, targetUserId);
  if (!targetMember) {
    return c.json({ error: "Member not found" }, 404);
  }

  // Check if target is the owner
  const kitchenData = await db.select().from(kitchen).where(eq(kitchen.id, kitchenId)).get();
  if (kitchenData?.ownerId === targetUserId) {
    return c.json({ error: "Owner cannot be removed from the kitchen" }, 400);
  }

  // Caller must be owner/admin to remove others; anyone can remove themselves
  if (callerId !== targetUserId && callerMember.role !== "owner" && callerMember.role !== "admin") {
    return c.json({ error: "Only owners or admins can remove members" }, 403);
  }

  await db
    .delete(kitchenMember)
    .where(and(eq(kitchenMember.kitchenId, kitchenId), eq(kitchenMember.userId, targetUserId)));

  const action = callerId === targetUserId ? "member_left" : "member_removed";
  await logActivity(kitchenId, callerId, action, { targetUserId });

  return c.json({ removed: true });
});

// ---------------------------------------------------------------------------
// POST /kitchen/:id/share — share recipe to kitchen
// ---------------------------------------------------------------------------
kitchenRoutes.post("/:id/share", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const kitchenId = c.req.param("id");
  const body = await c.req.json<{ recipeId: string; message?: string }>();

  if (!body.recipeId) {
    return c.json({ error: "recipeId is required" }, 400);
  }

  const member = await getMember(kitchenId, userId);
  if (!member) {
    return c.json({ error: "Kitchen not found or access denied" }, 404);
  }

  // Validate recipe exists
  const recipeData = await db
    .select({ id: recipe.id })
    .from(recipe)
    .where(eq(recipe.id, body.recipeId))
    .get();

  if (!recipeData) {
    return c.json({ error: "Recipe not found" }, 404);
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

  await db.insert(recipeShare).values(newShare);
  await logActivity(kitchenId, userId, "recipe_shared", { recipeId: body.recipeId });

  return c.json({ share: newShare }, 201);
});

// ---------------------------------------------------------------------------
// GET /kitchen/:id/recipes — list shared recipes
// ---------------------------------------------------------------------------
kitchenRoutes.get("/:id/recipes", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const kitchenId = c.req.param("id");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 50);

  const member = await getMember(kitchenId, userId);
  if (!member) {
    return c.json({ error: "Kitchen not found or access denied" }, 404);
  }

  const recipes = await db
    .select({
      id: recipeShare.id,
      recipeId: recipeShare.recipeId,
      sharedBy: recipeShare.sharedBy,
      message: recipeShare.message,
      sharedAt: recipeShare.createdAt,
      recipeTitle: recipe.title,
      recipeDescription: recipe.description,
      recipeImageUrl: recipe.imageUrl,
    })
    .from(recipeShare)
    .innerJoin(recipe, eq(recipeShare.recipeId, recipe.id))
    .where(eq(recipeShare.sharedToKitchenId, kitchenId))
    .orderBy(desc(recipeShare.createdAt))
    .limit(limit)
    .all();

  return c.json({ recipes });
});

// ---------------------------------------------------------------------------
// GET /kitchen/:id/activity — activity feed
// ---------------------------------------------------------------------------
kitchenRoutes.get("/:id/activity", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const kitchenId = c.req.param("id");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 50);

  const member = await getMember(kitchenId, userId);
  if (!member) {
    return c.json({ error: "Kitchen not found or access denied" }, 404);
  }

  const activities = await db
    .select({
      id: kitchenActivity.id,
      action: kitchenActivity.action,
      metadata: kitchenActivity.metadata,
      createdAt: kitchenActivity.createdAt,
      userId: kitchenActivity.userId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })
    .from(kitchenActivity)
    .innerJoin(user, eq(kitchenActivity.userId, user.id))
    .where(eq(kitchenActivity.kitchenId, kitchenId))
    .orderBy(desc(kitchenActivity.createdAt))
    .limit(limit)
    .all();

  return c.json({ activities });
});

export default kitchenRoutes;
