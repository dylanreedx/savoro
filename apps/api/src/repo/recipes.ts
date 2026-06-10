import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { recipeVersions, recipes, type RecipeVersionRow } from '../db/schema'
import { ApiError } from '../errors'

/**
 * Loads the recipe version to log against, enforcing visibility: the viewer
 * must own the recipe or it must be public. When versionId is omitted the
 * recipe's current version is used.
 */
export async function getLoggableVersion(
  db: Db,
  viewerUserId: string,
  recipeId: string,
  versionId: string | undefined,
): Promise<RecipeVersionRow> {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  if (!recipe || (recipe.ownerUserId !== viewerUserId && recipe.visibility !== 'public')) {
    throw new ApiError('not_found', 'Recipe not found.')
  }

  const targetVersionId = versionId ?? recipe.currentVersionId
  if (!targetVersionId) {
    throw new ApiError('not_found', 'Recipe has no version to log.')
  }

  const version = await db.query.recipeVersions.findFirst({
    where: eq(recipeVersions.id, targetVersionId),
  })
  if (!version || version.recipeId !== recipeId) {
    throw new ApiError('validation_failed', 'recipeVersionId does not belong to recipeId.')
  }
  return version
}
