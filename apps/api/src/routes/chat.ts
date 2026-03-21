import { Hono } from "hono";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, tool, type ModelMessage } from "ai";
import { z } from "zod";
import {
  db,
  chatMessage,
  food,
  serving,
  foodLog,
  userGoal,
  favorite,
  recipe,
  recipeIngredient,
} from "@savoro/db";
import { searchOFF, normalizeOFFProduct, getOFFProduct } from "@savoro/food-data";
import { buildSystemPrompt, smartRoute } from "@savoro/ai";
import type { UIComponent } from "@savoro/ai";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const chatRoutes = new Hono<AuthEnv>();

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------------------------------------------------------------------------
// GET /chat/messages?date=YYYY-MM-DD
// ---------------------------------------------------------------------------
chatRoutes.get("/messages", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);

  const messages = await db
    .select()
    .from(chatMessage)
    .where(and(eq(chatMessage.userId, userId), eq(chatMessage.date, date)))
    .orderBy(chatMessage.createdAt)
    .all();

  return c.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      uiComponents: m.uiComponents,
      createdAt: m.createdAt,
    })),
  });
});

// ---------------------------------------------------------------------------
// POST /chat/message — main agent endpoint with SSE streaming
// ---------------------------------------------------------------------------
chatRoutes.post("/message", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{ content: string; attachments?: unknown[] }>();
  const { content, attachments } = body;
  const today = new Date().toISOString().slice(0, 10);

  if (!content?.trim()) {
    return c.json({ error: "Message content is required" }, 400);
  }

  // Save user message
  const userMsg = {
    id: createId(),
    userId,
    role: "user" as const,
    content,
    toolCalls: null,
    uiComponents: null,
    attachments: attachments ?? null,
    date: today,
  };
  await db.insert(chatMessage).values(userMsg);

  // --- Barcode smart routing: direct lookup when barcode attachment present ---
  const barcodeAttachment = (attachments as { type: string; value: string }[] | undefined)
    ?.find((a) => a.type === "barcode");

  if (barcodeAttachment) {
    const result = await lookupBarcodeExecutor(barcodeAttachment.value);
    let assistantContent: string | null = null;
    let uiComponents: UIComponent[] | null = null;

    if (result.found) {
      uiComponents = [{
        type: "food_card",
        props: {
          foodId: result.foodId,
          name: result.name,
          brandName: result.brandName,
          servingId: result.servingId,
          servingDescription: result.servingDescription,
          calories: result.calories,
          protein: result.protein,
          carb: result.carb,
          fat: result.fat,
          quantity: 1,
        },
      }];
    } else {
      assistantContent = `I couldn't find a product for barcode ${barcodeAttachment.value}. Try searching by name instead.`;
    }

    const assistantMsg = {
      id: createId(),
      userId,
      role: "assistant" as const,
      content: assistantContent,
      toolCalls: null,
      uiComponents,
      attachments: null,
      date: today,
    };
    await db.insert(chatMessage).values(assistantMsg);

    return c.json({
      userMessage: {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        uiComponents: null,
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        uiComponents: assistantMsg.uiComponents,
        createdAt: new Date().toISOString(),
      },
    });
  }

  // --- Smart routing: bypass LLM for simple food descriptions ---
  const route = smartRoute(content);
  if (route.routed) {
    const result = await handleSmartRoute(route, userId, today);
    const assistantMsg = {
      id: createId(),
      userId,
      role: "assistant" as const,
      content: result.content,
      toolCalls: null,
      uiComponents: result.uiComponents,
      attachments: null,
      date: today,
    };
    await db.insert(chatMessage).values(assistantMsg);

    return c.json({
      userMessage: {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        uiComponents: null,
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        uiComponents: assistantMsg.uiComponents,
        createdAt: new Date().toISOString(),
      },
    });
  }

  // --- LLM path: load context and stream response ---
  const context = await loadUserContext(userId, today);
  const systemPrompt = buildSystemPrompt(context);

  // Load recent conversation for context (last 20 messages)
  const history = await db
    .select()
    .from(chatMessage)
    .where(and(eq(chatMessage.userId, userId), eq(chatMessage.date, today)))
    .orderBy(desc(chatMessage.createdAt))
    .limit(20)
    .all();

  const conversationMessages: ModelMessage[] = history
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content ?? "",
    }));

  // Build tools with execute functions that capture userId/today
  const tools = buildTools(userId, today);
  const collectedToolResults: Array<{ toolName: string; result: unknown }> = [];

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt,
    messages: conversationMessages,
    tools,
    stopWhen: stepCountIs(5),
    onStepFinish: ({ toolResults }) => {
      if (toolResults) {
        for (const tr of toolResults) {
          collectedToolResults.push({ toolName: tr.toolName as string, result: (tr as { output: unknown }).output });
        }
      }
    },
    onFinish: async ({ text }) => {
      const uiComponents = buildUIComponents(collectedToolResults);

      const assistantMsg = {
        id: createId(),
        userId,
        role: "assistant" as const,
        content: text || null,
        toolCalls: collectedToolResults.length
          ? (collectedToolResults as unknown[])
          : null,
        uiComponents: uiComponents.length ? uiComponents : null,
        attachments: null,
        date: today,
      };
      await db.insert(chatMessage).values(assistantMsg);
    },
  });

  // Return SSE streaming response
  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// ---------------------------------------------------------------------------
