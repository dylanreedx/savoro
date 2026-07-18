import { and, asc, desc, eq, like, lt, ne, or, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../db/client'
import {
  recipeIngredients,
  recipeSteps,
  recipeVersions,
  recipes,
  savedRecipes,
  users,
  type RecipeIngredientRow,
  type RecipeRow,
  type RecipeStepRow,
  type RecipeVersionRow,
  type UserRow,
} from '../db/schema'
import { ApiError } from '../errors'

/**
 * Loads the recipe version to log against, enforcing the same rule exposed by
 * RecipeViewerState.canLog: owners may log their own recipe; everyone else
 * needs a public, published recipe. When versionId is omitted the recipe's
 * current version is used.
 */
export async function getLoggableVersion(
  db: Db,
  viewerUserId: string,
  recipeId: string,
  versionId: string | undefined,
): Promise<RecipeVersionRow> {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  const isOwner = recipe?.ownerUserId === viewerUserId
  const canLog = recipe && (isOwner || (recipe.visibility === 'public' && recipe.status === 'published'))
  if (!canLog) {
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

export interface RecipeSummaryRows {
  recipe: RecipeRow
  owner: UserRow
  version: RecipeVersionRow
  isSaved: boolean
}

export interface RecipeDetailRows extends RecipeSummaryRows {
  ingredients: RecipeIngredientRow[]
  steps: RecipeStepRow[]
}

export interface RecipeListCursor {
  sortAt: string
  recipeId: string
}

export interface RecipeListOptions {
  limit: number
  cursor?: RecipeListCursor
}

export interface RecipeSummaryPage {
  items: RecipeSummaryRows[]
  nextCursor: RecipeListCursor | null
}

type SqliteBatch = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]

/** Saves a recipe only when the session viewer can currently see it. */
export async function saveRecipeForViewer(db: Db, viewerUserId: string, recipeId: string): Promise<void> {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  const isOwner = recipe?.ownerUserId === viewerUserId
  const isVisible = recipe && recipe.visibility !== 'private' && recipe.status === 'published'
  if (!recipe || (!isOwner && !isVisible)) {
    throw new ApiError('not_found', 'Recipe not found.')
  }

  await db
    .insert(savedRecipes)
    .values({ userId: viewerUserId, recipeId, createdAt: new Date().toISOString() })
    .onConflictDoNothing({ target: [savedRecipes.userId, savedRecipes.recipeId] })
}

/**
 * Unsave deliberately does not load the recipe. Deleting a missing row is an
 * idempotent no-op, including when a previously saved recipe is now hidden;
 * this lets clients clear stale saves without revealing recipe existence.
 */
export async function unsaveRecipeForViewer(db: Db, viewerUserId: string, recipeId: string): Promise<void> {
  await db
    .delete(savedRecipes)
    .where(and(eq(savedRecipes.userId, viewerUserId), eq(savedRecipes.recipeId, recipeId)))
}

/** Own recipes in any status, newest-created first. */
export async function listOwnedRecipes(
  db: Db,
  viewerUserId: string,
  options: RecipeListOptions,
): Promise<RecipeSummaryPage> {
  const cursorFilter = options.cursor
    ? or(
        lt(recipes.createdAt, options.cursor.sortAt),
        and(eq(recipes.createdAt, options.cursor.sortAt), lt(recipes.id, options.cursor.recipeId)),
      )
    : undefined
  const found = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.ownerUserId, viewerUserId), cursorFilter))
    .orderBy(desc(recipes.createdAt), desc(recipes.id))
    .limit(options.limit + 1)
  const pageRows = found.slice(0, options.limit)
  const items = await Promise.all(pageRows.map((recipe) => loadRecipeSummary(db, recipe, viewerUserId)))
  const last = pageRows.at(-1)
  return {
    items,
    nextCursor: found.length > options.limit && last ? { sortAt: last.createdAt, recipeId: last.id } : null,
  }
}

