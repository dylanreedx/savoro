#!/usr/bin/env npx tsx
/**
 * Bulk import USDA FoodData Central SR Legacy (~8k common foods) into Turso.
 *
 * Usage:
 *   npx tsx scripts/seed-usda.ts
 *
 * Requires env vars: TURSO_DATABASE_URL (and optionally TURSO_AUTH_TOKEN)
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, mkdirSync, readdirSync } from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { createId } from "@paralleldrive/cuid2";
import { food, serving } from "../packages/db/src/schema";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve("data/usda");
const ZIP_URL =
  "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip";
const ZIP_PATH = path.join(DATA_DIR, "sr_legacy.zip");
const BATCH_SIZE = 500;

// USDA nutrient_id → serving schema field
const NUTRIENT_MAP: Record<number, string> = {
  1008: "calories",
  1003: "protein",
  1005: "carb",
  1004: "fat",
  1258: "saturatedFat",
  1257: "transFat",
  1293: "polyunsaturatedFat",
  1292: "monounsaturatedFat",
  1253: "cholesterol",
  1093: "sodium",
  1092: "potassium",
  1079: "fiber",
  1063: "sugar",
  1114: "vitaminD",
  1106: "vitaminA",
  1162: "vitaminC",
  1087: "calcium",
  1089: "iron",
};

// ---------------------------------------------------------------------------
// Download & extract
// ---------------------------------------------------------------------------
function findCsvDir(): string {
  if (existsSync(path.join(DATA_DIR, "food.csv"))) return DATA_DIR;
  for (const entry of readdirSync(DATA_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const sub = path.join(DATA_DIR, entry.name);
      if (existsSync(path.join(sub, "food.csv"))) return sub;
    }
  }
  throw new Error("Could not find food.csv in extracted data");
}

function downloadAndExtract(): string {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  try {
    return findCsvDir();
  } catch {
    // Need to download
  }
  console.log("Downloading USDA SR Legacy data...");
  execSync(`curl -L -o "${ZIP_PATH}" "${ZIP_URL}"`, { stdio: "inherit" });
  console.log("Extracting...");
  execSync(`unzip -o "${ZIP_PATH}" -d "${DATA_DIR}"`, { stdio: "inherit" });
  return findCsvDir();
}

// ---------------------------------------------------------------------------
// Parse CSVs
// ---------------------------------------------------------------------------
interface UsdaFood {
  fdcId: string;
  description: string;
}

function parseFoodCsv(csvDir: string): UsdaFood[] {
  console.log("Parsing food.csv...");
  const raw = readFileSync(path.join(csvDir, "food.csv"), "utf-8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  return records.map((r: any) => ({
    fdcId: String(r.fdc_id),
    description: String(r.description).trim(),
  }));
}

function parseNutrientsCsv(
  csvDir: string,
): Map<string, Record<string, number>> {
  console.log("Parsing food_nutrient.csv...");
  const raw = readFileSync(path.join(csvDir, "food_nutrient.csv"), "utf-8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const map = new Map<string, Record<string, number>>();
  for (const r of records) {
    const nutrientId = parseInt(r.nutrient_id, 10);
    const field = NUTRIENT_MAP[nutrientId];
    if (!field) continue;

    const amount = parseFloat(r.amount);
    if (isNaN(amount)) continue;

    const fdcId = String(r.fdc_id);
    if (!map.has(fdcId)) map.set(fdcId, {});
    map.get(fdcId)![field] = amount;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seed() {
  const csvDir = downloadAndExtract();
  const foods = parseFoodCsv(csvDir);
  const nutrients = parseNutrientsCsv(csvDir);

  console.log(`\nFoods found: ${foods.length}`);
  console.log(`Foods with nutrients: ${nutrients.size}`);

  // Connect to DB
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL env var is required");
  }
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client);

  // Check for existing USDA foods
  const existing = await client.execute(
    "SELECT COUNT(*) as cnt FROM food WHERE source = 'usda'",
  );
  const existingCount = Number(existing.rows[0]?.cnt ?? 0);
  if (existingCount > 0) {
    console.log(
      `\nWarning: ${existingCount} USDA foods already exist. Skipping import.`,
    );
    console.log("Drop existing USDA foods first if you want to re-import.");
    client.close();
    return;
  }

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < foods.length; i += BATCH_SIZE) {
    const batch = foods.slice(i, i + BATCH_SIZE);
    const foodRows: (typeof food.$inferInsert)[] = [];
    const servingRows: (typeof serving.$inferInsert)[] = [];

    for (const f of batch) {
      const n = nutrients.get(f.fdcId);
      // Skip foods missing core macros
      if (
        !n ||
        n.calories == null ||
        n.protein == null ||
        n.carb == null ||
        n.fat == null
      ) {
        skipped++;
        continue;
      }

      const foodId = createId();
      foodRows.push({
        id: foodId,
        name: f.description,
        source: "usda",
        sourceId: f.fdcId,
        isVerified: true,
      });

      servingRows.push({
        id: createId(),
        foodId,
        description: "100 g",
        amountGrams: 100,
        isDefault: true,
        calories: n.calories,
        protein: n.protein,
        carb: n.carb,
        fat: n.fat,
        saturatedFat: n.saturatedFat ?? null,
        transFat: n.transFat ?? null,
        polyunsaturatedFat: n.polyunsaturatedFat ?? null,
        monounsaturatedFat: n.monounsaturatedFat ?? null,
        cholesterol: n.cholesterol ?? null,
        sodium: n.sodium ?? null,
        potassium: n.potassium ?? null,
        fiber: n.fiber ?? null,
        sugar: n.sugar ?? null,
        addedSugars: null,
        vitaminD: n.vitaminD ?? null,
        vitaminA: n.vitaminA ?? null,
        vitaminC: n.vitaminC ?? null,
        calcium: n.calcium ?? null,
        iron: n.iron ?? null,
      });
    }

    if (foodRows.length > 0) {
      await db.insert(food).values(foodRows);
      await db.insert(serving).values(servingRows);
      imported += foodRows.length;
    }

    const pct = Math.round(((i + batch.length) / foods.length) * 100);
    process.stdout.write(
      `\rProgress: ${pct}% (${imported} imported, ${skipped} skipped)`,
    );
  }

  console.log(`\n\nDone! ${imported} foods imported, ${skipped} skipped.`);

  // Verify common foods
  console.log("\nVerifying common foods...");
  const verify = ["chicken breast", "brown rice", "egg", "broccoli", "salmon"];
  for (const name of verify) {
    const result = await client.execute({
      sql: `SELECT f.name, s.calories, s.protein, s.carb, s.fat
            FROM food f
            JOIN serving s ON s.food_id = f.id
            WHERE LOWER(f.name) LIKE ? AND f.source = 'usda'
            LIMIT 1`,
      args: [`%${name}%`],
    });
    if (result.rows.length > 0) {
      const r = result.rows[0];
      console.log(
        `  OK: ${r.name} - ${r.calories} kcal, ${r.protein}g P, ${r.carb}g C, ${r.fat}g F`,
      );
    } else {
      console.log(`  MISSING: "${name}" not found`);
    }
  }

  client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
