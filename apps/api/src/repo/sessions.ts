import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Db } from '../db/client'
import { sessions, users } from '../db/schema'
import { hashToken } from '../token'

/** Resolves a bearer token to a userId, or null when invalid/expired/revoked. */
export async function findUserIdByToken(db: Db, token: string): Promise<string | null> {
  const tokenHash = await hashToken(token)
  const now = new Date().toISOString()
  const row = await db.query.sessions.findFirst({
    where: and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)),
    columns: { userId: true },
  })
  return row?.userId ?? null
}

export async function createSessionForAppleUser(db: Db, claims: { sub: string; email: string }) {
  const now = new Date()
  const nowIso = now.toISOString()
  const existing = await db.query.users.findFirst({ where: eq(users.appleSub, claims.sub) })
  const user = existing ?? {
    id: `usr_${crypto.randomUUID()}`,
    email: claims.email,
    appleSub: claims.sub,
    displayName: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  if (existing) {
    await db.update(users).set({ email: claims.email, updatedAt: nowIso }).where(eq(users.id, existing.id))
    user.email = claims.email
    user.updatedAt = nowIso
  } else {
    await db.insert(users).values(user)
  }

  const sessionToken = generateSessionToken()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await db.insert(sessions).values({
    id: `ses_${crypto.randomUUID()}`,
    userId: user.id,
    tokenHash: await hashToken(sessionToken),
    expiresAt,
    createdAt: nowIso,
    lastUsedAt: null,
    revokedAt: null,
  })

  return {
    sessionToken,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  }
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}
