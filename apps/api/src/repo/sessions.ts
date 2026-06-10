import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Db } from '../db/client'
import { sessions } from '../db/schema'
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
