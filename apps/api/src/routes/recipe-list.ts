import { mapRecipeSummary } from '../dto/recipes'
import { ApiError } from '../errors'
import type {
  RecipeListCursor,
  RecipeListOptions,
  RecipeSummaryPage,
} from '../repo/recipes'

export function mapRecipePage(page: RecipeSummaryPage, viewerUserId: string) {
  return {
    items: page.items.map((rows) => mapRecipeSummary(rows, viewerUserId)),
    nextCursor: page.nextCursor === null ? null : encodeRecipeListCursor(page.nextCursor),
  }
}

export function parseRecipeListOptions(
  limitParam: string | undefined,
  cursorParam: string | undefined,
): RecipeListOptions {
  let limit = 20
  if (limitParam !== undefined) {
    if (!/^\d+$/.test(limitParam)) throw new ApiError('validation_failed', 'limit must be an integer from 1 to 50.')
    limit = Number(limitParam)
    if (limit < 1 || limit > 50) throw new ApiError('validation_failed', 'limit must be an integer from 1 to 50.')
  }
  return { limit, ...(cursorParam !== undefined && { cursor: decodeRecipeListCursor(cursorParam) }) }
}

function encodeRecipeListCursor(cursor: RecipeListCursor): string {
  return btoa(JSON.stringify(cursor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeRecipeListCursor(value: string): RecipeListCursor {
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