/** Own draft recipes, newest-created first. */
export async function listDraftRecipes(
  db: Db,
  viewerUserId: string,
  options: RecipeListOptions,
): Promise<RecipeSummaryPage> {
  const cursorFilter = options.cursor
    ? or(
        lt(recipes.createdAt, options.cursor.sortAt),
        and(eq(recipes.createdAt, options.cursor.sortAt), lt(recipes.id, options.cursor.recipeId)),
      )
    : undefined
  const found = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.ownerUserId, viewerUserId), eq(recipes.status, 'draft'), cursorFilter))
    .orderBy(desc(recipes.createdAt), desc(recipes.id))
    .limit(options.limit + 1)
  const pageRows = found.slice(0, options.limit)
  const items = await Promise.all(pageRows.map((recipe) => loadRecipeSummary(db, recipe, viewerUserId)))
  const last = pageRows.at(-1)
  return {
    items,
    nextCursor: found.length > options.limit && last ? { sortAt: last.createdAt, recipeId: last.id } : null,
  }
}

/**
 * Viewer saves that remain visible, newest-saved first. A saved unlisted
 * recipe remains visible here because the viewer reached and saved its link;
 * unpublished recipes owned by someone else and all archived recipes are
 * filtered at read time.
 */
export async function listSavedRecipes(
  db: Db,
  viewerUserId: string,
  options: RecipeListOptions,
): Promise<RecipeSummaryPage> {
  const cursorFilter = options.cursor
    ? or(
        lt(savedRecipes.createdAt, options.cursor.sortAt),
        and(eq(savedRecipes.createdAt, options.cursor.sortAt), lt(recipes.id, options.cursor.recipeId)),
      )
    : undefined
  const isVisible = or(
    eq(recipes.ownerUserId, viewerUserId),
    and(eq(recipes.status, 'published'), ne(recipes.visibility, 'private')),
  )
  const found = await db
    .select({ recipe: recipes, savedAt: savedRecipes.createdAt })
    .from(savedRecipes)
    .innerJoin(recipes, eq(savedRecipes.recipeId, recipes.id))
    .where(
      and(
        eq(savedRecipes.userId, viewerUserId),
        ne(recipes.status, 'archived'),
        isVisible,
        cursorFilter,
      ),
    )
    .orderBy(desc(savedRecipes.createdAt), desc(recipes.id))
    .limit(options.limit + 1)
  const pageRows = found.slice(0, options.limit)
  const items = await Promise.all(pageRows.map(({ recipe }) => loadRecipeSummary(db, recipe, viewerUserId)))
  const last = pageRows.at(-1)
  return {
    items,
    nextCursor:
      found.length > options.limit && last ? { sortAt: last.savedAt, recipeId: last.recipe.id } : null,
  }
}

/** Public, published recipes ordered by current-version publication time. */
export async function listPublicRecipes(
  db: Db,
  viewerUserId: string,
  options: RecipeListOptions,
): Promise<RecipeSummaryPage> {
  // All lifecycle-published versions have publishedAt. The fallback only keeps
  // legacy/imported public rows deterministic if that historical field is absent.
  const publishedSort = sql<string>`coalesce(${recipeVersions.publishedAt}, ${recipes.updatedAt})`
  const cursorFilter = options.cursor
    ? or(
        lt(publishedSort, options.cursor.sortAt),
        and(eq(publishedSort, options.cursor.sortAt), lt(recipes.id, options.cursor.recipeId)),
      )
    : undefined
  const found = await db
    .select({ recipe: recipes, sortAt: publishedSort })
    .from(recipes)
    .innerJoin(recipeVersions, eq(recipes.currentVersionId, recipeVersions.id))
    .where(
      and(
        eq(recipes.visibility, 'public'),
        eq(recipes.status, 'published'),
        cursorFilter,
      ),
    )
    .orderBy(desc(publishedSort), desc(recipes.id))
    .limit(options.limit + 1)
  const pageRows = found.slice(0, options.limit)
  const items = await Promise.all(pageRows.map(({ recipe }) => loadRecipeSummary(db, recipe, viewerUserId)))
  const last = pageRows.at(-1)
  return {
    items,
    nextCursor:
      found.length > options.limit && last ? { sortAt: last.sortAt, recipeId: last.recipe.id } : null,
  }
}

