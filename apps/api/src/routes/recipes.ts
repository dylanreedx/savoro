import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { mapRecipeDetail } from '../dto/recipes'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import {
  createRecipe,
  archiveRecipe,
  forkRecipe,
  getRecipeDetailForViewer,
  publishRecipe,
  saveRecipeForViewer,
  unpublishRecipe,
  unsaveRecipeForViewer,
  updateRecipe,
  type RecipeContentInput,
  type RecipeIngredientInput,
  type RecipeMacrosInput,
  type RecipePatchInput,
} from '../repo/recipes'

export const recipes = new Hono<AppEnv>()

recipes.use('*', requireAuth)

recipes.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await readJson(c.req.raw)
  // Client-supplied userId/ownerUserId are intentionally ignored: the owner
  // is always the session user.
  const content = parseCreateBody(body)

  const db = createDb(c.env.DB)
  const rows = await createRecipe(db, userId, content)
  return c.json({ recipe: mapRecipeDetail(rows, userId) }, 201)
})

recipes.get('/:id', async (c) => {
  const userId = c.get('userId')
  const db = createDb(c.env.DB)
  const rows = await getRecipeDetailForViewer(db, userId, c.req.param('id'))
  return c.json({ recipe: mapRecipeDetail(rows, userId) })
})

recipes.post('/:id/save', async (c) => {
  const db = createDb(c.env.DB)
  await saveRecipeForViewer(db, c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

recipes.delete('/:id/save', async (c) => {
  const db = createDb(c.env.DB)
  await unsaveRecipeForViewer(db, c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

recipes.post('/:id/publish', async (c) => {
  const userId = c.get('userId')
  const body = await readJson(c.req.raw)
  const visibility = parsePublishVisibility(body.visibility)

  const db = createDb(c.env.DB)
  const rows = await publishRecipe(db, userId, c.req.param('id'), visibility)
  return c.json({ recipe: mapRecipeDetail(rows, userId) })
})

recipes.post('/:id/unpublish', async (c) => {
  const userId = c.get('userId')
  const db = createDb(c.env.DB)
  const rows = await unpublishRecipe(db, userId, c.req.param('id'))
  return c.json({ recipe: mapRecipeDetail(rows, userId) })
})

recipes.post('/:id/archive', async (c) => {
  const userId = c.get('userId')
  const db = createDb(c.env.DB)
  const rows = await archiveRecipe(db, userId, c.req.param('id'))
  return c.json({ recipe: mapRecipeDetail(rows, userId) })
})

recipes.post('/:id/fork', async (c) => {
  const userId = c.get('userId')
  const db = createDb(c.env.DB)
  const rows = await forkRecipe(db, userId, c.req.param('id'))
  return c.json({ recipe: mapRecipeDetail(rows, userId) }, 201)
})

recipes.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const body = await readJson(c.req.raw)
  const patch = parsePatchBody(body)

  const db = createDb(c.env.DB)
  const rows = await updateRecipe(db, userId, c.req.param('id'), patch)
  return c.json({ recipe: mapRecipeDetail(rows, userId) })
})

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => {
    throw new ApiError('validation_failed', 'Body must be JSON.')
  })
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError('validation_failed', 'Body must be a JSON object.')
  }
  return body as Record<string, unknown>
}

function parsePublishVisibility(value: unknown): 'public' | 'unlisted' {
  if (value !== 'public' && value !== 'unlisted') {
    throw new ApiError('validation_failed', 'visibility must be public or unlisted.')
  }
  return value
}

function parseCreateBody(body: Record<string, unknown>): RecipeContentInput {
  return {
    title: parseTitle(body.title),
    description: parseDescription(body.description),
    servings: parseServings(body.servings),
    perServingMacros: parseMacros(body.perServingMacros),
    ingredients: parseIngredients(body.ingredients),
    steps: parseSteps(body.steps),
  }
}

function parsePatchBody(body: Record<string, unknown>): RecipePatchInput {
  const patch: RecipePatchInput = {}
  if (body.title !== undefined) patch.title = parseTitle(body.title)
  if ('description' in body) patch.description = parseDescription(body.description)
  if (body.servings !== undefined) patch.servings = parseServings(body.servings)
  if (body.perServingMacros !== undefined) patch.perServingMacros = parseMacros(body.perServingMacros)
  if (body.ingredients !== undefined) patch.ingredients = parseIngredients(body.ingredients)
  if (body.steps !== undefined) patch.steps = parseSteps(body.steps)
  return patch
}

function parseTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError('validation_failed', 'title must be a non-empty string.')
  }
  return value.trim()
}

function parseDescription(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new ApiError('validation_failed', 'description must be a string.')
  return value
}

function parseServings(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ApiError('validation_failed', 'servings must be a positive number.')
  }
  return value
}

const REQUIRED_MACROS = ['calories', 'proteinGrams', 'carbsGrams', 'fatGrams'] as const
const OPTIONAL_MACROS = ['fiberGrams', 'sodiumMilligrams'] as const

function parseMacros(value: unknown): RecipeMacrosInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiError('validation_failed', 'perServingMacros is required.')
  }
  const raw = value as Record<string, unknown>
  const out: Record<string, number | null> = {}
  for (const key of REQUIRED_MACROS) {
    const n = raw[key]
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
      throw new ApiError('validation_failed', `perServingMacros.${key} must be a non-negative number.`)
    }
    out[key] = n
  }
  for (const key of OPTIONAL_MACROS) {
    const n = raw[key]
    if (n === undefined || n === null) {
      out[key] = null
      continue
    }
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
      throw new ApiError('validation_failed', `perServingMacros.${key} must be a non-negative number.`)
    }
    out[key] = n
  }
  return out as unknown as RecipeMacrosInput
}

function parseIngredients(value: unknown): RecipeIngredientInput[] {
  if (!Array.isArray(value)) throw new ApiError('validation_failed', 'ingredients must be an array.')
  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new ApiError('validation_failed', `ingredients[${index}] must be an object.`)
    }
    const raw = item as Record<string, unknown>
    if (typeof raw.label !== 'string' || raw.label.trim() === '') {
      throw new ApiError('validation_failed', `ingredients[${index}].label must be a non-empty string.`)
    }
    if (raw.quantity !== undefined && raw.quantity !== null) {
      if (typeof raw.quantity !== 'number' || !Number.isFinite(raw.quantity) || raw.quantity <= 0) {
        throw new ApiError('validation_failed', `ingredients[${index}].quantity must be a positive number.`)
      }
    }
    return {
      foodId: optionalString(raw.foodId, `ingredients[${index}].foodId`),
      servingId: optionalString(raw.servingId, `ingredients[${index}].servingId`),
      quantity: (raw.quantity as number | undefined) ?? null,
      unit: typeof raw.unit === 'string' ? raw.unit : '',
      label: raw.label.trim(),
      note: optionalString(raw.note, `ingredients[${index}].note`),
    }
  })
}

function parseSteps(value: unknown): string[] {
  if (!Array.isArray(value)) throw new ApiError('validation_failed', 'steps must be an array.')
  return value.map((item, index) => {
    const body = typeof item === 'object' && item !== null ? (item as Record<string, unknown>).body : undefined
    if (typeof body !== 'string' || body.trim() === '') {
      throw new ApiError('validation_failed', `steps[${index}].body must be a non-empty string.`)
    }
    return body.trim()
  })
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new ApiError('validation_failed', `${field} must be a string.`)
  return value
}
