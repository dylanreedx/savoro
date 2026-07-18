import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import { listPublicRecipes } from '../repo/recipes'
import { mapRecipePage, parseRecipeListOptions } from './recipe-list'

type DiscoverRail = 'featured' | 'recent' | 'trending'

export const discover = new Hono<AppEnv>()

discover.use('*', requireAuth)

discover.get('/recipes', async (c) => {
  parseRail(c.req.query('rail'))
  const userId = c.get('userId')

  // Featured and trending intentionally use recent publication ordering for
  // now. There is no engagement data yet, so do not imply a fabricated score.
  const page = await listPublicRecipes(
    createDb(c.env.DB),
    userId,
    parseRecipeListOptions(c.req.query('limit'), c.req.query('cursor')),
  )
  return c.json(mapRecipePage(page, userId))
})

function parseRail(value: string | undefined): DiscoverRail {
  if (value !== 'featured' && value !== 'recent' && value !== 'trending') {
    throw new ApiError('validation_failed', 'rail must be featured, recent, or trending.')
  }
  return value
}