/** Title-only search over public, published current recipe versions. */
export async function searchPublicRecipes(
  db: Db,
  viewerUserId: string,
  query: string,
): Promise<RecipeSummaryRows[]> {
  const publishedSort = sql<string>`coalesce(${recipeVersions.publishedAt}, ${recipes.updatedAt})`
  const found = await db
    .select({ recipe: recipes })
    .from(recipes)
    .innerJoin(recipeVersions, eq(recipes.currentVersionId, recipeVersions.id))
    .where(
      and(
        eq(recipes.visibility, 'public'),
        eq(recipes.status, 'published'),
        like(recipeVersions.title, `%${query}%`),
      ),
    )
    .orderBy(desc(publishedSort), desc(recipes.id))
  return Promise.all(found.map(({ recipe }) => loadRecipeSummary(db, recipe, viewerUserId)))
}

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
  return createRecipeFromContent(db, ownerUserId, content, {})
}

async function createRecipeFromContent(
  db: Db,
  ownerUserId: string,
  content: RecipeContentInput,
  fork: { forkedFromRecipeId?: string; forkedFromVersionId?: string },
): Promise<RecipeDetailRows> {
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
      forkedFromRecipeId: fork.forkedFromRecipeId ?? null,
      forkedFromVersionId: fork.forkedFromVersionId ?? null,
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
  return loadRecipeDetail(db, recipeId, ownerUserId)
}

/** Creates a private draft copy of the visible recipe, preserving source attribution. */
export async function forkRecipe(db: Db, viewerUserId: string, sourceRecipeId: string): Promise<RecipeDetailRows> {
  const source = await db.query.recipes.findFirst({ where: eq(recipes.id, sourceRecipeId) })
  const isOwner = source?.ownerUserId === viewerUserId
  const isVisible = source && source.visibility !== 'private' && source.status === 'published'
  if (!source || (!isOwner && !isVisible)) {
    throw new ApiError('not_found', 'Recipe not found.')
  }

  const { version, content } = await loadVersionContent(db, source)
  return createRecipeFromContent(db, viewerUserId, content, {
    forkedFromRecipeId: source.id,
    forkedFromVersionId: version.id,
  })
}

async function getOwnedRecipe(db: Db, ownerUserId: string, recipeId: string): Promise<RecipeRow> {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  // Ownership failures match missing ids so lifecycle endpoints do not leak existence.
  if (!recipe || recipe.ownerUserId !== ownerUserId) {
    throw new ApiError('not_found', 'Recipe not found.')
  }
  return recipe
}

/** Publishes the current draft version as public or link-reachable unlisted. */
export async function publishRecipe(
  db: Db,
  ownerUserId: string,
  recipeId: string,
  visibility: 'public' | 'unlisted',
): Promise<RecipeDetailRows> {
  const recipe = await getOwnedRecipe(db, ownerUserId, recipeId)
  if (recipe.status !== 'draft') {
    throw new ApiError('validation_failed', 'Only draft recipes can be published.')
  }
  if (!recipe.currentVersionId) throw new ApiError('internal', 'Recipe has no current version.')

  const version = await db.query.recipeVersions.findFirst({
    where: eq(recipeVersions.id, recipe.currentVersionId),
  })
  if (!version || version.recipeId !== recipe.id) {
    throw new ApiError('internal', 'Recipe has no current version.')
  }

  const now = new Date().toISOString()
  const ops: BatchItem<'sqlite'>[] = []
  // A republish of unchanged content keeps the version's first publication time.
  if (version.publishedAt === null) {
    ops.push(db.update(recipeVersions).set({ publishedAt: now }).where(eq(recipeVersions.id, version.id)))
  }
  ops.push(
    db
      .update(recipes)
      .set({ status: 'published', visibility, updatedAt: now })
      .where(eq(recipes.id, recipe.id)),
  )
  await db.batch(ops as SqliteBatch)
  return loadRecipeDetail(db, recipe.id, ownerUserId)
}

