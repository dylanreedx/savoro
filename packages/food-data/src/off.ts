// Open Food Facts API client
// Docs: https://world.openfoodfacts.org/data

const BASE_URL = "https://world.openfoodfacts.org";
const USER_AGENT = "Savoro/1.0 (https://savoro.app)";

export interface OFFNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  "saturated-fat_100g"?: number;
  "trans-fat_100g"?: number;
  "polyunsaturated-fat_100g"?: number;
  "monounsaturated-fat_100g"?: number;
  cholesterol_100g?: number;
  sodium_100g?: number;
  potassium_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  "added-sugars_100g"?: number;
  "vitamin-d_100g"?: number;
  "vitamin-a_100g"?: number;
  "vitamin-c_100g"?: number;
  calcium_100g?: number;
  iron_100g?: number;
}

export interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: OFFNutriments;
  nutrition_grades?: string;
  serving_size?: string;
  serving_quantity?: number;
  status?: number;
}

interface OFFSearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: OFFProduct[];
}

interface OFFProductResponse {
  status: number;
  product?: OFFProduct;
}

const SEARCH_FIELDS = [
  "code",
  "product_name",
  "brands",
  "nutriments",
  "nutrition_grades",
  "serving_size",
  "serving_quantity",
].join(",");

// Simple token-bucket rate limiter: max 10 requests per second
let tokenCount = 10;
let lastRefill = Date.now();
const MAX_TOKENS = 10;
const REFILL_INTERVAL_MS = 1000;

function acquireToken(): boolean {
  const now = Date.now();
  const elapsed = now - lastRefill;
  if (elapsed >= REFILL_INTERVAL_MS) {
    tokenCount = MAX_TOKENS;
    lastRefill = now;
  }
  if (tokenCount > 0) {
    tokenCount--;
    return true;
  }
  return false;
}

async function offFetch(url: string): Promise<Response> {
  if (!acquireToken()) {
    throw new Error("OFF API rate limit exceeded, try again shortly");
  }
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
}

export async function searchOFF(
  query: string,
  pageSize = 20
): Promise<OFFProduct[]> {
  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&fields=${SEARCH_FIELDS}`;
  const res = await offFetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as OFFSearchResponse;
  return data.products ?? [];
}

export async function getOFFProduct(
  barcode: string
): Promise<OFFProduct | null> {
  const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${SEARCH_FIELDS}`;
  const res = await offFetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as OFFProductResponse;
  if (data.status !== 1 || !data.product) return null;
  return data.product;
}
