/**
 * Tests for manageRecipeExecutor and buildUIComponents manage_recipe case in chat.ts.
 *
 * Because manageRecipeExecutor is not exported, we replicate its logic
 * verbatim here — the same approach used in create-recipe.test.ts.
 *
 * Coverage:
 *  1. exact match (case-insensitive): returns found=true with full recipe shape
 *  2. fuzzy fallback: LIKE match when no exact match
 *  3. no match: returns found=false, matches=[]
 *  4. multiple fuzzy matches: returns found=false, matches array
 *  5. exact wins over fuzzy: exact title does not return fuzzy siblings
 *  6. ingredients assembled: label+quantity+unit formatted correctly
 *  7. ingredients without unit: quantity+label format
 *  8. is_owned always true for own recipes
 *  9. mode=view: edit_mode false in result
 * 10. mode=edit: edit_mode true in result
 * 11. buildUIComponents single match → recipe_detail with edit_mode
 * 12. buildUIComponents multiple matches → recipe_card list
 * 13. buildUIComponents no match → no components
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, asc, sql } from "drizzle-orm";
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
// Replica of manageRecipeExecutor (verbatim logic from chat.ts)
// ---------------------------------------------------------------------------
async function manageRecipeExecutor(userId: string, query: string, mode: "view" | "edit") {
  const { recipe, recipeIngredient } = schema;

  const exactRows = await db
    .select({
      id: recipe.id,
      title: recipe.title,
      servings: recipe.servings,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinPerServing: recipe.proteinPerServing,
      carbPerServing: recipe.carbPerServing,
      fatPerServing: recipe.fatPerServing,
      instructions: recipe.instructions,
    })
    .from(recipe)
    .where(and(eq(recipe.userId, userId), sql`lower(${recipe.title}) = lower(${query})`))
    .all();

  const rows =
    exactRows.length > 0
      ? exactRows
      : await db
          .select({
            id: recipe.id,
            title: recipe.title,
            servings: recipe.servings,
            caloriesPerServing: recipe.caloriesPerServing,
            proteinPerServing: recipe.proteinPerServing,
            carbPerServing: recipe.carbPerServing,
            fatPerServing: recipe.fatPerServing,
            instructions: recipe.instructions,
          })
          .from(recipe)
          .where(and(eq(recipe.userId, userId), sql`lower(${recipe.title}) LIKE lower(${"%" + query + "%"})`))
          .all();

  if (rows.length === 0) {
    return { found: false, matches: [] };
  }

  if (rows.length > 1) {
    return {
      found: false,
      matches: rows.map((r) => ({
        recipe_id: r.id,
        name: r.title,
        servings: r.servings,
        calories: r.caloriesPerServing,
        protein: r.proteinPerServing,
        carb: r.carbPerServing,
        fat: r.fatPerServing,
      })),
    };
  }

  const row = rows[0]!;
  const ingredientRows = await db
    .select({
      label: recipeIngredient.label,
      quantity: recipeIngredient.quantity,
      unit: recipeIngredient.unit,
      sortOrder: recipeIngredient.sortOrder,
    })
    .from(recipeIngredient)
    .where(eq(recipeIngredient.recipeId, row.id))
    .orderBy(asc(recipeIngredient.sortOrder))
    .all();

  const ingredients = ingredientRows.map((i) =>
    i.unit ? `${i.quantity} ${i.unit} ${i.label}` : `${i.quantity} ${i.label}`,
  );

  return {
    found: true,
    mode,
    recipe: {
      recipe_id: row.id,
      name: row.title,
      servings: row.servings,
      calories: row.caloriesPerServing,
      protein: row.proteinPerServing,
      carb: row.carbPerServing,
      fat: row.fatPerServing,
      ingredients,
      instructions: row.instructions ?? null,
      is_owned: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Replica of buildUIComponents manage_recipe case (verbatim from chat.ts)
// ---------------------------------------------------------------------------
type UIComponent = { type: string; props: Record<string, unknown> };

function buildUIComponents(toolResults: Array<{ toolName: string; result: unknown }>): UIComponent[] {
  const components: UIComponent[] = [];
  for (const { toolName, result } of toolResults) {
    if (toolName === "manage_recipe") {
      const r = result as {
        found: boolean;
        mode?: "view" | "edit";
        recipe?: {
          recipe_id: string;
          name: string;
          servings: number;
          calories: number | null;
          protein: number | null;
          carb: number | null;
          fat: number | null;
          ingredients: string[];
          instructions: string | null;
          is_owned: boolean;
        };
        matches?: Array<{
          recipe_id: string;
          name: string;
          servings: number;
          calories: number | null;
          protein: number | null;
          carb: number | null;
          fat: number | null;
        }>;
      };
      if (r.found && r.recipe) {
        components.push({
          type: "recipe_detail",
          props: {
            recipe_id: r.recipe.recipe_id,
            name: r.recipe.name,
            servings: r.recipe.servings,
            calories: r.recipe.calories,
            protein: r.recipe.protein,
            carb: r.recipe.carb,
            fat: r.recipe.fat,
            ingredients: r.recipe.ingredients,
            instructions: r.recipe.instructions,
            is_owned: r.recipe.is_owned,
            edit_mode: r.mode === "edit",
          },
        });
      } else if (!r.found && r.matches?.length) {
        for (const match of r.matches) {
          components.push({
            type: "recipe_card",
            props: {
              recipe_id: match.recipe_id,
              name: match.name,
              servings: match.servings,
              calories: match.calories,
              protein: match.protein,
              carb: match.carb,
              fat: match.fat,
            },
          });
        }
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

async function insertRecipe(
  userId: string,
  title: string,
  opts: {
    calories?: number;
    protein?: number;
    carb?: number;
    fat?: number;
    servings?: number;
    instructions?: string;
  } = {},
): Promise<string> {
  const id = createId();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + id.slice(0, 4);
  const now = new Date().toISOString();
  await db.insert(schema.recipe).values({
    id,
    userId,
    slug,
    title,
    description: null,
    instructions: opts.instructions ?? null,
    servings: opts.servings ?? 1,
    prepTime: null,
    cookTime: null,
    imageUrl: null,
    isPublic: false,
    tags: [],
    caloriesPerServing: opts.calories ?? 400,
    proteinPerServing: opts.protein ?? 30,
    carbPerServing: opts.carb ?? 40,
    fatPerServing: opts.fat ?? 10,
    forkCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function insertIngredient(
  recipeId: string,
  label: string,
  quantity: number,
  unit: string | null,
  sortOrder: number,
): Promise<void> {
  await db.insert(schema.recipeIngredient).values({
    id: createId(),
    recipeId,
    foodId: null,
    servingId: null,
    quantity,
    unit,
    label,
    sortOrder,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("manageRecipeExecutor", () => {
  // -------------------------------------------------------------------------
  // 1. exact match (case-insensitive) — returns found=true with correct shape
  // -------------------------------------------------------------------------
  it("returns found=true with recipe detail on exact case-insensitive title match", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId, "Chicken Bowl", { calories: 500, protein: 45, carb: 40, fat: 12 });

    const result = await manageRecipeExecutor(userId, "CHICKEN BOWL", "view");

    expect(result.found).toBe(true);
    if (!result.found || !result.recipe) throw new Error("Expected found recipe");
    expect(result.recipe.recipe_id).toBe(recipeId);
    expect(result.recipe.name).toBe("Chicken Bowl");
    expect(result.recipe.is_owned).toBe(true);
    expect(result.mode).toBe("view");
  });

  // -------------------------------------------------------------------------
  // 2. fuzzy fallback: LIKE match when no exact match
  // -------------------------------------------------------------------------
  it("falls back to fuzzy LIKE match when no exact match", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId, "Spicy Pasta Marinara", { calories: 600 });

    const result = await manageRecipeExecutor(userId, "pasta", "view");

    expect(result.found).toBe(true);
    if (!result.found || !result.recipe) throw new Error("Expected found recipe");
    expect(result.recipe.recipe_id).toBe(recipeId);
  });

  // -------------------------------------------------------------------------
  // 3. no match: returns found=false, matches=[]
  // -------------------------------------------------------------------------
  it("returns found=false with empty matches when no recipe matches", async () => {
    const userId = await insertUser();

    const result = await manageRecipeExecutor(userId, "xyzzy_nonexistent_recipe", "view");

    expect(result.found).toBe(false);
    expect(result.matches).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 4. multiple fuzzy matches: returns found=false, matches array with all
  // -------------------------------------------------------------------------
  it("returns found=false with matches array when multiple recipes match fuzzy query", async () => {
    const userId = await insertUser();
    await insertRecipe(userId, "Salmon Salad", { calories: 350 });
    await insertRecipe(userId, "Greek Salad", { calories: 200 });
    await insertRecipe(userId, "Caesar Salad", { calories: 280 });

    const result = await manageRecipeExecutor(userId, "Salad", "view");

    expect(result.found).toBe(false);
    expect(result.matches).toBeDefined();
    expect(result.matches!.length).toBeGreaterThanOrEqual(3);
    const names = result.matches!.map((m) => m.name);
    expect(names).toContain("Salmon Salad");
    expect(names).toContain("Greek Salad");
    expect(names).toContain("Caesar Salad");
  });

  // -------------------------------------------------------------------------
  // 5. exact wins over fuzzy — only exact title returned (not fuzzy siblings)
  // -------------------------------------------------------------------------
  it("returns single exact match and ignores fuzzy siblings", async () => {
    const userId = await insertUser();
    await insertRecipe(userId, "Bowl");
    await insertRecipe(userId, "Big Bowl Surprise");

    // exact match on "Bowl" — should return single result, not both
    const result = await manageRecipeExecutor(userId, "Bowl", "view");

    expect(result.found).toBe(true);
    if (!result.found || !result.recipe) throw new Error("Expected found recipe");
    expect(result.recipe.name).toBe("Bowl");
  });

  // -------------------------------------------------------------------------
  // 6. ingredients assembled: label+quantity+unit formatted correctly
  // -------------------------------------------------------------------------
  it("formats ingredients as 'quantity unit label' when unit present", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId, "Oat Smoothie");
    await insertIngredient(recipeId, "Oats", 0.5, "cup", 0);
    await insertIngredient(recipeId, "Banana", 1, null, 1);

    const result = await manageRecipeExecutor(userId, "Oat Smoothie", "view");

    expect(result.found).toBe(true);
    if (!result.found || !result.recipe) throw new Error("Expected found recipe");
    expect(result.recipe.ingredients).toContain("0.5 cup Oats");
  });

  // -------------------------------------------------------------------------
  // 7. ingredients without unit: quantity+label format
  // -------------------------------------------------------------------------
  it("formats ingredients as 'quantity label' when no unit", async () => {
    const userId = await insertUser();
    const recipeId = await insertRecipe(userId, "Banana Bowl");
    await insertIngredient(recipeId, "Banana", 2, null, 0);

    const result = await manageRecipeExecutor(userId, "Banana Bowl", "view");

    expect(result.found).toBe(true);
    if (!result.found || !result.recipe) throw new Error("Expected found recipe");
    expect(result.recipe.ingredients).toContain("2 Banana");
  });

  // -------------------------------------------------------------------------
  // 8. is_owned always true for own recipes
  // -------------------------------------------------------------------------
  it("sets is_owned=true for user's own recipe", async () => {
    const userId = await insertUser();
    await insertRecipe(userId, "My Own Recipe");

    const result = await manageRecipeExecutor(userId, "My Own Recipe", "view");

    expect(result.found).toBe(true);
    if (!result.found || !result.recipe) throw new Error("Expected found recipe");
    expect(result.recipe.is_owned).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 9. mode=view: mode field is "view" in result
  // -------------------------------------------------------------------------
  it("returns mode='view' when mode param is 'view'", async () => {
    const userId = await insertUser();
    await insertRecipe(userId, "View Mode Recipe");

    const result = await manageRecipeExecutor(userId, "View Mode Recipe", "view");

    expect(result.found).toBe(true);
    expect(result.mode).toBe("view");
  });

  // -------------------------------------------------------------------------
  // 10. mode=edit: mode field is "edit" in result
  // -------------------------------------------------------------------------
  it("returns mode='edit' when mode param is 'edit'", async () => {
    const userId = await insertUser();
    await insertRecipe(userId, "Edit Mode Recipe");

    const result = await manageRecipeExecutor(userId, "Edit Mode Recipe", "edit");

    expect(result.found).toBe(true);
    expect(result.mode).toBe("edit");
  });
});

// ---------------------------------------------------------------------------
// buildUIComponents tests — manage_recipe case
// ---------------------------------------------------------------------------
describe("buildUIComponents — manage_recipe case", () => {
  // -------------------------------------------------------------------------
  // 11. single match → recipe_detail with edit_mode flag
  // -------------------------------------------------------------------------
  it("emits recipe_detail with edit_mode=false for view mode", () => {
    const result = {
      found: true,
      mode: "view" as const,
      recipe: {
        recipe_id: "r1",
        name: "Chicken Bowl",
        servings: 2,
        calories: 500,
        protein: 45,
        carb: 40,
        fat: 12,
        ingredients: ["1 cup Chicken", "0.5 cup Rice"],
        instructions: "Cook chicken. Serve over rice.",
        is_owned: true,
      },
    };
    const components = buildUIComponents([{ toolName: "manage_recipe", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("recipe_detail");
    const props = components[0]!.props;
    expect(props.recipe_id).toBe("r1");
    expect(props.name).toBe("Chicken Bowl");
    expect(props.edit_mode).toBe(false);
    expect(props.is_owned).toBe(true);
    expect(Array.isArray(props.ingredients)).toBe(true);
  });

  it("emits recipe_detail with edit_mode=true for edit mode", () => {
    const result = {
      found: true,
      mode: "edit" as const,
      recipe: {
        recipe_id: "r2",
        name: "Pasta",
        servings: 4,
        calories: 600,
        protein: 25,
        carb: 80,
        fat: 15,
        ingredients: ["400g pasta", "2 cups sauce"],
        instructions: null,
        is_owned: true,
      },
    };
    const components = buildUIComponents([{ toolName: "manage_recipe", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("recipe_detail");
    expect(components[0]!.props.edit_mode).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 12. multiple matches → recipe_card list
  // -------------------------------------------------------------------------
  it("emits recipe_card for each match when found=false and matches present", () => {
    const result = {
      found: false,
      matches: [
        { recipe_id: "r1", name: "Salmon Salad", servings: 1, calories: 350, protein: 30, carb: 10, fat: 15 },
        { recipe_id: "r2", name: "Greek Salad", servings: 2, calories: 200, protein: 5, carb: 20, fat: 10 },
      ],
    };
    const components = buildUIComponents([{ toolName: "manage_recipe", result }]);
    expect(components).toHaveLength(2);
    expect(components[0]!.type).toBe("recipe_card");
    expect(components[0]!.props.recipe_id).toBe("r1");
    expect(components[1]!.type).toBe("recipe_card");
    expect(components[1]!.props.recipe_id).toBe("r2");
  });

  // -------------------------------------------------------------------------
  // 13. no match → no components
  // -------------------------------------------------------------------------
  it("emits nothing when found=false and matches is empty", () => {
    const result = { found: false, matches: [] };
    const components = buildUIComponents([{ toolName: "manage_recipe", result }]);
    expect(components).toHaveLength(0);
  });

  it("does not emit for other tool names", () => {
    const result = { found: true, mode: "view", recipe: { recipe_id: "r1", name: "T", servings: 1, calories: 100, protein: 10, carb: 10, fat: 5, ingredients: [], instructions: null, is_owned: true } };
    const components = buildUIComponents([{ toolName: "create_recipe", result }]);
    expect(components).toHaveLength(0);
  });
});
