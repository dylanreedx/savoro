import { createMiddleware } from "hono/factory";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@savoro/db";
import { session, user, type User } from "@savoro/db";
import { hashSessionToken, shouldExtendSession, sessionExpiresAt } from "../lib/auth";

export type AuthEnv = {
  Variables: {
    user: User;
    sessionId: string;
  };
};

export type OptionalAuthEnv = {
  Variables: {
    user: User | null;
    sessionId: string | null;
  };
};

/** Resolves user from token if present, but doesn't reject if missing */
export const optionalAuth = createMiddleware<OptionalAuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    c.set("user", null);
    c.set("sessionId", null);
    return next();
  }

  const token = authHeader.slice(7);
  const sessionId = hashSessionToken(token);

  const result = await db
    .select({ session: session, user: user })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(and(eq(session.id, sessionId), gt(session.expiresAt, new Date())))
    .get();

  if (result) {
    c.set("user", result.user);
    c.set("sessionId", sessionId);
  } else {
    c.set("user", null);
    c.set("sessionId", null);
  }
  await next();
});

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const sessionId = hashSessionToken(token);

  const result = await db
    .select({
      session: session,
      user: user,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(and(eq(session.id, sessionId), gt(session.expiresAt, new Date())))
    .get();

  if (!result) {
    // Clean up expired sessions for this token
    await db.delete(session).where(eq(session.id, sessionId));
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  // Auto-extend session within 15 days of expiry
  if (shouldExtendSession(result.session.expiresAt)) {
    await db
      .update(session)
      .set({ expiresAt: sessionExpiresAt() })
      .where(eq(session.id, sessionId));
  }

  c.set("user", result.user);
  c.set("sessionId", sessionId);
  await next();
});
