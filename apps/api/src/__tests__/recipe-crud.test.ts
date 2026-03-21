/**
 * Integration tests for Recipe CRUD route logic in recipe.ts.
 *
 * We replicate slugify, uniqueSlug, and calculateMacros verbatim from
 * routes/recipe.ts, using an in-memory SQLite db with migrations applied.
 *
 * Coverage:
 *  1. Create recipe: inserts recipe + ingredients, calculates per-serving macros (1-decimal rounding)
 *  2. Read recipe: query by ID returns correct ingredient count and macro fields
 *  3. Update ingredients → macros recalculate: replacing ingredients changes macro values
 *  4. Delete recipe → cascade: deleting recipe removes recipeIngredient rows
 *  5. Slug generation: slugify converts title to kebab-case using \w regex
 *  6. Slug uniqueness: second recipe with same title gets numeric suffix via uniqueSlug
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, inArray, and } from "drizzle-orm";
import * as schema from "../../../../packages/db/src/schema";

let client: Client;
let db: ReturnType<typeof drizzle>;

// ---------------------------------------------------------------------------
// DB setup with migrations
// ---------------------------------------------------------------------------
beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  db = drizzle(client, { schema });

  const { readFileSync, readdirSync } = await import("fs");
  const { resolve } = await import("path");
  const migrationDir = resolve(__dirname, "../../../../packages/db/migrations");
  const files = readdirSync(migrationDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sqlText = readFileSync(resolve(migrationDir, file), "utf-8");
    const statements = sqlText
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("no such index") && !msg.includes("no such column")) {
          throw err;
        }
      }
    }
  }
});

afterAll(() => {
  client.close();
});

// ---------------------------------------------------------------------------
// Replicas of route logic from routes/recipe.ts
// ---------------------------------------------------------------------------

/** Verbatim from routes/recipe.ts */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Verbatim from routes/recipe.ts */
async function uniqueSlug(userId: string, baseSlug: string, excludeId?: string): Promise<string> {
  const { recipe } = schema;
  let slug = baseSlug;
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await db
      .select({ id: recipe.id })
      .from(recipe)
      .where(and(eq(recipe.userId, userId), eq(recipe.slug, candidate)))
      .get();
    if (!existing || existing.id === excludeId) return candidate;
    suffix++;
  }
}

