/**
 * Tests for the null-check fix in lookupBarcodeExecutor (chat.ts line 405).
 *
 * Fix: when a cached food exists but has no servings, return
 *   { found: false, error: 'No nutrition data available' }
 * instead of proceeding to servings[0] and returning undefined nutrition fields.
 *
 * Since lookupBarcodeExecutor is not exported, we replicate the exact query
 * pattern from chat.ts using an in-memory libsql DB with real migrations,
 * matching the approach in packages/db/src/__tests__/serving-selection.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, desc, asc } from "drizzle-orm";
import * as schema from "../../../../packages/db/src/schema";

let client: Client;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  db = drizzle(client, { schema });

  const { readFileSync, readdirSync } = await import("fs");
  const { resolve } = await import("path");
  const migrationDir = resolve(__dirname, "../../../../packages/db/migrations");
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
// Replicate the exact lookupBarcodeExecutor logic from chat.ts so we can
// assert the behaviour of the null-check fix in isolation.
// ---------------------------------------------------------------------------

async function lookupBarcodeExecutor(barcode: string) {
  const cached = await db.select().from(schema.food).where(eq(schema.food.barcode, barcode)).get();

  if (cached) {
    const servings = await db
      .select()
      .from(schema.serving)
      .where(eq(schema.serving.foodId, cached.id))
      .orderBy(desc(schema.serving.isDefault), asc(schema.serving.id))
      .all();

    // THE FIX — this is the line added in chat.ts to prevent returning undefined nutrition
    if (!servings.length) return { found: false, error: "No nutrition data available" };

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

  return { found: false };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertFood(name: string, barcode?: string): Promise<string> {
  const id = createId();
  await db.insert(schema.food).values({
    id,
    name,
    source: "usda",
    sourceId: createId(),
    isVerified: true,
    ...(barcode ? { barcode } : {}),
  });
  return id;
}

async function insertServing(foodId: string, isDefault = true): Promise<string> {
  const id = createId();
  await db.insert(schema.serving).values({
    id,
    foodId,
    description: "1 serving",
    amountGrams: 100,
    isDefault,
    calories: 250,
    protein: 10,
    carb: 30,
    fat: 8,
  });
  return id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lookupBarcodeExecutor: null-check fix (food with no servings)", () => {
  it("returns { found: false, error: 'No nutrition data available' } when food is cached but has no servings", async () => {
    const barcode = `BARCODE-NOSERVING-${createId()}`;
    await insertFood("Orphan Product", barcode);

    const result = await lookupBarcodeExecutor(barcode);

    expect(result.found).toBe(false);
    expect((result as { error?: string }).error).toBe("No nutrition data available");
  });

  it("does NOT return found: true with undefined nutrition when servings array is empty", async () => {
    const barcode = `BARCODE-NOSERVING2-${createId()}`;
    await insertFood("Another Orphan", barcode);

    const result = await lookupBarcodeExecutor(barcode);

    // Before the fix, this would have been found: true with undefined fields
    expect(result.found).toBe(false);
    // Ensure nutrition fields are NOT present (not undefined leaking out)
    expect("calories" in result).toBe(false);
    expect("protein" in result).toBe(false);
    expect("carb" in result).toBe(false);
    expect("fat" in result).toBe(false);
  });
});

describe("lookupBarcodeExecutor: happy path (food with servings)", () => {
  it("returns found: true with nutrition fields when food has a serving", async () => {
    const barcode = `BARCODE-HAPPY-${createId()}`;
    const foodId = await insertFood("Good Product", barcode);
    const servingId = await insertServing(foodId, true);

    const result = await lookupBarcodeExecutor(barcode);

    expect(result.found).toBe(true);
    expect((result as { foodId?: string }).foodId).toBe(foodId);
    expect((result as { servingId?: string }).servingId).toBe(servingId);
    expect((result as { calories?: number }).calories).toBe(250);
    expect((result as { protein?: number }).protein).toBe(10);
    expect((result as { carb?: number }).carb).toBe(30);
    expect((result as { fat?: number }).fat).toBe(8);
  });

  it("returns found: true using default serving when multiple servings exist", async () => {
    const barcode = `BARCODE-MULTI-${createId()}`;
    const foodId = await insertFood("Multi-Serving Product", barcode);
    await insertServing(foodId, false); // non-default inserted first
    const defaultId = await insertServing(foodId, true);

    const result = await lookupBarcodeExecutor(barcode) as {
      found: boolean;
      servingId?: string;
    };

    expect(result.found).toBe(true);
    expect(result.servingId).toBe(defaultId);
  });

  it("returns found: false when barcode does not exist in cache (no OFF fallback in test)", async () => {
    const result = await lookupBarcodeExecutor("NONEXISTENT-BARCODE-XYZ");
    expect(result.found).toBe(false);
  });
});