/** Returns a published recipe to a private draft without changing its versions. */
export async function unpublishRecipe(db: Db, ownerUserId: string, recipeId: string): Promise<RecipeDetailRows> {
  const recipe = await getOwnedRecipe(db, ownerUserId, recipeId)
  if (recipe.status !== 'published') {
    throw new ApiError('validation_failed', 'Only published recipes can be unpublished.')
  }

  await db
    .update(recipes)
    .set({ status: 'draft', visibility: 'private', updatedAt: new Date().toISOString() })
    .where(eq(recipes.id, recipe.id))
  return loadRecipeDetail(db, recipe.id, ownerUserId)
}

/** Archives any active recipe; archived is a terminal lifecycle state. */
export async function archiveRecipe(db: Db, ownerUserId: string, recipeId: string): Promise<RecipeDetailRows> {
  const recipe = await getOwnedRecipe(db, ownerUserId, recipeId)
  if (recipe.status === 'archived') {
    throw new ApiError('validation_failed', 'Recipe is already archived.')
  }

  await db
    .update(recipes)
    .set({ status: 'archived', updatedAt: new Date().toISOString() })
    .where(eq(recipes.id, recipe.id))
  return loadRecipeDetail(db, recipe.id, ownerUserId)
}

/**
 * Owner-only edit. Never-published drafts mutate their current version in
 * place. Published recipes and unpublished versions that were published
 * before get a NEW version, so existing logs/forks keep immutable references.
 * Absent patch fields keep current content.
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
  if (recipe.status === 'draft' && current.version.publishedAt === null) {
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
        publishedAt: recipe.status === 'published' ? now : null,
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

  return loadRecipeDetail(db, recipeId, ownerUserId)
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
  return loadRecipeDetail(db, recipeId, viewerUserId)
}

/** Loads everything the RecipeDetail DTO needs. No visibility gating here. */
export async function loadRecipeDetail(
  db: Db,
  recipeId: string,
  viewerUserId: string,
): Promise<RecipeDetailRows> {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  if (!recipe) throw new ApiError('not_found', 'Recipe not found.')
  const [owner, versionContent, isSaved] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, recipe.ownerUserId) }),
    loadVersionContent(db, recipe),
    recipeIsSaved(db, viewerUserId, recipe.id),
  ])
  if (!owner) throw new ApiError('internal', 'Recipe owner is missing.')
  const { version, ingredients, steps } = versionContent
  return { recipe, owner, version, ingredients, steps, isSaved }
}

async function loadRecipeSummary(db: Db, recipe: RecipeRow, viewerUserId: string): Promise<RecipeSummaryRows> {
  if (!recipe.currentVersionId) throw new ApiError('internal', 'Recipe has no current version.')
  const [owner, version, isSaved] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, recipe.ownerUserId) }),
    db.query.recipeVersions.findFirst({ where: eq(recipeVersions.id, recipe.currentVersionId) }),
    recipeIsSaved(db, viewerUserId, recipe.id),
  ])
  if (!owner) throw new ApiError('internal', 'Recipe owner is missing.')
  if (!version || version.recipeId !== recipe.id) throw new ApiError('internal', 'Recipe has no current version.')
  return { recipe, owner, version, isSaved }
}

async function recipeIsSaved(db: Db, viewerUserId: string, recipeId: string): Promise<boolean> {
  const row = await db.query.savedRecipes.findFirst({
    where: and(eq(savedRecipes.userId, viewerUserId), eq(savedRecipes.recipeId, recipeId)),
    columns: { recipeId: true },
  })
  return row !== undefined
}