/** Verbatim from routes/recipe.ts */
async function calculateMacros(ingredientIds: string[], servings: number) {
  const { recipeIngredient, serving } = schema;
  if (ingredientIds.length === 0) return { calories: 0, protein: 0, carb: 0, fat: 0 };

  const ingredients = await db
    .select({
      quantity: recipeIngredient.quantity,
      servingId: recipeIngredient.servingId,
      servingCalories: serving.calories,
      servingProtein: serving.protein,
      servingCarb: serving.carb,
      servingFat: serving.fat,
    })
    .from(recipeIngredient)
    .leftJoin(serving, eq(recipeIngredient.servingId, serving.id))
    .where(inArray(recipeIngredient.id, ingredientIds))
    .all();

  let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
  for (const ing of ingredients) {
    const qty = ing.quantity ?? 1;
    totalCal += (ing.servingCalories ?? 0) * qty;
    totalPro += (ing.servingProtein ?? 0) * qty;
    totalCarb += (ing.servingCarb ?? 0) * qty;
    totalFat += (ing.servingFat ?? 0) * qty;
  }

  const div = servings || 1;
  return {
    calories: Math.round((totalCal / div) * 10) / 10,
    protein: Math.round((totalPro / div) * 10) / 10,
    carb: Math.round((totalCarb / div) * 10) / 10,
    fat: Math.round((totalFat / div) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function insertUser(): Promise<string> {
  const id = createId();
  await db.insert(schema.user).values({
    id,
    email: `user-${id}@test.com`,
    username: `user-${id}`,
    passwordHash: "x",
  });
  return id;
}

async function insertFoodWithServing(
  name: string,
  macros: { calories: number; protein: number; carb: number; fat: number },
): Promise<{ foodId: string; servingId: string }> {
  const foodId = createId();
  const servingId = createId();
  const now = new Date().toISOString();
  await db.insert(schema.food).values({
    id: foodId,
    name,
    brandName: null,
    barcode: null,
    source: "usda",
    sourceId: null,
    sourceRevision: null,
    isVerified: false,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.serving).values({
    id: servingId,
    foodId,
    description: "1 serving",
    amountGrams: null,
    isDefault: true,
    calories: macros.calories,
    protein: macros.protein,
    carb: macros.carb,
    fat: macros.fat,
    createdAt: now,
    updatedAt: now,
  });
  return { foodId, servingId };
}

async function insertRecipe(
  userId: string,
  title: string,
  opts: {
    calories?: number;
    protein?: number;
    carb?: number;
    fat?: number;
    servings?: number;
  } = {},
): Promise<string> {
  const id = createId();
  const slug = slugify(title) + "-" + id.slice(0, 4);
  const now = new Date().toISOString();
  await db.insert(schema.recipe).values({
    id,
    userId,
    slug,
    title,
    description: null,
    instructions: null,
    servings: opts.servings ?? 1,
    prepTime: null,
    cookTime: null,
    imageUrl: null,
    isPublic: false,
    tags: [],
    caloriesPerServing: opts.calories ?? 0,
    proteinPerServing: opts.protein ?? 0,
    carbPerServing: opts.carb ?? 0,
    fatPerServing: opts.fat ?? 0,
    forkCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function insertIngredient(
  recipeId: string,
  servingId: string | null,
  quantity: number,
  label: string,
  sortOrder: number,
): Promise<string> {
  const id = createId();
  await db.insert(schema.recipeIngredient).values({
    id,
    recipeId,
    foodId: null,
    servingId,
    quantity,
    unit: null,
    label,
    sortOrder,
  });
  return id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Recipe CRUD integration", () => {
  // -------------------------------------------------------------------------
  // 1. Create recipe: inserts rows, calculates macros with 1-decimal rounding
  // -------------------------------------------------------------------------
  it("creates recipe with 3 ingredients and calculates per-serving macros to 1 decimal", async () => {
    const userId = await insertUser();
    // 3 foods with known macros
    const { servingId: s1 } = await insertFoodWithServing("FoodA", { calories: 100, protein: 10, carb: 20, fat: 5 });
    const { servingId: s2 } = await insertFoodWithServing("FoodB", { calories: 200, protein: 20, carb: 30, fat: 10 });
    const { servingId: s3 } = await insertFoodWithServing("FoodC", { calories: 150, protein: 15, carb: 25, fat: 7 });

    const recipeId = createId();
    const now = new Date().toISOString();
    const servings = 3;

    // Insert recipe shell
    await db.insert(schema.recipe).values({
      id: recipeId,
      userId,
      slug: "crud-test-recipe",
      title: "CRUD Test Recipe",
      description: null,
      instructions: null,
      servings,
      prepTime: null,
      cookTime: null,
      imageUrl: null,
      isPublic: false,
      tags: [],
      caloriesPerServing: 0,
      proteinPerServing: 0,
      carbPerServing: 0,
      fatPerServing: 0,
      forkCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Insert 3 ingredients (qty=1 each) and collect IDs
    const ingId1 = await insertIngredient(recipeId, s1, 1, "FoodA", 0);
    const ingId2 = await insertIngredient(recipeId, s2, 1, "FoodB", 1);
    const ingId3 = await insertIngredient(recipeId, s3, 2, "FoodC", 2); // qty=2

    // Run calculateMacros
    // totals: cal=100+200+300=600, pro=10+20+30=60, carb=20+30+50=100, fat=5+10+14=29
    const macros = await calculateMacros([ingId1, ingId2, ingId3], servings);

    expect(macros.calories).toBe(Math.round((600 / 3) * 10) / 10); // 200
    expect(macros.protein).toBe(Math.round((60 / 3) * 10) / 10);   // 20
    expect(macros.carb).toBe(Math.round((100 / 3) * 10) / 10);     // 33.3
    expect(macros.fat).toBe(Math.round((29 / 3) * 10) / 10);       // 9.7

    // Update recipe with computed macros
    await db
      .update(schema.recipe)
      .set({
        caloriesPerServing: macros.calories,
        proteinPerServing: macros.protein,
        carbPerServing: macros.carb,
        fatPerServing: macros.fat,
      })
      .where(eq(schema.recipe.id, recipeId));

    const row = await db.select().from(schema.recipe).where(eq(schema.recipe.id, recipeId)).get();
    expect(row).toBeDefined();
    expect(row!.caloriesPerServing).toBe(200);
    expect(row!.carbPerServing).toBe(33.3);
    expect(row!.fatPerServing).toBe(9.7);
  });

  // -------------------------------------------------------------------------
  // 2. Read recipe: query by ID returns ingredients with correct count + macro fields
  // -------------------------------------------------------------------------
  it("reads recipe by ID and returns ingredients array with correct count and macro fields", async () => {
    const userId = await insertUser();
    const { servingId: s1 } = await insertFoodWithServing("ReadFoodA", { calories: 100, protein: 10, carb: 20, fat: 5 });
    const { servingId: s2 } = await insertFoodWithServing("ReadFoodB", { calories: 200, protein: 20, carb: 30, fat: 10 });

    const recipeId = await insertRecipe(userId, "Read Test Recipe", { calories: 150, protein: 15, carb: 25, fat: 7.5, servings: 2 });
    await insertIngredient(recipeId, s1, 1, "ReadFoodA", 0);
    await insertIngredient(recipeId, s2, 1, "ReadFoodB", 1);

    // Query recipe
    const recipeRow = await db.select().from(schema.recipe).where(eq(schema.recipe.id, recipeId)).get();
    expect(recipeRow).toBeDefined();
    expect(recipeRow!.title).toBe("Read Test Recipe");
    expect(recipeRow!.servings).toBe(2);
    expect(typeof recipeRow!.caloriesPerServing).toBe("number");
    expect(typeof recipeRow!.proteinPerServing).toBe("number");
    expect(typeof recipeRow!.carbPerServing).toBe("number");
    expect(typeof recipeRow!.fatPerServing).toBe("number");

    // Query ingredients
    const ingredientRows = await db
      .select()
      .from(schema.recipeIngredient)
      .where(eq(schema.recipeIngredient.recipeId, recipeId))
      .all();
    expect(ingredientRows).toHaveLength(2);
    const labels = ingredientRows.map((r) => r.label);
    expect(labels).toContain("ReadFoodA");
    expect(labels).toContain("ReadFoodB");
  });

  // -------------------------------------------------------------------------
  // 3. Update ingredients → macros recalculate with different values
  // -------------------------------------------------------------------------
  it("replacing ingredients and re-running calculateMacros produces different macro values", async () => {
    const userId = await insertUser();
    const { servingId: s1 } = await insertFoodWithServing("UpdateFoodA", { calories: 100, protein: 10, carb: 20, fat: 5 });
    const { servingId: s2 } = await insertFoodWithServing("UpdateFoodB", { calories: 500, protein: 50, carb: 60, fat: 25 });

    const recipeId = await insertRecipe(userId, "Update Macro Recipe", { servings: 2 });
    const ingId1 = await insertIngredient(recipeId, s1, 1, "UpdateFoodA", 0);

    const macrosBefore = await calculateMacros([ingId1], 2);
    // cal=50, pro=5, carb=10, fat=2.5

    // Replace ingredients: delete old, insert new higher-calorie ingredient
    await db.delete(schema.recipeIngredient).where(eq(schema.recipeIngredient.recipeId, recipeId));
    const ingId2 = await insertIngredient(recipeId, s2, 2, "UpdateFoodB", 0); // qty=2

    const macrosAfter = await calculateMacros([ingId2], 2);
    // cal=(500*2)/2=500, pro=50, carb=60, fat=25

    expect(macrosAfter.calories).not.toBe(macrosBefore.calories);
    expect(macrosAfter.protein).not.toBe(macrosBefore.protein);
    expect(macrosAfter.calories).toBe(500);
    expect(macrosAfter.protein).toBe(50);
    expect(macrosAfter.carb).toBe(60);
    expect(macrosAfter.fat).toBe(25);
  });

  // -------------------------------------------------------------------------
  // 4. Delete recipe → cascade removes recipeIngredient rows
  // -------------------------------------------------------------------------
  it("deletes recipe and cascades to recipeIngredient rows", async () => {
    const userId = await insertUser();
    const { servingId } = await insertFoodWithServing("CascadeFood", { calories: 100, protein: 10, carb: 20, fat: 5 });

    const recipeId = await insertRecipe(userId, "Cascade Test Recipe");
    await insertIngredient(recipeId, servingId, 1, "CascadeFood", 0);
    await insertIngredient(recipeId, servingId, 2, "CascadeFood2", 1);

    // Verify rows exist before deletion
    const beforeRows = await db
      .select()
      .from(schema.recipeIngredient)
      .where(eq(schema.recipeIngredient.recipeId, recipeId))
      .all();
    expect(beforeRows).toHaveLength(2);

    // Delete recipe
    await db.delete(schema.recipe).where(eq(schema.recipe.id, recipeId));

    // Verify recipe is gone
    const recipeRow = await db.select().from(schema.recipe).where(eq(schema.recipe.id, recipeId)).get();
    expect(recipeRow).toBeUndefined();

    // Verify cascade removed ingredient rows
    const afterRows = await db
      .select()
      .from(schema.recipeIngredient)
      .where(eq(schema.recipeIngredient.recipeId, recipeId))
      .all();
    expect(afterRows).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 5. Slug generation: slugify uses \w regex (keeps underscores, strips specials)
  // -------------------------------------------------------------------------
  it("slugify converts title to kebab-case using \\w regex", () => {
    // \w keeps word chars (a-z, 0-9, underscore); strips other special chars
    expect(slugify("Grilled Chicken")).toBe("grilled-chicken");
    expect(slugify("  Spicy   Pasta  ")).toBe("spicy-pasta");
    expect(slugify("Salmon & Veggies!")).toBe("salmon-veggies");
    // underscores are collapsed into hyphens via [\s_]+ replacement
    expect(slugify("My_Recipe_Name")).toBe("my-recipe-name");
    // numbers preserved
    expect(slugify("Recipe #1 (Version 2)")).toBe("recipe-1-version-2");
    // long title truncated to 80 chars
    expect(slugify("a".repeat(100))).toHaveLength(80);
  });

  // -------------------------------------------------------------------------
  // 6. Slug uniqueness: uniqueSlug appends numeric suffix on collision
  // -------------------------------------------------------------------------
  it("uniqueSlug returns base slug for first recipe, suffix for collisions", async () => {
    const userId = await insertUser();
    const baseSlug = "unique-slug-test-recipe";
    const now = new Date().toISOString();

    // Insert first recipe with exact base slug
    const id1 = createId();
    await db.insert(schema.recipe).values({
      id: id1,
      userId,
      slug: baseSlug,
      title: "Unique Slug Test Recipe",
      description: null,
      instructions: null,
      servings: 1,
      prepTime: null,
      cookTime: null,
      imageUrl: null,
      isPublic: false,
      tags: [],
      caloriesPerServing: 0,
      proteinPerServing: 0,
      carbPerServing: 0,
      fatPerServing: 0,
      forkCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // uniqueSlug for same user + same baseSlug should return suffix-1
    const slug2 = await uniqueSlug(userId, baseSlug);
    expect(slug2).toBe(`${baseSlug}-1`);

    // Insert second recipe with that slug
    const id2 = createId();
    await db.insert(schema.recipe).values({
      id: id2,
      userId,
      slug: slug2,
      title: "Unique Slug Test Recipe",
      description: null,
      instructions: null,
      servings: 1,
      prepTime: null,
      cookTime: null,
      imageUrl: null,
      isPublic: false,
      tags: [],
      caloriesPerServing: 0,
      proteinPerServing: 0,
      carbPerServing: 0,
      fatPerServing: 0,
      forkCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Third collision should yield suffix-2
    const slug3 = await uniqueSlug(userId, baseSlug);
    expect(slug3).toBe(`${baseSlug}-2`);
  });
});
