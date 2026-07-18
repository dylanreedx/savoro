import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').unique(),
    appleSub: text('apple_sub'),
    username: text('username'),
    displayName: text('display_name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    websiteUrl: text('website_url'),
    instagramUrl: text('instagram_url'),
    tiktokUrl: text('tiktok_url'),
    profileVisibility: text('profile_visibility', { enum: ['private', 'public'] })
      .notNull()
      .default('private'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('uq_users_apple_sub').on(t.appleSub),
    uniqueIndex('uq_users_username').on(t.username),
  ],
)

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
    lastUsedAt: text('last_used_at'),
    revokedAt: text('revoked_at'),
  },
  (t) => [index('idx_sessions_user').on(t.userId)],
)

export const foods = sqliteTable(
  'foods',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    name: text('name').notNull(),
    brand: text('brand'),
    category: text('category'),
    caloriesPer100g: real('calories_per_100g').notNull(),
    proteinGramsPer100g: real('protein_grams_per_100g').notNull(),
    carbsGramsPer100g: real('carbs_grams_per_100g').notNull(),
    fatGramsPer100g: real('fat_grams_per_100g').notNull(),
    fiberGramsPer100g: real('fiber_grams_per_100g'),
    sodiumMilligramsPer100g: real('sodium_milligrams_per_100g'),
  },
  (t) => [
    uniqueIndex('uq_foods_source_id').on(t.source, t.sourceId),
    index('idx_foods_name_search').on(t.name, t.id),
  ],
)

export const foodServings = sqliteTable(
  'food_servings',
  {
    id: text('id').primaryKey(),
    foodId: text('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    sourceId: text('source_id'),
    description: text('description').notNull(),
    gramWeight: real('gram_weight').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    uniqueIndex('uq_food_servings_source')
      .on(t.foodId, t.sourceId)
      .where(sql`${t.sourceId} is not null`),
    uniqueIndex('uq_food_servings_default')
      .on(t.foodId)
      .where(sql`${t.isDefault} = 1`),
    index('idx_food_servings_food_order').on(t.foodId, t.isDefault, t.sortOrder, t.id),
  ],
)

export const recipes = sqliteTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id),
    slug: text('slug').notNull(),
    visibility: text('visibility', { enum: ['private', 'unlisted', 'public'] }).notNull(),
    status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull(),
    currentVersionId: text('current_version_id'),
    forkedFromRecipeId: text('forked_from_recipe_id'),
    forkedFromVersionId: text('forked_from_version_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_recipes_owner_status').on(t.ownerUserId, t.status),
    uniqueIndex('uq_recipes_owner_slug').on(t.ownerUserId, t.slug),
  ],
)

export const savedRecipes = sqliteTable(
  'saved_recipes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    primaryKey({ name: 'pk_saved_recipes', columns: [t.userId, t.recipeId] }),
    index('idx_saved_recipes_user_created').on(t.userId, t.createdAt),
  ],
)

