import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@savoro/db";
import { user, session } from "@savoro/db";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  sessionExpiresAt,
} from "../lib/auth";
import { verifyAppleIdentityToken } from "../lib/apple";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const auth = new Hono<AuthEnv>();

// Fields safe to return to the client (omits passwordHash)
const publicUserFields = {
  id: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  isPublic: user.isPublic,
  appleId: user.appleId,
  isApplePrivateEmail: user.isApplePrivateEmail,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
} as const;

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------
auth.post("/register", async (c) => {
  const body = await c.req.json<{
    email?: string;
    username?: string;
    password?: string;
  }>();

  const { email, username, password } = body;

  if (!email || !username || !password) {
    return c.json({ error: "Email, username, and password are required" }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
    return c.json(
      { error: "Username must be 3-30 characters, lowercase alphanumeric, hyphens, or underscores" },
      400
    );
  }

  // Check existing user
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .get();

  if (existing) {
    return c.json({ error: "Email already registered" }, 400);
  }

  const existingUsername = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .get();

  if (existingUsername) {
    return c.json({ error: "Username already taken" }, 400);
  }

  const passwordHash = await hashPassword(password);
  const userId = createId();

  await db.insert(user).values({
    id: userId,
    email,
    username,
    passwordHash,
  });

  // Create session
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);

  await db.insert(session).values({
    id: sessionId,
    userId,
    expiresAt: sessionExpiresAt(),
  });

  const newUser = await db.select(publicUserFields).from(user).where(eq(user.id, userId)).get();
  return c.json({ token, user: newUser }, 201);
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
auth.post("/login", async (c) => {
  const body = await c.req.json<{
    email?: string;
    password?: string;
  }>();

  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .get();

  if (!existingUser || !existingUser.passwordHash || !(await verifyPassword(existingUser.passwordHash, password))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);

  await db.insert(session).values({
    id: sessionId,
    userId: existingUser.id,
    expiresAt: sessionExpiresAt(),
  });

  const loginUser = await db.select(publicUserFields).from(user).where(eq(user.id, existingUser.id)).get();
  return c.json({ token, user: loginUser });
});

// ---------------------------------------------------------------------------
// POST /auth/apple
// ---------------------------------------------------------------------------
auth.post("/apple", async (c) => {
  const body = await c.req.json<{
    identityToken?: string;
    fullName?: { givenName?: string; familyName?: string } | null;
  }>();

  const { identityToken, fullName } = body;

  if (!identityToken) {
    return c.json({ error: "identityToken is required" }, 400);
  }

  const bundleId = process.env.APPLE_BUNDLE_ID ?? "com.savoro.app";

  let claims;
  try {
    claims = await verifyAppleIdentityToken(identityToken, bundleId);
  } catch (err) {
    console.error("Apple token verification failed:", err);
    return c.json({ error: "Invalid Apple identity token" }, 401);
  }

  const { sub: appleId, email, is_private_email } = claims;
  const isPrivateEmail =
    is_private_email === true ||
    is_private_email === "true";

  // 1. Check if user already linked with this Apple ID
  let existingUser = await db
    .select()
    .from(user)
    .where(eq(user.appleId, appleId))
    .get();

  // 2. If not linked by Apple ID, check by email to link existing account
  if (!existingUser) {
    existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .get();

    if (existingUser) {
      // Link Apple credentials to existing account
      await db
        .update(user)
        .set({
          appleId,
          isApplePrivateEmail: isPrivateEmail,
        })
        .where(eq(user.id, existingUser.id));
    }
  }

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // 3. Create new account from Apple credentials
    userId = createId();

    // Generate a unique username from Apple name or email prefix
    const baseName =
      fullName?.givenName
        ? `${fullName.givenName}${fullName.familyName ? fullName.familyName : ""}`.toLowerCase().replace(/[^a-z0-9_-]/g, "")
        : email.split("@")[0].replace(/[^a-z0-9_-]/g, "");

    // Ensure uniqueness by appending random suffix
    let username = baseName.slice(0, 24);
    const existingUsername = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, username))
      .get();

    if (existingUsername) {
      const suffix = createId().slice(0, 6);
      username = `${username.slice(0, 23)}-${suffix}`;
    }

    // Ensure username is at least 3 chars
    if (username.length < 3) {
      username = `user-${createId().slice(0, 6)}`;
    }

    const displayName =
      fullName?.givenName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(" ")
        : undefined;

    await db.insert(user).values({
      id: userId,
      email,
      username,
      displayName,
      passwordHash: null,
      appleId,
      isApplePrivateEmail: isPrivateEmail,
    });
  }

  // Create session
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);

  await db.insert(session).values({
    id: sessionId,
    userId,
    expiresAt: sessionExpiresAt(),
  });

  const authUser = await db.select(publicUserFields).from(user).where(eq(user.id, userId)).get();
  return c.json({ token, user: authUser });
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------
auth.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  const me = await db.select(publicUserFields).from(user).where(eq(user.id, userId)).get();

  if (!me) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(me);
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
auth.post("/logout", requireAuth, async (c) => {
  const sessionId = c.get("sessionId");
  await db.delete(session).where(eq(session.id, sessionId));
  return c.json({ success: true });
});

export default auth;
