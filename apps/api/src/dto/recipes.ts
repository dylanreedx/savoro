import type { RecipeDetailRows, RecipeSummaryRows } from '../repo/recipes'

// Recipe DTOs per docs/api-contract.md; field names follow the canonical iOS
// models (SavoroIOS .../Models/RecipeModels.swift). Privacy: these mappers
// never emit email, logs, goals, body metrics, day progress, or adherence.

interface MacroTotalsDTO {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams?: number
  sodiumMilligrams?: number
}

export function mapRecipeSummary(rows: RecipeSummaryRows, viewerUserId: string) {
  const { recipe, owner, version, isSaved } = rows
  const isOwner = viewerUserId === recipe.ownerUserId
  const isPublished = recipe.status === 'published'

  return {
    id: recipe.id,
    ownerUserId: recipe.ownerUserId,
    slug: recipe.slug,
    title: version.title,
    ...(version.description !== null && { description: version.description }),
    visibility: recipe.visibility,
    status: recipe.status,
    currentVersionId: version.id,
    forkedFromRecipeId: recipe.forkedFromRecipeId,
    forkedFromVersionId: recipe.forkedFromVersionId,
    creator: {
      userId: owner.id,
      // Real usernames arrive with profiles (SAV-133). The user id is a safe
      // placeholder; never derive this from email.
      username: owner.id,
      displayName: owner.displayName ?? owner.id,
    },
    perServingMacros: macros(version),
    tags: [],
    viewerState: {
      isOwner,
      isSaved,
      canFork: isOwner || (isPublished && recipe.visibility !== 'private'),
      canLog: isOwner || (isPublished && recipe.visibility === 'public'),
    },
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  }
}

export function mapRecipeDetail(rows: RecipeDetailRows, viewerUserId: string) {
  const { recipe, version, ingredients, steps } = rows
  const perServingMacros = macros(version)

  return {
    summary: mapRecipeSummary(rows, viewerUserId),
    currentVersion: {
      id: version.id,
      recipeId: version.recipeId,
      versionNumber: version.versionNumber,
      title: version.title,
      ...(version.description !== null && { description: version.description }),
      // Steps are the canonical instructions; the markdown view is derived.
      instructionsMarkdown: steps.map((s, i) => `${i + 1}. ${s.body}`).join('\n'),
      servings: version.servings,
      perServingMacros,
      createdByUserId: recipe.ownerUserId,
      publishedAt: version.publishedAt,
      createdAt: version.createdAt,
    },
    ingredients: ingredients.map((i) => ({
      id: i.id,
      recipeVersionId: i.recipeVersionId,
      foodId: i.foodId,
      servingId: i.servingId,
      quantity: i.quantity,
      unit: i.unit,
      label: i.label,
      note: i.note,
      sortOrder: i.sortOrder,
    })),
    steps: steps.map((s) => ({
      id: s.id,
      recipeVersionId: s.recipeVersionId,
      body: s.body,
      sortOrder: s.sortOrder,
    })),
    provenance: {
      trustLevel: 'creator_provided',
      summary: 'Ingredients and nutrition provided by the recipe creator.',
      attributions: [],
    },
  }
}

function macros(v: {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number | null
  sodiumMilligrams: number | null
}): MacroTotalsDTO {
  return {
    calories: v.calories,
    proteinGrams: v.proteinGrams,
    carbsGrams: v.carbsGrams,
    fatGrams: v.fatGrams,
    ...(v.fiberGrams !== null && { fiberGrams: v.fiberGrams }),
    ...(v.sodiumMilligrams !== null && { sodiumMilligrams: v.sodiumMilligrams }),
  }
}
