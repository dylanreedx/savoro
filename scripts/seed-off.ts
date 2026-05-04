#!/usr/bin/env npx tsx
/**
 * Bulk import Open Food Facts top-50k most-scanned barcode products into Turso.
 *
 * Usage:
 *   npx tsx scripts/seed-off.ts
 *
 * Requires env vars: TURSO_DATABASE_URL (and optionally TURSO_AUTH_TOKEN)
 *
 * Downloads the full OFF JSONL dump (~7GB compressed), streams it through gunzip,
 * filters for products with complete macro data + barcode, sorts by scan popularity,
 * and inserts the top 50k into the food + serving tables.
 */

import { execSync } from "child_process";
import { createReadStream, existsSync, mkdirSync, statSync } from "fs";
import { createGunzip } from "zlib";
import { createInterface } from "readline";
import * as path from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { createId } from "@paralleldrive/cuid2";
import { food, serving } from "../packages/db/src/schema";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve("data/off");
const JSONL_GZ_URL =
  "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz";
const JSONL_GZ_PATH = path.join(DATA_DIR, "openfoodfacts-products.jsonl.gz");
const TOP_N = 50_000;
const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// OFF nutriment field → serving schema field
// ---------------------------------------------------------------------------
const NUTRIENT_MAP: Record<string, string> = {
  "energy-kcal_100g": "calories",
  proteins_100g: "protein",
  carbohydrates_100g: "carb",
  fat_100g: "fat",
  "saturated-fat_100g": "saturatedFat",
  "trans-fat_100g": "transFat",
  cholesterol_100g: "cholesterol",
  sodium_100g: "sodium",
  potassium_100g: "potassium",
  fiber_100g: "fiber",
  sugars_100g: "sugar",
  "vitamin-d_100g": "vitaminD",
  "vitamin-a_100g": "vitaminA",
  "vitamin-c_100g": "vitaminC",
  calcium_100g: "calcium",
  iron_100g: "iron",
};

// Required macros — products without all four are skipped
const REQUIRED_MACROS = [
  "energy-kcal_100g",
  "proteins_100g",
  "carbohydrates_100g",
  "fat_100g",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OffCandidate {
  barcode: string;
  name: string;
  brandName: string | null;
  scansN: number;
  nutrients: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------
function download(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(JSONL_GZ_PATH)) {
    const size = statSync(JSONL_GZ_PATH).size;
    if (size > 1_000_000_000) {
      console.log(
        `Using existing download (${(size / 1e9).toFixed(1)} GB): ${JSONL_GZ_PATH}`,
      );
      return;
    }
    console.log(
      `Existing file too small (${(size / 1e6).toFixed(0)} MB), re-downloading...`,
    );
  }

  console.log("Downloading Open Food Facts JSONL dump (~7 GB)...");
  console.log("This may take a while depending on your connection.");
  execSync(`curl -L -C - -o "${JSONL_GZ_PATH}" "${JSONL_GZ_URL}"`, {
    stdio: "inherit",
  });
  console.log("Download complete.");
}

// ---------------------------------------------------------------------------
// Stream & filter JSONL
// ---------------------------------------------------------------------------
async function streamAndFilter(): Promise<OffCandidate[]> {
  console.log("\nStreaming JSONL and filtering for complete products...");

  const candidates: OffCandidate[] = [];
  let lineCount = 0;
  let parseErrors = 0;

  const fileStream = createReadStream(JSONL_GZ_PATH);
  const gunzip = createGunzip();
  const rl = createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;

    if (lineCount % 500_000 === 0) {
      process.stdout.write(
        `\rScanned ${(lineCount / 1e6).toFixed(1)}M products, ${candidates.length} candidates...`,
      );
    }

    let product: any;
    try {
      product = JSON.parse(line);
    } catch {
      parseErrors++;
      continue;
    }

    // Must have a barcode and product name
    const barcode = product.code;
    const name = product.product_name;
    if (!barcode || typeof barcode !== "string" || barcode.length < 4) continue;
    if (!name || typeof name !== "string" || name.trim().length === 0) continue;

    // Must have all required macros as valid numbers
    const nutriments = product.nutriments;
    if (!nutriments || typeof nutriments !== "object") continue;

    let hasAllMacros = true;
    for (const key of REQUIRED_MACROS) {
      const val = nutriments[key];
      if (val == null || typeof val !== "number" || isNaN(val) || val < 0) {
        hasAllMacros = false;
        break;
      }
    }
    if (!hasAllMacros) continue;

    // Sanity check: calories shouldn't exceed ~900 kcal/100g (pure fat is ~884)
    if (nutriments["energy-kcal_100g"] > 1000) continue;

    // Extract all available nutrients
    const nutrients: Record<string, number> = {};
    for (const [offKey, schemaField] of Object.entries(NUTRIENT_MAP)) {
      const val = nutriments[offKey];
      if (val != null && typeof val === "number" && !isNaN(val) && val >= 0) {
        nutrients[schemaField] = val;
      }
    }

    const scansN =
      typeof product.scans_n === "number" ? product.scans_n : 0;
    const brandName =
      product.brands && typeof product.brands === "string"
        ? product.brands.split(",")[0].trim() || null
        : null;

    candidates.push({
      barcode,
      name: name.trim(),
      brandName,
      scansN,
      nutrients,
    });
  }

  console.log(
    `\rScanned ${(lineCount / 1e6).toFixed(1)}M products total.                    `,
  );
  console.log(`  Candidates with complete macros + barcode: ${candidates.length}`);
  if (parseErrors > 0) console.log(`  Parse errors (skipped): ${parseErrors}`);

  return candidates;
}