// Build tools with execute functions (captures userId/today via closure)
// ---------------------------------------------------------------------------
function buildTools(userId: string, today: string) {
  return {
    search_food: tool({
      description: "Search for a food by name or description. Returns matching foods with nutrition info.",
      inputSchema: z.object({
        query: z.string().describe("Food name or description to search for"),
        limit: z.number().int().min(1).max(20).default(5).describe("Max results to return"),
      }),
      execute: async ({ query, limit }) => searchFoodExecutor(query, limit),
    }),

    lookup_barcode: tool({
      description: "Look up a food product by barcode. Returns nutrition info if found.",
      inputSchema: z.object({
        barcode: z.string().describe("The barcode string to look up"),
      }),
      execute: async ({ barcode }) => lookupBarcodeExecutor(barcode),
    }),

    log_food: tool({
      description: "Log a food item to the user's daily intake. Call after the user confirms a food selection.",
      inputSchema: z.object({
        foodId: z.string().describe("The food ID to log"),
        servingId: z.string().describe("The serving ID to use"),
        quantity: z.number().positive().default(1).describe("Number of servings"),
        meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("Meal category — infer from time of day if not specified"),
      }),
      execute: async ({ foodId, servingId, quantity, meal }) =>
        logFoodExecutor(userId, today, foodId, servingId, quantity, meal),
    }),

    get_daily_summary: tool({
      description: "Get the user's macro totals and goals for today. Use when the user asks about their progress.",
      inputSchema: z.object({}),
      execute: async () => getDailySummaryExecutor(userId, today),
    }),

    get_recent_foods: tool({
      description: "Get the user's recently logged and favorite foods for quick re-logging.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(8).describe("Max results"),
      }),
      execute: async ({ limit }) => getRecentFoodsExecutor(userId, limit),
    }),

    delete_log: tool({
      description: "Delete a food log entry. Use when the user wants to remove something they logged.",
      inputSchema: z.object({
        logId: z.string().describe("The food log entry ID to delete"),
      }),
      execute: async ({ logId }) => deleteLogExecutor(userId, logId),
    }),

    get_date_log: tool({
      description:
        "Get all food log entries for a specific date. Use when the user asks about what they ate on a past day, wants to re-log yesterday's meals, or references a previous day's intake.",
      inputSchema: z.object({
        date: z.string().describe("Date in YYYY-MM-DD format. Resolve relative dates like 'yesterday' before calling."),
        meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional().describe("Optional meal filter"),
      }),
      execute: async ({ date, meal }) => getDateLogExecutor(userId, date, meal),
    }),

    search_recipes: tool({
      description: "Search the user's saved recipes by name. Returns matching recipes with per-serving macros.",
      inputSchema: z.object({
        query: z.string().describe("Recipe name or keyword to search for"),
        limit: z.number().int().min(1).max(10).default(5).describe("Max results to return"),
      }),
      execute: async ({ query, limit }) => searchRecipesExecutor(userId, query, limit),
    }),

    log_recipe: tool({
      description: "Log a serving of one of the user's recipes. Creates a food log entry using the recipe's per-serving macros. Call after the user confirms a recipe selection.",
      inputSchema: z.object({
        recipeId: z.string().describe("The recipe ID to log"),
        quantity: z.number().positive().default(1).describe("Number of servings"),
        meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("Meal category — infer from time of day if not specified"),
      }),
      execute: async ({ recipeId, quantity, meal }) =>
        logRecipeExecutor(userId, today, recipeId, quantity, meal),
    }),

    plan_meal: tool({
      description:
        "Project macros for a hypothetical meal — use when the user asks 'if I eat X' or 'what if I have X for dinner'. Searches for the food and calculates current + projected macro totals without logging anything.",
      inputSchema: z.object({
        query: z.string().describe("Food name or description to project"),
        quantity: z.number().positive().default(1).describe("Number of servings"),
      }),
      execute: async ({ query, quantity }) => planMealExecutor(userId, today, query, quantity),
    }),

    suggest_foods: tool({
      description:
        "Suggest foods to help the user meet their macro goals. Use when the user says things like 'need 40g protein', 'what should I eat', or 'what can I have'. Calculates the biggest macro shortfall and returns top food suggestions.",
      inputSchema: z.object({
        query: z.string().optional().describe("Optional user query for context (e.g. 'high protein snack')"),
      }),
      execute: async () => suggestFoodsExecutor(userId, today),
    }),

    create_recipe: tool({
      description:
        "Create and save a new recipe from the conversation. Use when the user describes a recipe they want to save — with a title, list of ingredients, and number of servings. Searches for each ingredient's nutrition, calculates per-serving macros, and saves the recipe.",
      inputSchema: z.object({
        title: z.string().describe("Recipe name"),
        servings: z.number().int().positive().describe("Number of servings the recipe makes"),
        ingredients: z.array(
          z.object({
            name: z.string().describe("Ingredient name"),
            quantity: z.number().positive().describe("Amount of this ingredient"),
            unit: z.string().optional().describe("Unit (e.g. 'g', 'oz', 'tbsp')"),
          }),
        ).describe("List of ingredients"),
      }),
      execute: async ({ title, servings, ingredients }) =>
        createRecipeExecutor(userId, title, servings, ingredients),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tool executor implementations
// ---------------------------------------------------------------------------
async function searchFoodExecutor(query: string, limit: number = 5) {
  const pattern = `%${query}%`;
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

  if (results.length < 3) {
    try {
      const offProducts = await searchOFF(query, limit);
      const normalized = offProducts
        .map(normalizeOFFProduct)
        .filter((r): r is NonNullable<typeof r> => r !== null);

      for (const item of normalized.slice(0, limit - results.length)) {
        await db.insert(food).values(item.food).onConflictDoNothing();
        await db.insert(serving).values(item.serving).onConflictDoNothing();

        results.push({
          id: item.food.id,
          name: item.food.name,
          brandName: item.food.brandName,
          servingId: item.serving.id,
          servingDescription: item.serving.description,
          calories: item.serving.calories,
          protein: item.serving.protein,
          carb: item.serving.carb,
          fat: item.serving.fat,
        });
      }
    } catch (err) {
      console.error("OFF search error:", err);
    }
  }

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

async function lookupBarcodeExecutor(barcode: string) {
  const cached = await db.select().from(food).where(eq(food.barcode, barcode)).get();

  if (cached) {
    const servings = await db.select().from(serving).where(eq(serving.foodId, cached.id)).orderBy(desc(serving.isDefault), asc(serving.id)).all();
    if (!servings.length) return { found: false, error: 'No nutrition data available' };
    const s = servings[0];
    return {
      found: true,
      foodId: cached.id,
      name: cached.name,
      brandName: cached.brandName,
      servingId: s?.id,
      servingDescription: s?.description,
      calories: s?.calories,
      protein: s?.protein,
      carb: s?.carb,
      fat: s?.fat,
    };
  }

  try {
    const offProduct = await getOFFProduct(barcode);
    if (!offProduct) return { found: false };

    const normalized = normalizeOFFProduct(offProduct);
    if (!normalized) return { found: false };

    await db.insert(food).values(normalized.food).onConflictDoNothing();
    await db.insert(serving).values(normalized.serving).onConflictDoNothing();

    return {
      found: true,
      foodId: normalized.food.id,
      name: normalized.food.name,
      brandName: normalized.food.brandName,
      servingId: normalized.serving.id,
      servingDescription: normalized.serving.description,
      calories: normalized.serving.calories,
      protein: normalized.serving.protein,
      carb: normalized.serving.carb,
      fat: normalized.serving.fat,
    };
  } catch {
    return { found: false };
  }
}

async function logFoodExecutor(
  userId: string,
  today: string,
  foodId: string,
  servingId: string,
  quantity: number,
  meal: string,
) {
  const logEntry = {
    id: createId(),
    userId,
    foodId,
    servingId,
    quantity,
    meal: meal as "breakfast" | "lunch" | "dinner" | "snack",
    date: today,
    chatMessageId: null,
  };

  await db.insert(foodLog).values(logEntry);

  // Update favorite useCount
  const existing = await db
    .select()
    .from(favorite)
    .where(and(eq(favorite.userId, userId), eq(favorite.foodId, foodId)))
    .get();

  if (existing) {
    await db
      .update(favorite)
      .set({ useCount: existing.useCount + 1, lastUsedAt: new Date().toISOString() })
      .where(eq(favorite.id, existing.id));
  } else {
    await db.insert(favorite).values({
      id: createId(),
      userId,
      foodId,
      recipeId: null,
      useCount: 1,
      lastUsedAt: new Date().toISOString(),
    });
  }

  return getDailySummaryExecutor(userId, today);
}

async function getDailySummaryExecutor(userId: string, today: string) {
  const logs = await db
    .select({
      quantity: foodLog.quantity,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(foodLog)
    .innerJoin(serving, eq(foodLog.servingId, serving.id))
    .where(and(eq(foodLog.userId, userId), eq(foodLog.date, today)))
    .all();

  const totals = { calories: 0, protein: 0, carb: 0, fat: 0 };
  for (const log of logs) {
    totals.calories += (log.calories ?? 0) * log.quantity;
    totals.protein += (log.protein ?? 0) * log.quantity;
    totals.carb += (log.carb ?? 0) * log.quantity;
    totals.fat += (log.fat ?? 0) * log.quantity;
  }

  const goal = await db
    .select()
    .from(userGoal)
    .where(and(eq(userGoal.userId, userId), isNull(userGoal.endDate)))
    .get();

  return {
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carb: Math.round(totals.carb),
      fat: Math.round(totals.fat),
    },
    goals: goal
      ? { calories: goal.calories, protein: goal.protein, carb: goal.carb, fat: goal.fat }
      : null,
  };
}

async function getRecentFoodsExecutor(userId: string, limit: number = 8) {
  const favorites = await db
    .select({
      foodId: favorite.foodId,
      name: food.name,
      servingId: serving.id,
      calories: serving.calories,
    })
    .from(favorite)
    .innerJoin(food, eq(favorite.foodId, food.id))
    .leftJoin(serving, eq(serving.foodId, food.id))
    .where(eq(favorite.userId, userId))
    .orderBy(desc(favorite.useCount))
    .limit(limit)
    .all();

  return {
    foods: favorites.map((f) => ({
      foodId: f.foodId,
      servingId: f.servingId,
      name: f.name,
      calories: f.calories,
    })),
  };
}

async function deleteLogExecutor(userId: string, logId: string) {
  const existing = await db
    .select()
    .from(foodLog)
    .where(and(eq(foodLog.id, logId), eq(foodLog.userId, userId)))
    .get();

  if (!existing) {
    return { deleted: false, error: "Log entry not found" };
  }

  await db.delete(foodLog).where(eq(foodLog.id, logId));
  return { deleted: true };
}

async function getDateLogExecutor(userId: string, date: string, meal?: string) {
  let query = db
    .select({
      logId: foodLog.id,
      foodId: foodLog.foodId,
      servingId: foodLog.servingId,
      quantity: foodLog.quantity,
      meal: foodLog.meal,
      name: food.name,
      brandName: food.brandName,
      servingDescription: serving.description,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(foodLog)
    .innerJoin(food, eq(foodLog.foodId, food.id))
    .innerJoin(serving, eq(foodLog.servingId, serving.id))
    .where(
      meal
        ? and(eq(foodLog.userId, userId), eq(foodLog.date, date), eq(foodLog.meal, meal as "breakfast" | "lunch" | "dinner" | "snack"))
        : and(eq(foodLog.userId, userId), eq(foodLog.date, date)),
    )
    .orderBy(foodLog.createdAt);

  const entries = await query.all();

  const totals = { calories: 0, protein: 0, carb: 0, fat: 0 };
  for (const e of entries) {
    totals.calories += (e.calories ?? 0) * e.quantity;
    totals.protein += (e.protein ?? 0) * e.quantity;
    totals.carb += (e.carb ?? 0) * e.quantity;
    totals.fat += (e.fat ?? 0) * e.quantity;
  }

  const goal = await db
    .select()
    .from(userGoal)
    .where(and(eq(userGoal.userId, userId), isNull(userGoal.endDate)))
    .get();

  return {
    date,
    meal: meal ?? null,
    entries: entries.map((e) => ({
      logId: e.logId,
      foodId: e.foodId,
      servingId: e.servingId,
      quantity: e.quantity,
      meal: e.meal,
      name: e.name,
      brandName: e.brandName,
      servingDescription: e.servingDescription,
      calories: e.calories,
      protein: e.protein,
      carb: e.carb,
      fat: e.fat,
    })),
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carb: Math.round(totals.carb),
      fat: Math.round(totals.fat),
    },
    goals: goal
      ? { calories: goal.calories, protein: goal.protein, carb: goal.carb, fat: goal.fat }
      : null,
  };
}

async function searchRecipesExecutor(userId: string, query: string, limit: number = 5) {
  const pattern = `%${query}%`;
  const rows = await db
    .select({
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinPerServing: recipe.proteinPerServing,
      carbPerServing: recipe.carbPerServing,
      fatPerServing: recipe.fatPerServing,
    })
    .from(recipe)
    .where(and(eq(recipe.userId, userId), sql`${recipe.title} LIKE ${pattern}`))
    .orderBy(desc(recipe.updatedAt))
    .limit(limit)
    .all();

  return {
    recipes: rows.map((r) => ({
      recipeId: r.id,
      title: r.title,
      slug: r.slug,
      servings: r.servings,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      calories: r.caloriesPerServing,
      protein: r.proteinPerServing,
      carb: r.carbPerServing,
      fat: r.fatPerServing,
    })),
  };
}

async function logRecipeExecutor(
  userId: string,
  today: string,
  recipeId: string,
  quantity: number,
  meal: string,
) {
  // Get the recipe
  const row = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)))
    .get();

  if (!row) {
    return { logged: false, error: "Recipe not found" };
  }

  // Get or create the food entry for this recipe (same logic as POST /recipe/:id/food)
  let foodId: string;
  let servingId: string;

  const existingFood = await db
    .select()
    .from(food)
    .where(and(eq(food.source, "recipe"), eq(food.sourceId, recipeId)))
    .get();

  if (existingFood) {
    foodId = existingFood.id;
    const existingServing = await db
      .select()
      .from(serving)
      .where(eq(serving.foodId, existingFood.id))
      .get();

    if (existingServing) {
      servingId = existingServing.id;
      // Sync macros
      await db
        .update(serving)
        .set({
          calories: row.caloriesPerServing,
          protein: row.proteinPerServing,
          carb: row.carbPerServing,
          fat: row.fatPerServing,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(serving.id, existingServing.id));
    } else {
      servingId = createId();
      await db.insert(serving).values({
        id: servingId,
        foodId,
        description: `1 serving (${row.servings} total)`,
        amountGrams: null,
        isDefault: true,
        calories: row.caloriesPerServing,
        protein: row.proteinPerServing,
        carb: row.carbPerServing,
        fat: row.fatPerServing,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } else {
    const now = new Date().toISOString();
    foodId = createId();
    servingId = createId();

    await db.insert(food).values({
      id: foodId,
      name: row.title,
      brandName: null,
      barcode: null,
      source: "recipe",
      sourceId: recipeId,
      sourceRevision: null,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(serving).values({
      id: servingId,
      foodId,
      description: `1 serving (${row.servings} total)`,
      amountGrams: null,
      isDefault: true,
      calories: row.caloriesPerServing,
      protein: row.proteinPerServing,
      carb: row.carbPerServing,
      fat: row.fatPerServing,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Create food log entry
  await db.insert(foodLog).values({
    id: createId(),
    userId,
    foodId,
    servingId,
    quantity,
    meal: meal as "breakfast" | "lunch" | "dinner" | "snack",
    date: today,
    chatMessageId: null,
  });

  // Update favorite (track recipeId too)
  const existingFav = await db
    .select()
    .from(favorite)
    .where(and(eq(favorite.userId, userId), eq(favorite.foodId, foodId)))
    .get();

  if (existingFav) {
    await db
      .update(favorite)
      .set({ useCount: existingFav.useCount + 1, lastUsedAt: new Date().toISOString() })
      .where(eq(favorite.id, existingFav.id));
  } else {
    await db.insert(favorite).values({
      id: createId(),
      userId,
      foodId,
      recipeId,
      useCount: 1,
      lastUsedAt: new Date().toISOString(),
    });
  }

  return getDailySummaryExecutor(userId, today);
}

async function planMealExecutor(userId: string, today: string, query: string, quantity: number) {
  const [searchResult, summaryResult] = await Promise.all([
    searchFoodExecutor(query, 1),
    getDailySummaryExecutor(userId, today),
  ]);

  if (!searchResult.foods.length) {
    return { found: false, error: `No food found for "${query}"` };
  }

  const f = searchResult.foods[0]!;
  const current = summaryResult.totals;
  const goals = summaryResult.goals;

  return {
    found: true,
    suggestedFood: {
      name: f.name,
      calories: f.calories,
      protein: f.protein,
      carb: f.carb,
      fat: f.fat,
      servingDescription: f.servingDescription,
      quantity,
    },
    currentMacros: current,
    projectedMacros: {
      calories: Math.round(current.calories + (f.calories ?? 0) * quantity),
      protein: Math.round(current.protein + (f.protein ?? 0) * quantity),
      carb: Math.round(current.carb + (f.carb ?? 0) * quantity),
      fat: Math.round(current.fat + (f.fat ?? 0) * quantity),
    },
    goals,
  };
}

async function suggestFoodsExecutor(userId: string, today: string) {
  const summary = await getDailySummaryExecutor(userId, today);

  if (!summary.goals) {
    return { found: false as const, reason: "no_goals" as const };
  }

  const { totals, goals } = summary;

  // Calculate shortfalls (goal - actual), clamped to 0 minimum
  const proteinShortfall = Math.max(0, (goals.protein ?? 0) - totals.protein);
  const carbShortfall = Math.max(0, (goals.carb ?? 0) - totals.carb);
  const fatShortfall = Math.max(0, (goals.fat ?? 0) - totals.fat);

  if (proteinShortfall === 0 && carbShortfall === 0 && fatShortfall === 0) {
    return { found: false as const, reason: "goals_met" as const };
  }

  // Determine dominant-deficit macro
  let dominantMacro: "protein" | "carbs" | "fat";
  let shortfallAmount: number;

  if (proteinShortfall >= carbShortfall && proteinShortfall >= fatShortfall) {
    dominantMacro = "protein";
    shortfallAmount = proteinShortfall;
  } else if (carbShortfall >= fatShortfall) {
    dominantMacro = "carbs";
    shortfallAmount = carbShortfall;
  } else {
    dominantMacro = "fat";
    shortfallAmount = fatShortfall;
  }

  // Map macro to serving column name for efficiency scoring
  const macroCol = dominantMacro === "carbs" ? "carb" : dominantMacro;

  // Query favorites (previously logged foods) ordered by macro efficiency
  const favRows = await db
    .select({
      foodId: food.id,
      name: food.name,
      servingId: serving.id,
      description: serving.description,
      calories: serving.calories,
      protein: serving.protein,
      carb: serving.carb,
      fat: serving.fat,
    })
    .from(favorite)
    .innerJoin(food, eq(favorite.foodId, food.id))
    .innerJoin(serving, and(eq(serving.foodId, food.id), sql`${serving.calories} > 0`))
    .where(eq(favorite.userId, userId))
    .orderBy(
      desc(
        sql`CAST(${macroCol === "protein" ? serving.protein : macroCol === "carb" ? serving.carb : serving.fat} AS REAL) / CAST(${serving.calories} AS REAL)`
      )
    )
    .limit(6)
    .all();

  // USDA fallback: query high-value USDA/verified foods if fewer than 3 favorites
  let usdaRows: typeof favRows = [];
  if (favRows.length < 3) {
    usdaRows = await db
      .select({
        foodId: food.id,
        name: food.name,
        servingId: serving.id,
        description: serving.description,
        calories: serving.calories,
        protein: serving.protein,
        carb: serving.carb,
        fat: serving.fat,
      })
      .from(food)
      .innerJoin(serving, and(eq(serving.foodId, food.id), sql`${serving.calories} > 0`))
      .where(eq(food.isVerified, true))
      .orderBy(
        desc(
          sql`CAST(${macroCol === "protein" ? serving.protein : macroCol === "carb" ? serving.carb : serving.fat} AS REAL) / CAST(${serving.calories} AS REAL)`
        )
      )
      .limit(6)
      .all();
  }

  // Deduplicate by foodId, favorites take priority
  const seen = new Set<string>();
  const combined: typeof favRows = [];
  for (const row of [...favRows, ...usdaRows]) {
    if (!seen.has(row.foodId)) {
      seen.add(row.foodId);
      combined.push(row);
    }
  }

  const top3 = combined.slice(0, 3);

  const suggestions = top3.map((row, idx) => {
    const macroG = macroCol === "protein"
      ? (row.protein ?? 0)
      : macroCol === "carb"
      ? (row.carb ?? 0)
      : (row.fat ?? 0);
    const matchScore = row.calories && row.calories > 0 ? macroG / row.calories : 0;

    return {
      id: row.servingId ?? `${row.foodId}-${idx}`,
      label: row.name,
      subtitle: row.description ?? undefined,
      calories: row.calories ?? undefined,
      protein: row.protein ?? undefined,
      food_id: row.foodId,
      recipe_id: null as string | null,
      matchScore,
    };
  });

  // Sort by matchScore desc, break ties by name asc for determinism
  suggestions.sort((a, b) => b.matchScore - a.matchScore || a.label.localeCompare(b.label));

  return {
    found: true as const,
    shortfall: { macro: dominantMacro, amount: Math.round(shortfallAmount), unit: "g" as const },
    suggestions: suggestions.map(({ matchScore: _ms, ...s }) => s),
  };
}

async function createRecipeExecutor(
  userId: string,
  title: string,
  servings: number,
  ingredients: Array<{ name: string; quantity: number; unit?: string }>,
) {
  const now = new Date().toISOString();

  // Resolve each ingredient by searching for best-matching food
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
    const searchResult = await searchFoodExecutor(ing.name, 1);
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

  // Accumulate total macros (null-safe, following getDailySummaryExecutor pattern)
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

  // Generate unique slug (handle collisions with numeric suffix)
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

  // Insert recipe
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

  // Insert recipe ingredients
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
// Smart route handlers
// ---------------------------------------------------------------------------
async function handleSmartRoute(
  route: { routed: true; type: string; query?: string },
  userId: string,
  today: string,
): Promise<{ content: string | null; uiComponents: UIComponent[] | null }> {
  switch (route.type) {
    case "search": {
      const results = await searchFoodExecutor(route.query!, 5);
      if (results.foods.length === 0) {
        return { content: `No results for "${route.query}".`, uiComponents: null };
      }
      return {
        content: null,
        uiComponents: [{ type: "food_list", props: { foods: results.foods } }],
      };
    }

    case "recent": {
      const results = await getRecentFoodsExecutor(userId, 8);
      if (results.foods.length === 0) {
        return { content: "No recent foods yet. Log something first!", uiComponents: null };
      }
      return {
        content: null,
        uiComponents: [{ type: "quick_log_chips", props: { foods: results.foods } }],
      };
    }

    case "summary": {
      const summary = await getDailySummaryExecutor(userId, today);
      return {
        content: null,
        uiComponents: [{ type: "macro_summary", props: summary }],
      };
    }

    default:
      return { content: "I didn't understand that.", uiComponents: null };
  }
}

// ---------------------------------------------------------------------------
// Load user context for system prompt
// ---------------------------------------------------------------------------
async function loadUserContext(userId: string, today: string) {
  const [summary, goal, recentFavorites] = await Promise.all([
    getDailySummaryExecutor(userId, today),
    db
      .select()
      .from(userGoal)
      .where(and(eq(userGoal.userId, userId), isNull(userGoal.endDate)))
      .get(),
    db
      .select({ name: food.name })
      .from(favorite)
      .innerJoin(food, eq(favorite.foodId, food.id))
      .where(eq(favorite.userId, userId))
      .orderBy(desc(favorite.useCount))
      .limit(8)
      .all(),
  ]);

  return {
    goals: goal
      ? { calories: goal.calories, protein: goal.protein, carb: goal.carb, fat: goal.fat }
      : null,
    todayMacros: summary.totals,
    recentFoods: recentFavorites.map((f) => f.name),
  };
}

// ---------------------------------------------------------------------------
// Build UI components from tool results
// ---------------------------------------------------------------------------
function buildUIComponents(
  toolResults: Array<{ toolName: string; result: unknown }>,
): UIComponent[] {
  const components: UIComponent[] = [];

  for (const { toolName, result } of toolResults) {
    switch (toolName) {
      case "search_food": {
        const { foods } = result as { foods: unknown[] };
        if (foods?.length) {
          components.push({ type: "food_list", props: { foods } });
        }
        break;
      }
      case "lookup_barcode": {
        const r = result as Record<string, unknown>;
        if (r.found) {
          components.push({
            type: "food_card",
            props: {
              foodId: r.foodId,
              name: r.name,
              brandName: r.brandName,
              servingId: r.servingId,
              servingDescription: r.servingDescription,
              calories: r.calories,
              protein: r.protein,
              carb: r.carb,
              fat: r.fat,
              quantity: 1,
            },
          });
        }
        break;
      }
      case "log_food":
      case "get_daily_summary": {
        const r = result as { totals: unknown; goals: unknown };
        if (r.totals) {
          components.push({ type: "macro_summary", props: r });
        }
        break;
      }
      case "get_recent_foods": {
        const r = result as { foods: unknown[] };
        if (r.foods?.length) {
          components.push({ type: "quick_log_chips", props: r });
        }
        break;
      }
      case "get_date_log": {
        const r = result as {
          entries: Array<{
            foodId: string;
            name: string;
            brandName: string | null;
            servingId: string;
            servingDescription: string;
            calories: number | null;
            protein: number | null;
            carb: number | null;
            fat: number | null;
          }>;
          totals: unknown;
          goals: unknown;
        };
        if (r.entries?.length) {
          components.push({ type: "food_list", props: { foods: r.entries } });
          components.push({ type: "macro_summary", props: { totals: r.totals, goals: r.goals } });
        }
        break;
      }
      case "search_recipes": {
        const r = result as { recipes: unknown[] };
        if (r.recipes?.length) {
          for (const rec of r.recipes) {
            components.push({ type: "recipe_card", props: rec as Record<string, unknown> });
          }
        }
        break;
      }
      case "log_recipe": {
        const r = result as { totals: unknown; goals: unknown; logged?: boolean; error?: string };
        if (r.totals) {
          components.push({ type: "macro_summary", props: r });
        }
        break;
      }
      case "plan_meal": {
        const r = result as { found: boolean; suggestedFood?: unknown; currentMacros?: unknown; projectedMacros?: unknown; goals?: unknown };
        if (r.found) {
          components.push({
            type: "meal_plan",
            props: {
              suggestedFood: r.suggestedFood,
              currentMacros: r.currentMacros,
              projectedMacros: r.projectedMacros,
              goals: r.goals,
            },
          });
        }
        break;
      }
      case "suggest_foods": {
        const r = result as { found: boolean; reason?: string; shortfall?: { macro: string; amount: number; unit: string }; suggestions?: unknown[] };
        if (r.found && r.suggestions?.length) {
          components.push({
            type: "suggestion_card",
            props: {
              suggestions: r.suggestions,
              shortfall: r.shortfall ?? null,
            },
          });
        }
        break;
      }
      case "create_recipe": {
        const r = result as { created: boolean; recipeId?: string; title?: string; slug?: string; servings?: number; calories?: number; protein?: number; carb?: number; fat?: number };
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
        break;
      }
    }
  }

  return components;
}

export default chatRoutes;
