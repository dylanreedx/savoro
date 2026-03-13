import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import * as schema from "../schema";

let client: Client;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  db = drizzle(client, { schema });

  // Create tables from migration SQL
  const { readFileSync } = await import("fs");
  const { resolve } = await import("path");
  const migrationDir = resolve(__dirname, "../../migrations");
  const { readdirSync } = await import("fs");
  const files = readdirSync(migrationDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = readFileSync(resolve(migrationDir, file), "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
  }
});

afterAll(() => {
  client.close();
});

describe("schema", () => {
  it("inserts and reads a user", async () => {
    const id = createId();
    await db.insert(schema.user).values({
      id,
      email: "test@example.com",
      username: "testuser",
      passwordHash: "hashed",
    });
    const [found] = await db.select().from(schema.user).where(eq(schema.user.id, id));
    expect(found.email).toBe("test@example.com");
    expect(found.username).toBe("testuser");
    expect(found.isPublic).toBe(false);
    expect(found.createdAt).toBeTruthy();
  });

  it("inserts food with serving and logs it", async () => {
    const userId = createId();
    await db.insert(schema.user).values({
      id: userId,
      email: "logger@example.com",
      username: "logger",
      passwordHash: "hashed",
    });

    const foodId = createId();
    await db.insert(schema.food).values({
      id: foodId,
      name: "Chicken Breast",
      source: "usda",
      sourceId: "171077",
      isVerified: true,
    });

    const servingId = createId();
    await db.insert(schema.serving).values({
      id: servingId,
      foodId,
      description: "100g",
      amountGrams: 100,
      isDefault: true,
      calories: 165,
      protein: 31,
      carb: 0,
      fat: 3.6,
    });

    const logId = createId();
    await db.insert(schema.foodLog).values({
      id: logId,
      userId,
      foodId,
      servingId,
      quantity: 1.5,
      meal: "lunch",
      date: "2026-03-12",
    });

    const [log] = await db.select().from(schema.foodLog).where(eq(schema.foodLog.id, logId));
    expect(log.meal).toBe("lunch");
    expect(log.quantity).toBe(1.5);
  });

  it("creates a recipe with ingredients and fork", async () => {
    const userId = createId();
    await db.insert(schema.user).values({
      id: userId,
      email: "chef@example.com",
      username: "chef",
      passwordHash: "hashed",
    });

    const recipeId = createId();
    await db.insert(schema.recipe).values({
      id: recipeId,
      userId,
      slug: "grilled-chicken",
      title: "Grilled Chicken",
      servings: 4,
      isPublic: true,
      caloriesPerServing: 200,
      proteinPerServing: 35,
    });

    const ingredientId = createId();
    await db.insert(schema.recipeIngredient).values({
      id: ingredientId,
      recipeId,
      label: "chicken breast",
      quantity: 500,
      unit: "g",
      sortOrder: 0,
    });

    const forkedRecipeId = createId();
    await db.insert(schema.recipe).values({
      id: forkedRecipeId,
      userId,
      slug: "spicy-grilled-chicken",
      title: "Spicy Grilled Chicken",
      servings: 4,
    });

    await db.insert(schema.recipeFork).values({
      id: createId(),
      originalRecipeId: recipeId,
      forkedRecipeId,
    });

    const [recipe] = await db.select().from(schema.recipe).where(eq(schema.recipe.id, recipeId));
    expect(recipe.title).toBe("Grilled Chicken");
    expect(recipe.isPublic).toBe(true);
  });

  it("stores chat messages with JSON fields", async () => {
    const userId = createId();
    await db.insert(schema.user).values({
      id: userId,
      email: "chatter@example.com",
      username: "chatter",
      passwordHash: "hashed",
    });

    const msgId = createId();
    await db.insert(schema.chatMessage).values({
      id: msgId,
      userId,
      role: "assistant",
      content: "Logged 1 serving of chicken breast",
      uiComponents: [{ type: "food_card", foodId: "abc" }],
      date: "2026-03-12",
    });

    const [msg] = await db.select().from(schema.chatMessage).where(eq(schema.chatMessage.id, msgId));
    expect(msg.role).toBe("assistant");
    expect(msg.uiComponents).toEqual([{ type: "food_card", foodId: "abc" }]);
  });

  it("tracks favorites with use count", async () => {
    const userId = createId();
    await db.insert(schema.user).values({
      id: userId,
      email: "fav@example.com",
      username: "fav",
      passwordHash: "hashed",
    });

    const foodId = createId();
    await db.insert(schema.food).values({
      id: foodId,
      name: "Oatmeal",
      source: "user",
    });

    const favId = createId();
    await db.insert(schema.favorite).values({
      id: favId,
      userId,
      foodId,
      useCount: 5,
      lastUsedAt: "2026-03-12T10:00:00Z",
    });

    const [fav] = await db.select().from(schema.favorite).where(eq(schema.favorite.id, favId));
    expect(fav.useCount).toBe(5);
    expect(fav.foodId).toBe(foodId);
  });

  it("supports user goals with date ranges", async () => {
    const userId = createId();
    await db.insert(schema.user).values({
      id: userId,
      email: "goals@example.com",
      username: "goals",
      passwordHash: "hashed",
    });

    const goalId = createId();
    await db.insert(schema.userGoal).values({
      id: goalId,
      userId,
      calories: 2000,
      protein: 150,
      carb: 200,
      fat: 70,
      fiber: 30,
      startDate: "2026-03-01",
    });

    const [goal] = await db.select().from(schema.userGoal).where(eq(schema.userGoal.id, goalId));
    expect(goal.calories).toBe(2000);
    expect(goal.endDate).toBeNull();
  });
});
