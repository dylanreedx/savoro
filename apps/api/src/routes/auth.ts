import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { ApiError } from '../errors'
import { verifyAppleIdentityToken } from '../lib/apple'
import { createSessionForAppleUser } from '../repo/sessions'

export const auth = new Hono<AppEnv>()

auth.post('/apple', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { identityToken?: unknown } | null
  if (!body || typeof body.identityToken !== 'string' || body.identityToken.length === 0) {
    throw new ApiError('validation_failed', 'identityToken must be a string.')
  }

  if (!c.env.APPLE_BUNDLE_ID) {
    throw new ApiError('internal', 'Apple bundle id is not configured.')
  }

  const verifier = c.env.APPLE_IDENTITY_VERIFIER ?? verifyAppleIdentityToken
  let claims: { sub: string; email: string }
  try {
    claims = await verifier(body.identityToken, c.env.APPLE_BUNDLE_ID)
  } catch {
    throw new ApiError('unauthorized', 'Invalid or expired Apple identity token.')
  }

  const result = await createSessionForAppleUser(createDb(c.env.DB), claims)
  return c.json(result)
})
