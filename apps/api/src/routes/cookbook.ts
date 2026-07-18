import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { mapRecipeSummary } from '../dto/recipes'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import {
  listDraftRecipes,
  listOwnedRecipes,
  listSavedRecipes,
  type RecipeListCursor,
  type RecipeListOptions,
  type RecipeSummaryPage,
} from '../repo/recipes'

export const cookbook = new Hono<AppEnv>()

cookbook.use('*', requireAuth)

cookbook.get('/mine', async (c) => {
  const userId = c.get('userId')
  const page = await listOwnedRecipes(createDb(c.env.DB), userId, parseListOptions(c.req.query('limit'), c.req.query('cursor')))
  return c.json(mapPage(page, userId))
})

cookbook.get('/saved', async (c) => {
  const userId = c.get('userId')
  const page = await listSavedRecipes(createDb(c.env.DB), userId, parseListOptions(c.req.query('limit'), c.req.query('cursor')))
  return c.json(mapPage(page, userId))
})

cookbook.get('/drafts', async (c) => {
  const userId = c.get('userId')
  const page = await listDraftRecipes(createDb(c.env.DB), userId, parseListOptions(c.req.query('limit'), c.req.query('cursor')))
  return c.json(mapPage(page, userId))
})

function mapPage(page: RecipeSummaryPage, viewerUserId: string) {
  return {
    items: page.items.map((rows) => mapRecipeSummary(rows, viewerUserId)),
    nextCursor: page.nextCursor === null ? null : encodeCursor(page.nextCursor),
  }
}

function parseListOptions(limitParam: string | undefined, cursorParam: string | undefined): RecipeListOptions {
  let limit = 20
  if (limitParam !== undefined) {
    if (!/^\d+$/.test(limitParam)) throw new ApiError('validation_failed', 'limit must be an integer from 1 to 50.')
    limit = Number(limitParam)
    if (limit < 1 || limit > 50) throw new ApiError('validation_failed', 'limit must be an integer from 1 to 50.')
  }
  return { limit, ...(cursorParam !== undefined && { cursor: decodeCursor(cursorParam) }) }
}

function encodeCursor(cursor: RecipeListCursor): string {
  return btoa(JSON.stringify(cursor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeCursor(value: string): RecipeListCursor {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
    const decoded = JSON.parse(atob(base64)) as Record<string, unknown>
    if (
      typeof decoded.sortAt === 'string' &&
      !Number.isNaN(Date.parse(decoded.sortAt)) &&
      typeof decoded.recipeId === 'string' &&
      decoded.recipeId !== ''
    ) {
      return { sortAt: decoded.sortAt, recipeId: decoded.recipeId }
    }
  } catch {
    // Invalid opaque cursors use the normal validation envelope below.
  }
  throw new ApiError('validation_failed', 'cursor is invalid.')
}
