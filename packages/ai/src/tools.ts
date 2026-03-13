import { tool } from "ai";
import { z } from "zod";

/**
 * Tool definitions for the Savoro agent.
 * These define the schema — execution is handled by the API route.
 */

export const searchFood = tool({
  description:
    "Search for a food by name or description. Returns matching foods with nutrition info.",
  inputSchema: z.object({
    query: z.string().describe("Food name or description to search for"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Max results to return"),
  }),
});

export const lookupBarcode = tool({
  description:
    "Look up a food product by barcode. Returns nutrition info if found.",
  inputSchema: z.object({
    barcode: z.string().describe("The barcode string to look up"),
  }),
});

export const logFood = tool({
  description:
    "Log a food item to the user's daily intake. Call after the user confirms a food selection.",
  inputSchema: z.object({
    foodId: z.string().describe("The food ID to log"),
    servingId: z.string().describe("The serving ID to use"),
    quantity: z.number().positive().default(1).describe("Number of servings"),
    meal: z
      .enum(["breakfast", "lunch", "dinner", "snack"])
      .describe("Meal category — infer from time of day if not specified"),
  }),
});

export const getDailySummary = tool({
  description:
    "Get the user's macro totals and goals for today. Use when the user asks about their progress.",
  inputSchema: z.object({}),
});

export const getRecentFoods = tool({
  description:
    "Get the user's recently logged and favorite foods for quick re-logging.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(8)
      .describe("Max results"),
  }),
});

export const deleteLog = tool({
  description:
    "Delete a food log entry. Use when the user wants to remove something they logged.",
  inputSchema: z.object({
    logId: z.string().describe("The food log entry ID to delete"),
  }),
});

export const getDateLog = tool({
  description:
    "Get all food log entries for a specific date. Use when the user asks about what they ate on a past day, wants to re-log yesterday's meals, or references a previous day's intake.",
  inputSchema: z.object({
    date: z
      .string()
      .describe("Date in YYYY-MM-DD format. Resolve relative dates like 'yesterday' before calling."),
    meal: z
      .enum(["breakfast", "lunch", "dinner", "snack"])
      .optional()
      .describe("Optional meal filter — only return entries for this meal"),
  }),
});

export const agentTools = {
  search_food: searchFood,
  lookup_barcode: lookupBarcode,
  log_food: logFood,
  get_daily_summary: getDailySummary,
  get_recent_foods: getRecentFoods,
  delete_log: deleteLog,
  get_date_log: getDateLog,
};
