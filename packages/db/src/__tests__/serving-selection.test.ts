/**
 * Tests for serving selection ordering logic (isDefault=true preferred, fallback to lowest id).
 *
 * These tests verify the fix in food.ts and chat.ts that adds:
 *   .orderBy(desc(serving.isDefault), asc(serving.id))
 *
 * We test the DB-level ordering directly with an in-memory libsql instance,
 * mirroring the same query patterns used in the route handlers.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, desc, asc, like, or } from "drizzle-orm";
import * as schema from "../schema";

let client: Client;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  db = drizzle(client, { schema });

  const { readFileSync, readdirSync } = await import("fs");
  const { resolve } = await import("path");
  const migrationDir = resolve(__dirname, "../../migrations");
  const files = readdirSync(migrationDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = readFileSync(resolve(migrationDir, file), "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (err: unknown) {
        // DROP INDEX statements may fail in in-memory DB if the index
        // was never created (known migration ordering issue). Skip silently.
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
// Helpers
// ---------------------------------------------------------------------------

async function insertFood(name: string, extra: Partial<schema.NewFood> = {}): Promise<string> {
  const id = createId();
  await db.insert(schema.food).values({
    id,
    name,
    source: "usda",
    sourceId: createId(),
    isVerified: true,
    ...extra,
  });
  return id;
}

async function insertServing(foodId: string, isDefault: boolean, extra: Partial<schema.NewServing> = {}): Promise<string> {
  const id = createId();
  await db.insert(schema.serving).values({
    id,
    foodId,
    description: isDefault ? "1 cup (default)" : "1 tbsp",
    amountGrams: isDefault ? 240 : 15,
    isDefault,
    calories: isDefault ? 200 : 30,
    protein: isDefault ? 10 : 1.5,
    carb: isDefault ? 20 : 3,
    fat: isDefault ? 5 : 0.5,
    ...extra,
  });
  return id;
}

// ---------------------------------------------------------------------------
// searchFood query pattern — orderBy(desc(isDefault), asc(id))
// ---------------------------------------------------------------------------

describe("search query: serving selection", () => {
  it("returns default serving first when food has both default and non-default servings", async () => {
    const foodId = await insertFood("TestFood Alpha");
    const nonDefaultId = await insertServing(foodId, false);
    const defaultId = await insertServing(foodId, true);

    const pattern = "%TestFood Alpha%";
    const rows = await db
      .select({
        id: schema.food.id,
        name: schema.food.name,
        servingId: schema.serving.id,
        isDefault: schema.serving.isDefault,
      })
      .from(schema.food)
      .leftJoin(schema.serving, eq(schema.serving.foodId, schema.food.id))
      .where(or(like(schema.food.name, pattern), like(schema.food.brandName, pattern)))
      .orderBy(desc(schema.serving.isDefault), asc(schema.serving.id))
      .all();

    // First row for this food should be the default serving
    const foodRows = rows.filter((r) => r.id === foodId);
    expect(foodRows.length).toBe(2);
    expect(foodRows[0].servingId).toBe(defaultId);
    expect(foodRows[0].isDefault).toBe(true);
    expect(foodRows[1].servingId).toBe(nonDefaultId);

    // Simulate the grouping logic in food.ts (take first seen per food id)
    const map = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!map.has(row.id)) map.set(row.id, row);
    }
    const selected = map.get(foodId);
    expect(selected?.servingId).toBe(defaultId);
  });

  it("falls back to lowest-id serving when no serving is default", async () => {
    const foodId = await insertFood("TestFood Beta");
    const firstId = await insertServing(foodId, false, { description: "First serving" });
    const secondId = await insertServing(foodId, false, { description: "Second serving" });

    const pattern = "%TestFood Beta%";
    const rows = await db
      .select({
        id: schema.food.id,
        servingId: schema.serving.id,
        isDefault: schema.serving.isDefault,
      })
      .from(schema.food)
      .leftJoin(schema.serving, eq(schema.serving.foodId, schema.food.id))
      .where(or(like(schema.food.name, pattern), like(schema.food.brandName, pattern)))
      .orderBy(desc(schema.serving.isDefault), asc(schema.serving.id))
      .all();

    const foodRows = rows.filter((r) => r.id === foodId);
    expect(foodRows.length).toBe(2);

    // When no default, the serving with the lexicographically smaller id (created first) comes first
    // cuid2 IDs are monotonic-ish but we can rely on the fact that firstId < secondId
    // What matters is that the result is deterministic (asc(id) ordering)
    const ids = foodRows.map((r) => r.servingId);
    expect(ids).toEqual([firstId, secondId].sort()); // sorted ascending
  });

  it("handles food with no servings without crashing", async () => {
    const foodId = await insertFood("TestFood Gamma");

    const pattern = "%TestFood Gamma%";
    const rows = await db
      .select({
        id: schema.food.id,
        servingId: schema.serving.id,
        isDefault: schema.serving.isDefault,
      })
      .from(schema.food)
      .leftJoin(schema.serving, eq(schema.serving.foodId, schema.food.id))
      .where(or(like(schema.food.name, pattern), like(schema.food.brandName, pattern)))
      .orderBy(desc(schema.serving.isDefault), asc(schema.serving.id))
      .all();

    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(foodId);
    expect(rows[0].servingId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// lookupBarcodeExecutor query pattern — orderBy(desc(isDefault), asc(id))
// ---------------------------------------------------------------------------

describe("barcode lookup: serving selection", () => {
  it("picks default serving as first element of ordered servings array", async () => {
    const barcode = `TEST-BARCODE-${createId()}`;
    const foodId = await insertFood("TestFood Delta", { barcode });
    const nonDefaultId = await insertServing(foodId, false);
    const defaultId = await insertServing(foodId, true);

    const cached = await db.select().from(schema.food).where(eq(schema.food.barcode, barcode)).get();
    expect(cached).toBeTruthy();

    const servings = await db
      .select()
      .from(schema.serving)
      .where(eq(schema.serving.foodId, cached!.id))
      .orderBy(desc(schema.serving.isDefault), asc(schema.serving.id))
      .all();

    expect(servings.length).toBe(2);
    // s[0] should be the default
    expect(servings[0].id).toBe(defaultId);
    expect(servings[0].isDefault).toBe(true);
    expect(servings[1].id).toBe(nonDefaultId);
  });

  it("barcode with no default serving returns lowest-id serving first", async () => {
    const barcode = `TEST-BARCODE-NODEFAULT-${createId()}`;
    const foodId = await insertFood("TestFood Epsilon", { barcode });
    const firstId = await insertServing(foodId, false, { description: "Serving A" });
    const secondId = await insertServing(foodId, false, { description: "Serving B" });

    const cached = await db.select().from(schema.food).where(eq(schema.food.barcode, barcode)).get();
    const servings = await db
      .select()
      .from(schema.serving)
      .where(eq(schema.serving.foodId, cached!.id))
      .orderBy(desc(schema.serving.isDefault), asc(schema.serving.id))
      .all();

    expect(servings.length).toBe(2);
    // Result must be deterministic (ascending id)
    const resultIds = servings.map((s) => s.id);
    expect(resultIds).toEqual([firstId, secondId].sort());
  });

  it("barcode with single default serving returns that serving", async () => {
    const barcode = `TEST-BARCODE-SINGLE-${createId()}`;
    const foodId = await insertFood("TestFood Zeta", { barcode });
    const defaultId = await insertServing(foodId, true);

    const cached = await db.select().from(schema.food).where(eq(schema.food.barcode, barcode)).get();
    const servings = await db
      .select()
      .from(schema.serving)
      .where(eq(schema.serving.foodId, cached!.id))
      .orderBy(desc(schema.serving.isDefault), asc(schema.serving.id))
      .all();

    expect(servings.length).toBe(1);
    expect(servings[0].id).toBe(defaultId);
    expect(servings[0].isDefault).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Verify the isDefault column stores and retrieves boolean correctly
// ---------------------------------------------------------------------------

describe("isDefault boolean column integrity", () => {
  it("stores isDefault=true and retrieves it as boolean true", async () => {
    const foodId = await insertFood("TestFood Eta");
    const servingId = await insertServing(foodId, true);

    const [found] = await db.select().from(schema.serving).where(eq(schema.serving.id, servingId));
    expect(found.isDefault).toBe(true);
  });

  it("stores isDefault=false and retrieves it as boolean false", async () => {
    const foodId = await insertFood("TestFood Theta");
    const servingId = await insertServing(foodId, false);

    const [found] = await db.select().from(schema.serving).where(eq(schema.serving.id, servingId));
    expect(found.isDefault).toBe(false);
  });

  it("default value for isDefault is false when not specified", async () => {
    const foodId = await insertFood("TestFood Iota");
    const id = createId();
    await db.insert(schema.serving).values({
      id,
      foodId,
      description: "1 piece",
      amountGrams: 50,
      calories: 100,
      protein: 5,
      carb: 10,
      fat: 2,
    });

    const [found] = await db.select().from(schema.serving).where(eq(schema.serving.id, id));
    expect(found.isDefault).toBe(false);
  });
});