// ---------------------------------------------------------------------------
// Seed into Turso
// ---------------------------------------------------------------------------
async function seed() {
  download();

  const candidates = await streamAndFilter();

  // Sort by scan popularity descending, take top N
  candidates.sort((a, b) => b.scansN - a.scansN);
  const topProducts = candidates.slice(0, TOP_N);

  console.log(
    `\nTop ${topProducts.length} products selected (min scans: ${topProducts[topProducts.length - 1]?.scansN ?? 0})`,
  );

  // Connect to DB
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL env var is required");

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client);

  // Check for existing OFF foods
  const existing = await client.execute(
    "SELECT COUNT(*) as cnt FROM food WHERE source = 'off'",
  );
  const existingCount = Number(existing.rows[0]?.cnt ?? 0);
  if (existingCount > 0) {
    console.log(
      `\nWarning: ${existingCount} OFF foods already exist. Skipping import.`,
    );
    console.log("Drop existing OFF foods first if you want to re-import:");
    console.log(
      "  DELETE FROM serving WHERE food_id IN (SELECT id FROM food WHERE source = 'off');",
    );
    console.log("  DELETE FROM food WHERE source = 'off';");
    client.close();
    return;
  }

  console.log(
    `\nInserting ${topProducts.length} products in batches of ${BATCH_SIZE}...`,
  );
  let imported = 0;

  for (let i = 0; i < topProducts.length; i += BATCH_SIZE) {
    const batch = topProducts.slice(i, i + BATCH_SIZE);
    const foodRows: (typeof food.$inferInsert)[] = [];
    const servingRows: (typeof serving.$inferInsert)[] = [];

    for (const p of batch) {
      const foodId = createId();
      foodRows.push({
        id: foodId,
        name: p.name,
        brandName: p.brandName,
        barcode: p.barcode,
        source: "off",
        sourceId: p.barcode,
        isVerified: false,
      });

      servingRows.push({
        id: createId(),
        foodId,
        description: "100 g",
        amountGrams: 100,
        isDefault: true,
        calories: p.nutrients.calories ?? null,
        protein: p.nutrients.protein ?? null,
        carb: p.nutrients.carb ?? null,
        fat: p.nutrients.fat ?? null,
        saturatedFat: p.nutrients.saturatedFat ?? null,
        transFat: p.nutrients.transFat ?? null,
        polyunsaturatedFat: null,
        monounsaturatedFat: null,
        cholesterol: p.nutrients.cholesterol ?? null,
        sodium: p.nutrients.sodium ?? null,
        potassium: p.nutrients.potassium ?? null,
        fiber: p.nutrients.fiber ?? null,
        sugar: p.nutrients.sugar ?? null,
        addedSugars: null,
        vitaminD: p.nutrients.vitaminD ?? null,
        vitaminA: p.nutrients.vitaminA ?? null,
        vitaminC: p.nutrients.vitaminC ?? null,
        calcium: p.nutrients.calcium ?? null,
        iron: p.nutrients.iron ?? null,
      });
    }

    if (foodRows.length > 0) {
      await db.insert(food).values(foodRows);
      await db.insert(serving).values(servingRows);
      imported += foodRows.length;
    }

    const pct = Math.round(((i + batch.length) / topProducts.length) * 100);
    process.stdout.write(`\rProgress: ${pct}% (${imported}/${topProducts.length})`);
  }

  console.log(`\n\nDone! ${imported} OFF products imported.`);

  // Verify some popular products
  console.log("\nVerifying popular products...");
  const verifyBarcodes = [
    { barcode: "3017620422003", name: "Nutella" },
    { barcode: "5449000000996", name: "Coca-Cola" },
    { barcode: "7622210449283", name: "Oreo" },
    { barcode: "3168930010265", name: "Cristaline water" },
  ];

  for (const v of verifyBarcodes) {
    const result = await client.execute({
      sql: `SELECT f.name, f.brand_name, s.calories, s.protein, s.carb, s.fat
            FROM food f
            JOIN serving s ON s.food_id = f.id
            WHERE f.barcode = ? AND f.source = 'off'
            LIMIT 1`,
      args: [v.barcode],
    });
    if (result.rows.length > 0) {
      const r = result.rows[0];
      console.log(
        `  OK: ${r.name} (${r.brand_name}) - ${r.calories} kcal, ${r.protein}g P, ${r.carb}g C, ${r.fat}g F`,
      );
    } else {
      console.log(`  NOT FOUND: ${v.name} (${v.barcode}) — may not be in top ${TOP_N}`);
    }
  }

  // Stats
  const totalFoods = await client.execute(
    "SELECT COUNT(*) as cnt FROM food",
  );
  const offFoods = await client.execute(
    "SELECT COUNT(*) as cnt FROM food WHERE source = 'off'",
  );
  console.log(`\nDatabase totals:`);
  console.log(`  Total foods: ${totalFoods.rows[0]?.cnt}`);
  console.log(`  OFF foods: ${offFoods.rows[0]?.cnt}`);

  client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
