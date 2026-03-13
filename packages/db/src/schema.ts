import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const timestamps = {
  createdAt: text("created_at").default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`).notNull(),
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const user = sqliteTable("user", {
  id: text("id").primaryKey(), // cuid2
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(), // SHA-256
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  deviceInfo: text("device_info"),
});

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export const userGoal = sqliteTable("user_goal", {
  id: text("id").primaryKey(), // cuid2
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  calories: integer("calories"),
  protein: integer("protein"),
  carb: integer("carb"),
  fat: integer("fat"),
  fiber: integer("fiber"),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // null = current
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------
export const food = sqliteTable(
  "food",
  {
    id: text("id").primaryKey(), // cuid2
    name: text("name").notNull(),
    brandName: text("brand_name"),
    barcode: text("barcode"),
    source: text("source", { enum: ["off", "usda", "user", "recipe"] }).notNull(),
    sourceId: text("source_id"),
    sourceRevision: integer("source_revision"),
    isVerified: integer("is_verified", { mode: "boolean" }).default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index("food_barcode_idx").on(table.barcode),
    index("food_source_source_id_idx").on(table.source, table.sourceId),
  ]
);

// ---------------------------------------------------------------------------
// Serving
// ---------------------------------------------------------------------------
export const serving = sqliteTable("serving", {
  id: text("id").primaryKey(), // cuid2
  foodId: text("food_id")
    .notNull()
    .references(() => food.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amountGrams: real("amount_grams"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
  // Core macros
  calories: real("calories"),
  protein: real("protein"),
  carb: real("carb"),
  fat: real("fat"),
  // Extended nutrients
  saturatedFat: real("saturated_fat"),
  transFat: real("trans_fat"),
  polyunsaturatedFat: real("polyunsaturated_fat"),
  monounsaturatedFat: real("monounsaturated_fat"),
  cholesterol: real("cholesterol"),
  sodium: real("sodium"),
  potassium: real("potassium"),
  fiber: real("fiber"),
  sugar: real("sugar"),
  addedSugars: real("added_sugars"),
  vitaminD: real("vitamin_d"),
  vitaminA: real("vitamin_a"),
  vitaminC: real("vitamin_c"),
  calcium: real("calcium"),
  iron: real("iron"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Food Log
// ---------------------------------------------------------------------------
export const foodLog = sqliteTable("food_log", {
  id: text("id").primaryKey(), // cuid2
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  foodId: text("food_id")
    .notNull()
    .references(() => food.id),
  servingId: text("serving_id")
    .notNull()
    .references(() => serving.id),
  quantity: real("quantity").notNull().default(1),
  meal: text("meal", { enum: ["breakfast", "lunch", "dinner", "snack"] }).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  chatMessageId: text("chat_message_id"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Recipe
// ---------------------------------------------------------------------------
export const recipe = sqliteTable(
  "recipe",
  {
    id: text("id").primaryKey(), // cuid2
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    instructions: text("instructions"), // markdown
    servings: integer("servings").default(1).notNull(),
    prepTime: integer("prep_time"), // minutes
    cookTime: integer("cook_time"), // minutes
    imageUrl: text("image_url"),
    isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
    tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
    // Denormalized per-serving macros
    caloriesPerServing: real("calories_per_serving"),
    proteinPerServing: real("protein_per_serving"),
    carbPerServing: real("carb_per_serving"),
    fatPerServing: real("fat_per_serving"),
    forkCount: integer("fork_count").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("recipe_user_slug_idx").on(table.userId, table.slug),
  ]
);

// ---------------------------------------------------------------------------
// Recipe Ingredient
// ---------------------------------------------------------------------------
export const recipeIngredient = sqliteTable("recipe_ingredient", {
  id: text("id").primaryKey(), // cuid2
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  foodId: text("food_id").references(() => food.id), // nullable for free-text
  servingId: text("serving_id").references(() => serving.id),
  quantity: real("quantity"),
  unit: text("unit"),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// ---------------------------------------------------------------------------
// Recipe Fork
// ---------------------------------------------------------------------------
export const recipeFork = sqliteTable("recipe_fork", {
  id: text("id").primaryKey(), // cuid2
  originalRecipeId: text("original_recipe_id")
    .notNull()
    .references(() => recipe.id),
  forkedRecipeId: text("forked_recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
export const chatMessage = sqliteTable("chat_message", {
  id: text("id").primaryKey(), // cuid2
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system", "tool"] }).notNull(),
  content: text("content"),
  toolCalls: text("tool_calls", { mode: "json" }).$type<unknown[]>(),
  uiComponents: text("ui_components", { mode: "json" }).$type<unknown[]>(),
  attachments: text("attachments", { mode: "json" }).$type<unknown[]>(),
  date: text("date").notNull(), // YYYY-MM-DD
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Favorite
// ---------------------------------------------------------------------------
export const favorite = sqliteTable("favorite", {
  id: text("id").primaryKey(), // cuid2
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  foodId: text("food_id").references(() => food.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id").references(() => recipe.id, { onDelete: "cascade" }),
  useCount: integer("use_count").default(0).notNull(),
  lastUsedAt: text("last_used_at"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type UserGoal = typeof userGoal.$inferSelect;
export type NewUserGoal = typeof userGoal.$inferInsert;
export type Food = typeof food.$inferSelect;
export type NewFood = typeof food.$inferInsert;
export type Serving = typeof serving.$inferSelect;
export type NewServing = typeof serving.$inferInsert;
export type FoodLog = typeof foodLog.$inferSelect;
export type NewFoodLog = typeof foodLog.$inferInsert;
export type Recipe = typeof recipe.$inferSelect;
export type NewRecipe = typeof recipe.$inferInsert;
export type RecipeIngredient = typeof recipeIngredient.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredient.$inferInsert;
export type RecipeFork = typeof recipeFork.$inferSelect;
export type NewRecipeFork = typeof recipeFork.$inferInsert;
export type ChatMessage = typeof chatMessage.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
export type Favorite = typeof favorite.$inferSelect;
export type NewFavorite = typeof favorite.$inferInsert;
