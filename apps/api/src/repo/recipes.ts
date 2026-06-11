import { and, asc, eq, like } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../db/client'
import {
  recipeIngredients,
  recipeSteps,
  recipeVersions,
  recipes,
  users,
  type RecipeIngredientRow,
  type RecipeRow,
  type RecipeStepRow,
  type RecipeVersionRow,
  type UserRow,
} from '../db/schema'
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

export interface RecipeMacrosInput {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number | null
  sodiumMilligrams: number | null
}

export interface RecipeIngredientInput {
  foodId: string | null
  servingId: string | null
  quantity: number | null
  unit: string
  label: string
  note: string | null
}

export interface RecipeContentInput {
  title: string
  description: string | null
  servings: number
  perServingMacros: RecipeMacrosInput
  ingredients: RecipeIngredientInput[]
  /** Step bodies, in order. */
  steps: string[]
}

/** A PATCH body: absent fields keep the current version's content. */
export type RecipePatchInput = Partial<RecipeContentInput>

export interface RecipeDetailRows {
  recipe: RecipeRow
  owner: UserRow
  version: RecipeVersionRow
  ingredients: RecipeIngredientRow[]
  steps: RecipeStepRow[]
}

type SqliteBatch = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug === '' ? 'recipe' : slug
}

/** Picks `base`, or the first free `base-N`, unique among the owner's recipes. */
async function uniqueSlug(db: Db, ownerUserId: string, base: string): Promise<string> {
  const existing = await db.query.recipes.findMany({
    where: and(eq(recipes.ownerUserId, ownerUserId), like(recipes.slug, `${base}%`)),
    columns: { slug: true },
  })
  const taken = new Set(existing.map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
  }
}

function ingredientRows(versionId: string, inputs: RecipeIngredientInput[]) {
  return inputs.map((ing, index) => ({
    id: `ing_${crypto.randomUUID()}`,
    recipeVersionId: versionId,
    foodId: ing.foodId,
    servingId: ing.servingId,
    quantity: ing.quantity,
    unit: ing.unit,
    label: ing.label,
    note: ing.note,
    sortOrder: index,
  }))
}

function stepRows(versionId: string, bodies: string[]) {
  return bodies.map((body, index) => ({
    id: `stp_${crypto.randomUUID()}`,
    recipeVersionId: versionId,
    body,
    sortOrder: index,
  }))
}

function versionValues(content: RecipeContentInput) {
  return {
    title: content.title,
    description: content.description,
    servings: content.servings,
    calories: content.perServingMacros.calories,
    proteinGrams: content.perServingMacros.proteinGrams,
    carbsGrams: content.perServingMacros.carbsGrams,
    fatGrams: content.perServingMacros.fatGrams,
    fiberGrams: content.perServingMacros.fiberGrams,
    sodiumMilligrams: content.perServingMacros.sodiumMilligrams,
  }
}

