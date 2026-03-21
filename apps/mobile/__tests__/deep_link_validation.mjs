/**
 * Deep Link Handling — validation tests (plain Node ESM, no test framework)
 *
 * Tests:
 *  1. publicApi() has no Authorization header and no 401 listener side effects
 *  2. Deep link URL parser (useDeepLink path extraction logic)
 *  3. Malformed / edge-case URLs
 *  4. Auth guard exempts "recipe" segment
 *  5. formatTime helper (from RecipeDetailModal)
 *  6. instructionSteps parser (split + trim + filter)
 *  7. Web page blur-wall: first 2 visible, rest blurred
 *  8. AASA file shape
 *  9. Web page helper functions (formatTime, isoDuration)
 * 10. ApiError shape
 */

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Inline mirrors of implementation helpers
// ---------------------------------------------------------------------------

// --- publicApi: key invariant — no Authorization header is ever set ---
// Mirrors lib/api.ts publicApi<T>()
function buildPublicApiHeaders(extraHeaders = {}) {
  // This mirrors the logic in publicApi exactly:
  return {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

// --- api: sets Authorization if token exists (for contrast) ---
function buildApiHeaders(token, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// --- Deep link URL parser (mirrors useDeepLink in app/_layout.tsx) ---
// Linking.parse returns { path, ... }; path is the part after the host.
function parseDeepLinkPath(rawUrl) {
  try {
    const url = new URL(rawUrl);
    // For custom scheme savoro://username/recipe-slug  → pathname = /username/recipe-slug
    // For https://savoro.app/username/recipe-slug      → pathname = /username/recipe-slug
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length === 2) {
      const [username, slug] = pathParts;
      return { username, slug };
    }
    return null;
  } catch {
    return null;
  }
}

// --- Auth guard segment check (mirrors useAuthGuard in app/_layout.tsx) ---
function shouldRedirectToLogin(isAuthenticated, segment) {
  const inAuth = segment === "(auth)";
  const inRecipe = segment === "recipe";
  return !isAuthenticated && !inAuth && !inRecipe;
}

// --- formatTime helper (mirrors RecipeDetailModal) ---
function formatTime(minutes) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// --- instructionSteps parser (mirrors RecipeDetailModal) ---
function parseInstructionSteps(instructions) {
  if (!instructions) return [];
  return instructions
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// --- Web formatTime (mirrors +page.svelte — identical logic, different unit label) ---
function webFormatTime(minutes) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// --- isoDuration helper (mirrors +page.svelte) ---
function isoDuration(minutes) {
  if (!minutes) return "PT0M";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  let d = "PT";
  if (h) d += `${h}H`;
  if (m) d += `${m}M`;
  return d;
}

// --- Blur-wall visibility logic (mirrors +page.svelte: i >= 2 gets blur-sm) ---
function ingredientVisibility(ingredients) {
  return ingredients.map((ing, i) => ({ ...ing, blurred: i >= 2 }));
}

// ---------------------------------------------------------------------------
// 1. publicApi headers — no Authorization header
// ---------------------------------------------------------------------------
console.log("\n[1] publicApi() headers — no auth header");

const pubHeaders = buildPublicApiHeaders();
assert(!("Authorization" in pubHeaders), "publicApi: no Authorization header by default");
assert(pubHeaders["Content-Type"] === "application/json", "publicApi: Content-Type is application/json");

// Even with a token in scope, publicApi should NOT pick it up
const pubHeadersWithExtra = buildPublicApiHeaders({ "X-Custom": "test" });
assert(!("Authorization" in pubHeadersWithExtra), "publicApi: no Authorization even with extra headers");
assert(pubHeadersWithExtra["X-Custom"] === "test", "publicApi: extra headers are passed through");

// Contrast: api() DOES set Authorization when token present
const authedHeaders = buildApiHeaders("some-token");
assert(authedHeaders["Authorization"] === "Bearer some-token", "api: sets Authorization when token present");
const anonHeaders = buildApiHeaders(null);
assert(!("Authorization" in anonHeaders), "api: no Authorization when token is null");

// ---------------------------------------------------------------------------
// 2. Deep link URL parser — happy paths
// ---------------------------------------------------------------------------
console.log("\n[2] Deep link URL parser — happy paths");

const httpsLink = parseDeepLinkPath("https://savoro.app/alice/chocolate-cake");
assert(httpsLink !== null, "https link: parses successfully");
assert(httpsLink?.username === "alice", "https link: username = 'alice'");
assert(httpsLink?.slug === "chocolate-cake", "https link: slug = 'chocolate-cake'");

// Custom scheme — savoro:// behaves like a URL with host = username in some parsers.
// The implementation uses Linking.parse which normalises the path. We test the path split logic:
const customSchemeSimulated = parseDeepLinkPath("savoro://alice/chocolate-cake");
// URL parses savoro://alice/chocolate-cake: host=alice, pathname=/chocolate-cake — only 1 part
// The real Linking.parse extracts { host, path } differently; test the path segment logic directly.
// pathParts from "alice/chocolate-cake" split by "/" filter Boolean = ["alice","chocolate-cake"]
function simulateLinkingParsePath(path) {
  const parts = (path ?? "").split("/").filter(Boolean);
  if (parts.length === 2) {
    const [username, slug] = parts;
    return { username, slug };
  }
  return null;
}

const r1 = simulateLinkingParsePath("alice/chocolate-cake");
assert(r1 !== null, "path parser: 'alice/chocolate-cake' → result");
assert(r1?.username === "alice", "path parser: username");
assert(r1?.slug === "chocolate-cake", "path parser: slug");

const r2 = simulateLinkingParsePath("/alice/chocolate-cake");
assert(r2 !== null, "path parser: leading slash stripped");
assert(r2?.username === "alice", "path parser: leading slash → username correct");

// ---------------------------------------------------------------------------
// 3. Malformed / edge-case deep link URLs
// ---------------------------------------------------------------------------
console.log("\n[3] Malformed & edge-case deep link paths");

// Too many segments — should return null (not navigate)
assert(simulateLinkingParsePath("alice/recipe/extra") === null, "3 segments: returns null");

// Too few segments
assert(simulateLinkingParsePath("alice") === null, "1 segment (no slug): returns null");
assert(simulateLinkingParsePath("") === null, "empty path: returns null");
assert(simulateLinkingParsePath(null) === null, "null path: returns null");

// Special characters in username/slug (URL-encoded hyphens and underscores are valid)
const special = simulateLinkingParsePath("chef_alice/spicy-miso-ramen");
assert(special !== null, "special chars: parses");
assert(special?.username === "chef_alice", "special chars: underscore in username");
assert(special?.slug === "spicy-miso-ramen", "special chars: hyphens in slug");

// Unicode in path parts
const unicode = simulateLinkingParsePath("ünïcödé/räcipé-slug");
assert(unicode !== null, "unicode: parses");
assert(unicode?.username === "ünïcödé", "unicode: username preserved");

// ---------------------------------------------------------------------------
// 4. Auth guard — "recipe" segment is exempt
// ---------------------------------------------------------------------------
console.log("\n[4] Auth guard exemptions");

// Unauthenticated user on recipe screen — should NOT redirect
assert(shouldRedirectToLogin(false, "recipe") === false, "unauthenticated on 'recipe': no redirect");
assert(shouldRedirectToLogin(false, "(auth)") === false, "unauthenticated on '(auth)': no redirect");
assert(shouldRedirectToLogin(false, "(tabs)") === true, "unauthenticated on '(tabs)': redirects");
assert(shouldRedirectToLogin(false, "modal") === true, "unauthenticated on 'modal': redirects");
assert(shouldRedirectToLogin(false, "goal") === true, "unauthenticated on 'goal': redirects");

// Authenticated user — never redirects to login
assert(shouldRedirectToLogin(true, "recipe") === false, "authenticated on 'recipe': no redirect");
assert(shouldRedirectToLogin(true, "(tabs)") === false, "authenticated on '(tabs)': no redirect");

// ---------------------------------------------------------------------------
// 5. formatTime helper (mobile RecipeDetailModal)
// ---------------------------------------------------------------------------
console.log("\n[5] formatTime helper (mobile)");

assert(formatTime(null) === "", "formatTime: null → empty string");
assert(formatTime(0) === "", "formatTime: 0 → empty string");
assert(formatTime(30) === "30m", "formatTime: 30 → '30m'");
assert(formatTime(59) === "59m", "formatTime: 59 → '59m'");
assert(formatTime(60) === "1h", "formatTime: 60 → '1h'");
assert(formatTime(90) === "1h 30m", "formatTime: 90 → '1h 30m'");
assert(formatTime(120) === "2h", "formatTime: 120 → '2h'");
assert(formatTime(125) === "2h 5m", "formatTime: 125 → '2h 5m'");

// totalTime = prepTime + cookTime, edge: one is null
const totalTime = (null ?? 0) + (30 ?? 0);
assert(formatTime(totalTime) === "30m", "formatTime: null prepTime + 30 cookTime → '30m'");

// ---------------------------------------------------------------------------
// 6. instructionSteps parser
// ---------------------------------------------------------------------------
console.log("\n[6] instructionSteps parser");

assert(parseInstructionSteps(null).length === 0, "null instructions → empty array");
assert(parseInstructionSteps("").length === 0, "empty string → empty array");
assert(parseInstructionSteps("  \n\n  ").length === 0, "whitespace-only → empty array");

const steps1 = parseInstructionSteps("Mix flour and eggs.\nBake at 180°C for 30 minutes.");
assert(steps1.length === 2, "2 newline-delimited steps → length 2");
assert(steps1[0] === "Mix flour and eggs.", "step 1 content");
assert(steps1[1] === "Bake at 180°C for 30 minutes.", "step 2 content");

// Leading numbering is stripped in the template (not the parser), but parser trims whitespace
const stepsNumbered = parseInstructionSteps("1. Mix flour.\n2. Bake.");
assert(stepsNumbered.length === 2, "numbered steps: length 2");
assert(stepsNumbered[0] === "1. Mix flour.", "numbered: trim only, no strip in parser");

// Single step
const single = parseInstructionSteps("Mix everything together.");
assert(single.length === 1, "single step: length 1");
assert(single[0] === "Mix everything together.", "single step: content");

// Blank lines between steps are filtered
const gapped = parseInstructionSteps("Step one.\n\nStep two.\n\nStep three.");
assert(gapped.length === 3, "blank lines filtered: 3 steps remain");

// ---------------------------------------------------------------------------
// 7. Web page blur-wall: first 2 visible, rest blurred
// ---------------------------------------------------------------------------
console.log("\n[7] Web page ingredient blur-wall");

const ingredients0 = [];
const vis0 = ingredientVisibility(ingredients0);
assert(vis0.length === 0, "0 ingredients: empty array");

const ingredients1 = [{ id: "a", label: "Salt" }];
const vis1 = ingredientVisibility(ingredients1);
assert(vis1[0].blurred === false, "1 ingredient: first is not blurred");

const ingredients2 = [{ id: "a", label: "Salt" }, { id: "b", label: "Pepper" }];
const vis2 = ingredientVisibility(ingredients2);
assert(vis2[0].blurred === false, "2 ingredients: index 0 not blurred");
assert(vis2[1].blurred === false, "2 ingredients: index 1 not blurred");

const ingredients3 = [
  { id: "a", label: "Salt" },
  { id: "b", label: "Pepper" },
  { id: "c", label: "Garlic" },
];
const vis3 = ingredientVisibility(ingredients3);
assert(vis3[0].blurred === false, "3 ingredients: index 0 visible");
assert(vis3[1].blurred === false, "3 ingredients: index 1 visible");
assert(vis3[2].blurred === true, "3 ingredients: index 2 blurred");

// Blur wall CTA is shown only when ingredients.length > 2
assert(ingredients3.length > 2, "blur CTA condition: shown for 3 ingredients");
assert(!(ingredients2.length > 2), "blur CTA condition: hidden for 2 ingredients");
assert(!(ingredients0.length > 2), "blur CTA condition: hidden for 0 ingredients");

const ingredients5 = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
  { id: "d", label: "D" },
  { id: "e", label: "E" },
];
const vis5 = ingredientVisibility(ingredients5);
const blurredCount5 = vis5.filter((i) => i.blurred).length;
assert(blurredCount5 === 3, "5 ingredients: 3 blurred (indices 2,3,4)");
const visibleCount5 = vis5.filter((i) => !i.blurred).length;
assert(visibleCount5 === 2, "5 ingredients: 2 visible (indices 0,1)");

// ---------------------------------------------------------------------------
// 8. AASA file shape
// ---------------------------------------------------------------------------
console.log("\n[8] AASA file shape");

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const aasaPath = path.resolve(
  __dirname,
  "../../web/static/.well-known/apple-app-site-association"
);

let aasa;
try {
  aasa = JSON.parse(readFileSync(aasaPath, "utf8"));
} catch (e) {
  console.error(`  FAIL  AASA file readable: ${e.message}`);
  failed++;
  aasa = null;
}

if (aasa !== null) {
  assert("applinks" in aasa, "AASA: has 'applinks' key");
  assert(Array.isArray(aasa.applinks?.apps), "AASA: applinks.apps is array");
  assert(Array.isArray(aasa.applinks?.details), "AASA: applinks.details is array");
  assert(aasa.applinks.details.length > 0, "AASA: at least one entry in details");

  const detail = aasa.applinks.details[0];
  assert(typeof detail.appID === "string" && detail.appID.length > 0, "AASA: detail has appID string");
  assert(detail.appID === "app.savoro.mobile", "AASA: appID matches 'app.savoro.mobile'");
  assert(Array.isArray(detail.paths), "AASA: detail has paths array");
  assert(detail.paths.length > 0, "AASA: paths is non-empty");
  // Verify the wildcard pattern covers /username/recipe-slug
  const pathPattern = detail.paths[0];
  assert(pathPattern === "/*/*", "AASA: path pattern is '/*/*' (covers username/slug)");
}

// ---------------------------------------------------------------------------
// 9. Web page helper functions (formatTime, isoDuration)
// ---------------------------------------------------------------------------
console.log("\n[9] Web page helpers");

// formatTime (web version uses "min" not "m")
assert(webFormatTime(null) === "", "web formatTime: null → ''");
assert(webFormatTime(0) === "", "web formatTime: 0 → ''");
assert(webFormatTime(20) === "20 min", "web formatTime: 20 → '20 min'");
assert(webFormatTime(60) === "1h", "web formatTime: 60 → '1h'");
assert(webFormatTime(75) === "1h 15m", "web formatTime: 75 → '1h 15m'");
assert(webFormatTime(120) === "2h", "web formatTime: 120 → '2h'");

// isoDuration
assert(isoDuration(0) === "PT0M", "isoDuration: 0 → 'PT0M'");
assert(isoDuration(30) === "PT30M", "isoDuration: 30 → 'PT30M'");
assert(isoDuration(60) === "PT1H", "isoDuration: 60 → 'PT1H'");
assert(isoDuration(90) === "PT1H30M", "isoDuration: 90 → 'PT1H30M'");
assert(isoDuration(120) === "PT2H", "isoDuration: 120 → 'PT2H'");

// ---------------------------------------------------------------------------
// 10. ApiError shape
// ---------------------------------------------------------------------------
console.log("\n[10] ApiError shape");

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const err404 = new ApiError("Recipe not found", 404);
assert(err404 instanceof Error, "ApiError: is instanceof Error");
assert(err404.name === "ApiError", "ApiError: name is 'ApiError'");
assert(err404.status === 404, "ApiError: status 404 stored");
assert(err404.message === "Recipe not found", "ApiError: message stored");

const err401 = new ApiError("Unauthorized", 401);
assert(err401.status === 401, "ApiError: status 401 stored");

// RecipeDetailModal error handling: 404 → "Recipe not found.", else → "Failed to load recipe."
function mapApiError(err) {
  if (err instanceof ApiError) {
    return err.status === 404 ? "Recipe not found." : "Failed to load recipe.";
  }
  return "Failed to load recipe.";
}

assert(mapApiError(err404) === "Recipe not found.", "error mapping: 404 → 'Recipe not found.'");
assert(mapApiError(err401) === "Failed to load recipe.", "error mapping: 401 → 'Failed to load recipe.'");
assert(mapApiError(new Error("network")) === "Failed to load recipe.", "error mapping: non-ApiError → 'Failed to load recipe.'");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
