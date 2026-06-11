import { hashToken } from '../src/token'

const NOW = '2026-06-10T00:00:00Z'

export async function seedUser(db: D1Database, id: string, token: string): Promise<void> {
  await db
    .prepare('insert into users (id, email, display_name, created_at, updated_at) values (?, ?, ?, ?, ?)')
    .bind(id, `${id}@example.com`, id, NOW, NOW)
    .run()
  await db
    .prepare('insert into sessions (id, user_id, token_hash, expires_at, created_at) values (?, ?, ?, ?, ?)')
    .bind(`ses_${id}`, id, await hashToken(token), '2099-01-01T00:00:00Z', NOW)
    .run()
}

export interface SeedRecipeOptions {
  recipeId: string
  ownerUserId: string
  visibility?: 'private' | 'unlisted' | 'public'
  title?: string
  caloriesPerServing?: number
  proteinGrams?: number
  carbsGrams?: number
  fatGrams?: number
}

/** Inserts a recipe with one version (v1) and returns the version id. */
export async function seedRecipe(db: D1Database, opts: SeedRecipeOptions): Promise<string> {
  const versionId = `rcv_${opts.recipeId}_v1`
  await db
    .prepare(
      'insert into recipes (id, owner_user_id, slug, visibility, status, current_version_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(opts.recipeId, opts.ownerUserId, opts.recipeId, opts.visibility ?? 'private', 'draft', versionId, NOW, NOW)
    .run()
  await db
    .prepare(
      'insert into recipe_versions (id, recipe_id, version_number, title, servings, calories, protein_grams, carbs_grams, fat_grams, created_at) values (?, ?, 1, ?, 1, ?, ?, ?, ?, ?)',
    )
    .bind(
      versionId,
      opts.recipeId,
      opts.title ?? 'Test Recipe',
      opts.caloriesPerServing ?? 500,
      opts.proteinGrams ?? 40,
      opts.carbsGrams ?? 50,
      opts.fatGrams ?? 15,
      NOW,
    )
    .run()
  return versionId
}