/** Creates a private draft recipe with version 1 and its ingredients/steps. */
export async function createRecipe(db: Db, ownerUserId: string, content: RecipeContentInput): Promise<RecipeDetailRows> {
  const now = new Date().toISOString()
  const recipeId = `rec_${crypto.randomUUID()}`
  const versionId = `rcv_${crypto.randomUUID()}`
  const slug = await uniqueSlug(db, ownerUserId, slugify(content.title))

  const ops: BatchItem<'sqlite'>[] = [
    db.insert(recipes).values({
      id: recipeId,
      ownerUserId,
      slug,
      visibility: 'private',
      status: 'draft',
      currentVersionId: versionId,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(recipeVersions).values({
      id: versionId,
      recipeId,
      versionNumber: 1,
      ...versionValues(content),
      createdAt: now,
    }),
  ]
  const ingredients = ingredientRows(versionId, content.ingredients)
  if (ingredients.length > 0) ops.push(db.insert(recipeIngredients).values(ingredients))
  const steps = stepRows(versionId, content.steps)
  if (steps.length > 0) ops.push(db.insert(recipeSteps).values(steps))

  await db.batch(ops as SqliteBatch)
  return loadRecipeDetail(db, recipeId)
}

/**
 * Owner-only edit. Drafts mutate version 1 in place; published recipes get a
 * NEW version (published versions are immutable — existing logs keep pointing
 * at the version they logged). Absent patch fields keep current content.
 */
export async function updateRecipe(
  db: Db,
  ownerUserId: string,
  recipeId: string,
  patch: RecipePatchInput,
): Promise<RecipeDetailRows> {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  // Non-owners get the same not_found as a missing id: no existence leak.
  if (!recipe || recipe.ownerUserId !== ownerUserId) {
    throw new ApiError('not_found', 'Recipe not found.')
  }
  if (recipe.status === 'archived') {
    throw new ApiError('validation_failed', 'Archived recipes cannot be edited.')
  }

  const current = await loadVersionContent(db, recipe)
  const content: RecipeContentInput = {
    title: patch.title ?? current.content.title,
    description: patch.description !== undefined ? patch.description : current.content.description,
    servings: patch.servings ?? current.content.servings,
    perServingMacros: patch.perServingMacros ?? current.content.perServingMacros,
    ingredients: patch.ingredients ?? current.content.ingredients,
    steps: patch.steps ?? current.content.steps,
  }

  const now = new Date().toISOString()
  if (recipe.status === 'draft') {
    const versionId = current.version.id
    const ops: BatchItem<'sqlite'>[] = [
      db.update(recipeVersions).set(versionValues(content)).where(eq(recipeVersions.id, versionId)),
      db.delete(recipeIngredients).where(eq(recipeIngredients.recipeVersionId, versionId)),
      db.delete(recipeSteps).where(eq(recipeSteps.recipeVersionId, versionId)),
      db.update(recipes).set({ updatedAt: now }).where(eq(recipes.id, recipeId)),
    ]
    const ingredients = ingredientRows(versionId, content.ingredients)
    if (ingredients.length > 0) ops.push(db.insert(recipeIngredients).values(ingredients))
    const steps = stepRows(versionId, content.steps)
    if (steps.length > 0) ops.push(db.insert(recipeSteps).values(steps))
    await db.batch(ops as SqliteBatch)
  } else {
    const versionId = `rcv_${crypto.randomUUID()}`
    const ops: BatchItem<'sqlite'>[] = [
      db.insert(recipeVersions).values({
        id: versionId,
        recipeId,
        versionNumber: current.version.versionNumber + 1,
        ...versionValues(content),
        createdAt: now,
      }),
      db.update(recipes).set({ currentVersionId: versionId, updatedAt: now }).where(eq(recipes.id, recipeId)),
    ]
    const ingredients = ingredientRows(versionId, content.ingredients)
    if (ingredients.length > 0) ops.push(db.insert(recipeIngredients).values(ingredients))
    const steps = stepRows(versionId, content.steps)
    if (steps.length > 0) ops.push(db.insert(recipeSteps).values(steps))
    await db.batch(ops as SqliteBatch)
  }

  return loadRecipeDetail(db, recipeId)
}

async function loadVersionContent(db: Db, recipe: RecipeRow) {
  if (!recipe.currentVersionId) throw new ApiError('internal', 'Recipe has no current version.')
  const version = await db.query.recipeVersions.findFirst({
    where: eq(recipeVersions.id, recipe.currentVersionId),
  })
  if (!version) throw new ApiError('internal', 'Recipe has no current version.')

  const [ingredients, steps] = await Promise.all([
    db.query.recipeIngredients.findMany({
      where: eq(recipeIngredients.recipeVersionId, version.id),
      orderBy: [asc(recipeIngredients.sortOrder)],
    }),
    db.query.recipeSteps.findMany({
      where: eq(recipeSteps.recipeVersionId, version.id),
      orderBy: [asc(recipeSteps.sortOrder)],
    }),
  ])

  const content: RecipeContentInput = {
    title: version.title,
    description: version.description,
    servings: version.servings,
    perServingMacros: {
      calories: version.calories,
      proteinGrams: version.proteinGrams,
      carbsGrams: version.carbsGrams,
      fatGrams: version.fatGrams,
      fiberGrams: version.fiberGrams,
      sodiumMilligrams: version.sodiumMilligrams,
    },
    ingredients: ingredients.map((i) => ({
      foodId: i.foodId,
      servingId: i.servingId,
      quantity: i.quantity,
      unit: i.unit,
      label: i.label,
      note: i.note,
    })),
    steps: steps.map((s) => s.body),
  }
  return { version, ingredients, steps, content }
}

/**
 * Loads a recipe for a viewer, enforcing visibility: owners see everything;
 * everyone else needs visibility != private AND status = published (unlisted
 * stays reachable by id, just never listed). Hidden and missing recipes are
 * the same not_found — no existence leak.
 */
export async function getRecipeDetailForViewer(
  db: Db,
  viewerUserId: string,
  recipeId: string,
): Promise<RecipeDetailRows> {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  const isOwner = recipe?.ownerUserId === viewerUserId
  const isVisible = recipe && recipe.visibility !== 'private' && recipe.status === 'published'
  if (!recipe || (!isOwner && !isVisible)) {
    throw new ApiError('not_found', 'Recipe not found.')
  }
  return loadRecipeDetail(db, recipeId)
}

/** Loads everything the RecipeDetail DTO needs. No visibility gating here. */
export async function loadRecipeDetail(db: Db, recipeId: string): Promise<RecipeDetailRows> {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  if (!recipe) throw new ApiError('not_found', 'Recipe not found.')
  const owner = await db.query.users.findFirst({ where: eq(users.id, recipe.ownerUserId) })
  if (!owner) throw new ApiError('internal', 'Recipe owner is missing.')
  const { version, ingredients, steps } = await loadVersionContent(db, recipe)
  return { recipe, owner, version, ingredients, steps }
}
