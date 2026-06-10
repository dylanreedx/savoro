import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { errorResponse } from '../errors'
import { findUserIdByToken } from '../repo/sessions'

/**
 * Resolves the session user and stores it in context. Routes must read the
 * user from here only — client-supplied userIds are never trusted.
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return errorResponse(c, 'unauthorized', 'Missing bearer token.')
  }
  const userId = await findUserIdByToken(createDb(c.env.DB), header.slice('Bearer '.length))
  if (!userId) {
    return errorResponse(c, 'unauthorized', 'Invalid or expired session token.')
  }
  c.set('userId', userId)
  await next()
}
