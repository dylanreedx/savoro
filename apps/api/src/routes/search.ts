import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { mapRecipeSummary } from '../dto/recipes'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import { searchPublicRecipes } from '../repo/recipes'

type SearchKind = 'recipes' | 'profiles' | 'communities' | 'all'

export const search = new Hono<AppEnv>()

search.use('*', requireAuth)

search.get('/', async (c) => {
  const query = parseQuery(c.req.query('q'))
  const kind = parseKind(c.req.query('kind'))
  const userId = c.get('userId')

  // Profile and community persistence has not landed yet. Those kinds return
  // a contract-shaped empty result set rather than searching user emails or
  // other private identity fields.
  const recipeRows = kind === 'recipes' || kind === 'all'
    ? await searchPublicRecipes(createDb(c.env.DB), userId, query)
    : []
  return c.json({
    query,
    results: recipeRows.map((rows) => ({
      kind: 'recipe' as const,
      recipe: mapRecipeSummary(rows, userId),
    })),
  })
})

function parseQuery(value: string | undefined): string {
  const query = value?.trim()
  if (!query) throw new ApiError('validation_failed', 'q must be a non-empty string.')
  return query
}

function parseKind(value: string | undefined): SearchKind {
  if (value !== 'recipes' && value !== 'profiles' && value !== 'communities' && value !== 'all') {
    throw new ApiError('validation_failed', 'kind must be recipes, profiles, communities, or all.')
  }
  return value
}
