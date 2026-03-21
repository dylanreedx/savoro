/**
 * Tests for createRecipeExecutor and buildUIComponents create_recipe case in chat.ts.
 *
 * Because createRecipeExecutor is not exported, we replicate its logic
 * verbatim here — the same approach used in suggest-foods.test.ts.
 *
 * Coverage:
 *  1. happy path: creates recipe + recipeIngredient rows, returns correct shape
 *  2. null macro handling: ingredient with no matching food → zeros in macros
 *  3. per-serving macro division: total macros divided by servings
 *  4. slug generation: title → kebab-case slug
 *  5. slug collision dedup: suffix -2, -3 on collision
 *  6. macro rounding: per-serving values are Math.rounded in return
 *  7. multi-ingredient accumulation: calories/protein/carb/fat summed across ingredients
 *  8. buildUIComponents recipe_card: emits recipe_card when created=true
 *  9. buildUIComponents recipe_card: emits nothing when created=false
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, sql } from "drizzle-orm";
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
// Inline replica of searchFoodExecutor (only DB lookup, no OFF fallback)
// ---------------------------------------------------------------------------
async function searchFoodExecutorLocal(query: string, limit: number = 1) {
  const pattern = `%${query}%`;
  const { food, serving } = schema;
  const { desc, asc } = await import("drizzle-orm");
  const localRows = await db
    .select({
      id: food.id,
      name: food.name,
      brandName: food.brandName,
      servingId: serving.id,
      servingDescription: serving.description,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(food)
    .leftJoin(serving, eq(serving.foodId, food.id))
    .where(sql`${food.name} LIKE ${pattern} OR ${food.brandName} LIKE ${pattern}`)
    .orderBy(desc(serving.isDefault), asc(serving.id))
    .limit(limit)
    .all();

  const seen = new Set<string>();
  const results = localRows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return {
    foods: results.map((r) => ({
      foodId: r.id,
      name: r.name,
      brandName: r.brandName,
      servingId: r.servingId,
      servingDescription: r.servingDescription,
      calories: r.calories,
      protein: r.protein,
      carb: r.carb,
      fat: r.fat,
    })),
  };
}

// ---------------------------------------------------------------------------
// Replica of createRecipeExecutor (verbatim logic from chat.ts ~line 1023)
// ---------------------------------------------------------------------------
async function createRecipeExecutor(
  userId: string,
  title: string,
  servings: number,
  ingredients: Array<{ name: string; quantity: number; unit?: string }>,
) {
  const { recipe, recipeIngredient } = schema;
  const now = new Date().toISOString();

  type ResolvedIngredient = {
    name: string;
    quantity: number;
    unit?: string;
    foodId: string | null;
    servingId: string | null;
    calories: number;
    protein: number;
    carb: number;
    fat: number;
  };

  const resolved: ResolvedIngredient[] = [];

  for (const ing of ingredients) {
    const searchResult = await searchFoodExecutorLocal(ing.name, 1);
    const match = searchResult.foods[0];
    if (match) {
      resolved.push({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        foodId: match.foodId,
        servingId: match.servingId ?? null,
        calories: (match.calories ?? 0) * ing.quantity,
        protein: (match.protein ?? 0) * ing.quantity,
        carb: (match.carb ?? 0) * ing.quantity,
        fat: (match.fat ?? 0) * ing.quantity,
      });
    } else {
      resolved.push({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        foodId: null,
        servingId: null,
        calories: 0,
        protein: 0,
        carb: 0,
        fat: 0,
      });
    }
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarb = 0;
  let totalFat = 0;
  for (const r of resolved) {
    totalCalories += r.calories;
    totalProtein += r.protein;
    totalCarb += r.carb;
    totalFat += r.fat;
  }

  const caloriesPerServing = totalCalories / servings;
  const proteinPerServing = totalProtein / servings;
  const carbPerServing = totalCarb / servings;
  const fatPerServing = totalFat / servings;

  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const existingSlugs = await db
    .select({ slug: recipe.slug })
    .from(recipe)
    .where(and(eq(recipe.userId, userId), sql`${recipe.slug} LIKE ${`${baseSlug}%`}`))
    .all();

  let slug = baseSlug;
  if (existingSlugs.some((r) => r.slug === slug)) {
    let suffix = 2;
    while (existingSlugs.some((r) => r.slug === `${baseSlug}-${suffix}`)) {
      suffix++;
    }
    slug = `${baseSlug}-${suffix}`;
  }

  const recipeId = createId();
  await db.insert(recipe).values({
    id: recipeId,
    userId,
    slug,
    title,
    description: null,
    instructions: null,
    servings,
    prepTime: null,
    cookTime: null,
    imageUrl: null,
    isPublic: false,
    tags: [],
    caloriesPerServing,
    proteinPerServing,
    carbPerServing,
    fatPerServing,
    forkCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  for (let i = 0; i < resolved.length; i++) {
    const r = resolved[i]!;
    await db.insert(recipeIngredient).values({
      id: createId(),
      recipeId,
      foodId: r.foodId,
      servingId: r.servingId,
      quantity: r.quantity,
      unit: r.unit ?? null,
      label: r.name,
      sortOrder: i,
    });
  }

  return {
    created: true,
    recipeId,
    title,
    slug,
    servings,
    calories: Math.round(caloriesPerServing),
    protein: Math.round(proteinPerServing),
    carb: Math.round(carbPerServing),
    fat: Math.round(fatPerServing),
  };
}

// ---------------------------------------------------------------------------
// Replica of buildUIComponents create_recipe case (verbatim from chat.ts)
// ---------------------------------------------------------------------------
type UIComponent = { type: string; props: Record<string, unknown> };

function buildUIComponents(toolResults: Array<{ toolName: string; result: unknown }>): UIComponent[] {
  const components: UIComponent[] = [];
  for (const { toolName, result } of toolResults) {
    if (toolName === "create_recipe") {
      const r = result as {
        created: boolean;
        recipeId?: string;
        title?: string;
        slug?: string;
        servings?: number;
        calories?: number;
        protein?: number;
        carb?: number;
        fat?: number;
      };
      if (r.created) {
        components.push({
          type: "recipe_card",
          props: {
            recipeId: r.recipeId,
            title: r.title,
            slug: r.slug,
            servings: r.servings,
            calories: r.calories,
            protein: r.protein,
            carb: r.carb,
            fat: r.fat,
          },
        });
      }
    }
  }
  return components;
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("createRecipeExecutor", () => {
  // -------------------------------------------------------------------------
  // 1. happy path: inserts recipe + ingredient rows, returns correct shape
  // -------------------------------------------------------------------------
  it("creates recipe and recipeIngredient rows and returns correct shape", async () => {
    const userId = await insertUser();
    const { foodId, servingId } = await insertFoodWithServing("Chicken Breast", {
      calories: 200,
      protein: 40,
      carb: 0,
      fat: 4,
    });

    const result = await createRecipeExecutor(userId, "My Chicken Recipe", 2, [
      { name: "Chicken Breast", quantity: 1, unit: "piece" },
    ]);

    expect(result.created).toBe(true);
    expect(result.title).toBe("My Chicken Recipe");
    expect(result.servings).toBe(2);
    expect(typeof result.recipeId).toBe("string");
    expect(result.slug).toBe("my-chicken-recipe");

    // Verify recipe row in DB
    const recipeRow = await db
      .select()
      .from(schema.recipe)
      .where(eq(schema.recipe.id, result.recipeId))
      .get();
    expect(recipeRow).toBeDefined();
    expect(recipeRow!.title).toBe("My Chicken Recipe");
    expect(recipeRow!.userId).toBe(userId);
    expect(recipeRow!.servings).toBe(2);

    // Verify recipeIngredient row in DB
    const ingredientRows = await db
      .select()
      .from(schema.recipeIngredient)
      .where(eq(schema.recipeIngredient.recipeId, result.recipeId))
      .all();
    expect(ingredientRows).toHaveLength(1);
    expect(ingredientRows[0]!.label).toBe("Chicken Breast");
    expect(ingredientRows[0]!.foodId).toBe(foodId);
    expect(ingredientRows[0]!.servingId).toBe(servingId);
    expect(ingredientRows[0]!.quantity).toBe(1);
    expect(ingredientRows[0]!.unit).toBe("piece");
    expect(ingredientRows[0]!.sortOrder).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 2. null macro handling: unresolved ingredient → zeros
  // -------------------------------------------------------------------------
  it("handles ingredient with no matching food — contributes zero macros", async () => {
    const userId = await insertUser();

    const result = await createRecipeExecutor(userId, "Mystery Soup", 1, [
      { name: "xyzzy_nonexistent_ingredient_abc", quantity: 2 },
    ]);

    expect(result.created).toBe(true);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carb).toBe(0);
    expect(result.fat).toBe(0);

    // recipeIngredient should still be inserted with null foodId/servingId
    const ingredientRows = await db
      .select()
      .from(schema.recipeIngredient)
      .where(eq(schema.recipeIngredient.recipeId, result.recipeId))
      .all();
    expect(ingredientRows).toHaveLength(1);
    expect(ingredientRows[0]!.foodId).toBeNull();
    expect(ingredientRows[0]!.servingId).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 3. per-serving macro division
  // -------------------------------------------------------------------------
  it("divides total macros by servings to get per-serving values", async () => {
    const userId = await insertUser();
    await insertFoodWithServing("Rice", { calories: 300, protein: 6, carb: 66, fat: 1 });

    // 1 serving of rice, recipe makes 3 servings → 300/3=100 cal per serving
    const result = await createRecipeExecutor(userId, "Rice Bowl", 3, [
      { name: "Rice", quantity: 1 },
    ]);

    expect(result.calories).toBe(100);
    expect(result.protein).toBe(2);
    expect(result.carb).toBe(22);
    expect(result.fat).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 4. slug generation: title → kebab-case slug
  // -------------------------------------------------------------------------
  it("generates correct kebab-case slug from title", async () => {
    const userId = await insertUser();

    const result = await createRecipeExecutor(userId, "Grilled Salmon & Veggies!", 1, []);

    expect(result.slug).toBe("grilled-salmon-veggies");
  });

  // -------------------------------------------------------------------------
  // 5. slug collision dedup: appends -2 on first collision, -3 on second
  // -------------------------------------------------------------------------
  it("appends -2 suffix on slug collision", async () => {
    const userId = await insertUser();

    const first = await createRecipeExecutor(userId, "Pasta Bake", 2, []);
    expect(first.slug).toBe("pasta-bake");

    const second = await createRecipeExecutor(userId, "Pasta Bake", 2, []);
    expect(second.slug).toBe("pasta-bake-2");

    const third = await createRecipeExecutor(userId, "Pasta Bake", 2, []);
    expect(third.slug).toBe("pasta-bake-3");
  });

  // -------------------------------------------------------------------------
  // 6. macro rounding: returned values are integers
  // -------------------------------------------------------------------------
  it("returns Math.rounded per-serving macros (integer values)", async () => {
    const userId = await insertUser();
    // calories=100, protein=7, carb=11, fat=3 for 1 quantity
    // divide by 3 servings → 33.33.., 2.33.., 3.66.., 1.0
    await insertFoodWithServing("Mixed Food", { calories: 100, protein: 7, carb: 11, fat: 3 });

    const result = await createRecipeExecutor(userId, "Rounded Recipe", 3, [
      { name: "Mixed Food", quantity: 1 },
    ]);

    expect(Number.isInteger(result.calories)).toBe(true);
    expect(Number.isInteger(result.protein)).toBe(true);
    expect(Number.isInteger(result.carb)).toBe(true);
    expect(Number.isInteger(result.fat)).toBe(true);

    expect(result.calories).toBe(Math.round(100 / 3));
    expect(result.protein).toBe(Math.round(7 / 3));
    expect(result.carb).toBe(Math.round(11 / 3));
    expect(result.fat).toBe(Math.round(3 / 3));
  });

  // -------------------------------------------------------------------------
  // 7. multi-ingredient accumulation
  // -------------------------------------------------------------------------
  it("accumulates macros from multiple ingredients correctly", async () => {
    const userId = await insertUser();
    await insertFoodWithServing("IngredA", { calories: 100, protein: 10, carb: 20, fat: 5 });
    await insertFoodWithServing("IngredB", { calories: 200, protein: 20, carb: 30, fat: 10 });

    // 1 qty each, recipe makes 1 serving → total = 300 cal, 30 prot, 50 carb, 15 fat
    const result = await createRecipeExecutor(userId, "Multi Ingredient", 1, [
      { name: "IngredA", quantity: 1 },
      { name: "IngredB", quantity: 1 },
    ]);

    expect(result.calories).toBe(300);
    expect(result.protein).toBe(30);
    expect(result.carb).toBe(50);
    expect(result.fat).toBe(15);

    // Should have 2 ingredient rows
    const rows = await db
      .select()
      .from(schema.recipeIngredient)
      .where(eq(schema.recipeIngredient.recipeId, result.recipeId))
      .all();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.label === "IngredA")).toBeDefined();
    expect(rows.find((r) => r.label === "IngredB")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 8. quantity multiplier: ingredient quantity scales macros
  // -------------------------------------------------------------------------
  it("multiplies ingredient macros by quantity", async () => {
    const userId = await insertUser();
    await insertFoodWithServing("Oats", { calories: 100, protein: 5, carb: 20, fat: 2 });

    // 3 servings of oats → total 300 cal, recipe 1 serving → 300 per serving
    const result = await createRecipeExecutor(userId, "Big Oat Bowl", 1, [
      { name: "Oats", quantity: 3 },
    ]);

    expect(result.calories).toBe(300);
    expect(result.protein).toBe(15);
    expect(result.carb).toBe(60);
    expect(result.fat).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// buildUIComponents tests — create_recipe case
// ---------------------------------------------------------------------------
describe("buildUIComponents — create_recipe case", () => {
  it("emits recipe_card when created=true with all fields", () => {
    const result = {
      created: true,
      recipeId: "rec123",
      title: "Test Recipe",
      slug: "test-recipe",
      servings: 4,
      calories: 350,
      protein: 25,
      carb: 40,
      fat: 10,
    };
    const components = buildUIComponents([{ toolName: "create_recipe", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("recipe_card");
    const props = components[0]!.props;
    expect(props.recipeId).toBe("rec123");
    expect(props.title).toBe("Test Recipe");
    expect(props.slug).toBe("test-recipe");
    expect(props.servings).toBe(4);
    expect(props.calories).toBe(350);
    expect(props.protein).toBe(25);
    expect(props.carb).toBe(40);
    expect(props.fat).toBe(10);
  });

  it("emits nothing when created=false", () => {
    const result = { created: false };
    const components = buildUIComponents([{ toolName: "create_recipe", result }]);
    expect(components).toHaveLength(0);
  });

  it("does not emit recipe_card for other tool names", () => {
    const result = { created: true, recipeId: "r1", title: "T", slug: "t", servings: 1 };
    const components = buildUIComponents([{ toolName: "search_recipes", result }]);
    expect(components).toHaveLength(0);
  });

  it("emits multiple recipe_cards when multiple create_recipe results present", () => {
    const r1 = { created: true, recipeId: "r1", title: "R1", slug: "r1", servings: 2, calories: 100 };
    const r2 = { created: true, recipeId: "r2", title: "R2", slug: "r2", servings: 4, calories: 200 };
    const components = buildUIComponents([
      { toolName: "create_recipe", result: r1 },
      { toolName: "create_recipe", result: r2 },
    ]);
    expect(components).toHaveLength(2);
    expect(components[0]!.props.recipeId).toBe("r1");
    expect(components[1]!.props.recipeId).toBe("r2");
  });
});