export const follows = sqliteTable(
  'follows',
  {
    id: text('id').primaryKey(),
    followerUserId: text('follower_user_id')
      .notNull()
      .references(() => users.id),
    followedUserId: text('followed_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('uq_follows_pair').on(t.followerUserId, t.followedUserId),
    index('idx_follows_followed').on(t.followedUserId, t.createdAt),
  ],
)

export const friendRequests = sqliteTable(
  'friend_requests',
  {
    id: text('id').primaryKey(),
    requesterUserId: text('requester_user_id')
      .notNull()
      .references(() => users.id),
    targetUserId: text('target_user_id')
      .notNull()
      .references(() => users.id),
    pairUserOneId: text('pair_user_one_id')
      .notNull()
      .references(() => users.id),
    pairUserTwoId: text('pair_user_two_id')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: ['pending', 'accepted', 'declined'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('uq_friend_requests_pending_pair')
      .on(t.pairUserOneId, t.pairUserTwoId)
      .where(sql`${t.status} = 'pending'`),
    index('idx_friend_requests_target_status').on(t.targetUserId, t.status, t.createdAt),
    index('idx_friend_requests_requester_status').on(t.requesterUserId, t.status, t.createdAt),
  ],
)

export const friendships = sqliteTable(
  'friendships',
  {
    id: text('id').primaryKey(),
    userOneId: text('user_one_id')
      .notNull()
      .references(() => users.id),
    userTwoId: text('user_two_id')
      .notNull()
      .references(() => users.id),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('uq_friendships_pair').on(t.userOneId, t.userTwoId),
    index('idx_friendships_user_two').on(t.userTwoId, t.createdAt),
  ],
)

export const recipeVersions = sqliteTable(
  'recipe_versions',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id),
    versionNumber: integer('version_number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    servings: real('servings').notNull(),
    calories: real('calories').notNull(),
    proteinGrams: real('protein_grams').notNull(),
    carbsGrams: real('carbs_grams').notNull(),
    fatGrams: real('fat_grams').notNull(),
    fiberGrams: real('fiber_grams'),
    sodiumMilligrams: real('sodium_milligrams'),
    publishedAt: text('published_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('uq_recipe_versions_number').on(t.recipeId, t.versionNumber)],
)

export const recipeIngredients = sqliteTable(
  'recipe_ingredients',
  {
    id: text('id').primaryKey(),
    recipeVersionId: text('recipe_version_id')
      .notNull()
      .references(() => recipeVersions.id),
    foodId: text('food_id'),
    servingId: text('serving_id'),
    quantity: real('quantity'),
    unit: text('unit').notNull(),
    label: text('label').notNull(),
    note: text('note'),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [index('idx_recipe_ingredients_version').on(t.recipeVersionId, t.sortOrder)],
)

export const recipeSteps = sqliteTable(
  'recipe_steps',
  {
    id: text('id').primaryKey(),
    recipeVersionId: text('recipe_version_id')
      .notNull()
      .references(() => recipeVersions.id),
    body: text('body').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [index('idx_recipe_steps_version').on(t.recipeVersionId, t.sortOrder)],
)

export const foodLogEntries = sqliteTable(
  'food_log_entries',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    logDate: text('log_date').notNull(),
    mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),
    itemType: text('item_type', { enum: ['food', 'recipe'] }).notNull(),
    foodId: text('food_id'),
    servingId: text('serving_id'),
    recipeId: text('recipe_id').references(() => recipes.id),
    recipeVersionId: text('recipe_version_id').references(() => recipeVersions.id),
    quantity: real('quantity').notNull(),
    quantityUnit: text('quantity_unit').notNull(),
    snapshotDisplayName: text('snapshot_display_name').notNull(),
    snapshotCalories: real('snapshot_calories').notNull(),
    snapshotProteinGrams: real('snapshot_protein_grams').notNull(),
    snapshotCarbsGrams: real('snapshot_carbs_grams').notNull(),
    snapshotFatGrams: real('snapshot_fat_grams').notNull(),
    snapshotFiberGrams: real('snapshot_fiber_grams'),
    snapshotSodiumMilligrams: real('snapshot_sodium_milligrams'),
    snapshotSourceLabel: text('snapshot_source_label'),
    snapshotCapturedAt: text('snapshot_captured_at').notNull(),
    sourceType: text('source_type').notNull(),
    privacyDomain: text('privacy_domain').notNull().default('private_user_data'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_food_logs_user_date').on(t.userId, t.logDate),
    index('idx_food_logs_user_created').on(t.userId, t.createdAt, t.id),
  ],
)

export const goals = sqliteTable(
  'goals',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    calories: real('calories').notNull(),
    proteinGrams: real('protein_grams').notNull(),
    carbsGrams: real('carbs_grams').notNull(),
    fatGrams: real('fat_grams').notNull(),
    fiberGrams: real('fiber_grams'),
    sodiumMilligrams: real('sodium_milligrams'),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_goals_user_dates').on(t.userId, t.startDate)],
)

export type FoodRow = typeof foods.$inferSelect
export type FoodServingRow = typeof foodServings.$inferSelect
export type FoodLogEntryRow = typeof foodLogEntries.$inferSelect
export type RecipeRow = typeof recipes.$inferSelect
export type SavedRecipeRow = typeof savedRecipes.$inferSelect
export type RecipeVersionRow = typeof recipeVersions.$inferSelect
export type RecipeIngredientRow = typeof recipeIngredients.$inferSelect
export type RecipeStepRow = typeof recipeSteps.$inferSelect
export type GoalRow = typeof goals.$inferSelect
export type FollowRow = typeof follows.$inferSelect
export type FriendRequestRow = typeof friendRequests.$inferSelect
export type FriendshipRow = typeof friendships.$inferSelect
export type UserRow = typeof users.$inferSelect
