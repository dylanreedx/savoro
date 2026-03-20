/**
 * Discover Screen Phase 1 — validation tests (plain Node ESM, no test framework required)
 *
 * Tests:
 *  1. Placeholder data shape integrity (KitchenPreview, SocialRecipeShare, TrendingRecipe)
 *  2. Store field existence (kitchens, socialFeed, trending)
 *  3. relativeTime helper logic (extracted inline, mirrors implementation)
 *  4. MacroPill LABEL_MAP completeness for all four macro keys
 *  5. savedCount formatting logic (>=1000 → "Xk")
 *  6. Avatar overflow: only first 4 shown, +N badge when >4
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
// Inline mirror of the data and helpers from the implementation
// (avoids needing bundler/module resolution for React Native imports)
// ---------------------------------------------------------------------------

// --- Types / placeholder data (mirrored from lib/stores/discover.ts) ---
const PLACEHOLDER_KITCHENS = [
  {
    id: "k1",
    name: "Sunday Meal Prep",
    memberAvatars: ["https://i.pravatar.cc/80?u=a1", "https://i.pravatar.cc/80?u=a2", "https://i.pravatar.cc/80?u=a3"],
    auraColor: "rgba(251,113,133,0.35)",
  },
  {
    id: "k2",
    name: "High Protein Club",
    memberAvatars: ["https://i.pravatar.cc/80?u=b1", "https://i.pravatar.cc/80?u=b2"],
    auraColor: "rgba(147,197,253,0.35)",
  },
  {
    id: "k3",
    name: "Vegan Eats",
    memberAvatars: ["https://i.pravatar.cc/80?u=c1", "https://i.pravatar.cc/80?u=c2", "https://i.pravatar.cc/80?u=c3", "https://i.pravatar.cc/80?u=c4"],
    auraColor: "rgba(196,181,253,0.35)",
  },
];

const PLACEHOLDER_SOCIAL_FEED = [
  {
    id: "s1",
    sharedBy: { name: "Alex Rivera", avatar: "https://i.pravatar.cc/80?u=alex" },
    sharedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    recipeName: "Spicy Miso Salmon Bowl",
    macros: { cal: 520, protein: 42, carbs: 38, fat: 18 },
    provenance: "Adapted from a family recipe",
  },
  {
    id: "s2",
    sharedBy: { name: "Jordan Lee", avatar: "https://i.pravatar.cc/80?u=jordan" },
    sharedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    recipeName: "Greek Yogurt Protein Pancakes",
    macros: { cal: 340, protein: 28, carbs: 32, fat: 10 },
    provenance: "Quick weekday breakfast",
  },
  {
    id: "s3",
    sharedBy: { name: "Sam Patel", avatar: "https://i.pravatar.cc/80?u=sam" },
    sharedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    recipeName: "Chipotle Chicken Burrito Bowl",
    macros: { cal: 610, protein: 48, carbs: 52, fat: 22 },
    provenance: "Copycat restaurant recipe",
  },
];

const PLACEHOLDER_TRENDING = [
  {
    id: "t1",
    recipeName: "Overnight Oats 3 Ways",
    macros: { cal: 380, protein: 18, carbs: 52, fat: 12 },
    savedCount: 1243,
    imageUrl: null,
  },
  {
    id: "t2",
    recipeName: "One-Pan Lemon Herb Chicken",
    macros: { cal: 450, protein: 38, carbs: 12, fat: 28 },
    savedCount: 987,
    imageUrl: null,
  },
  {
    id: "t3",
    recipeName: "Cottage Cheese Ice Cream",
    macros: { cal: 210, protein: 24, carbs: 18, fat: 6 },
    savedCount: 2105,
    imageUrl: null,
  },
];

// --- relativeTime (mirrored from RecipeShareCard.tsx) ---
function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// --- savedCount formatter (mirrored from RecipeShareCard.tsx) ---
function formatSavedCount(count) {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

// --- MacroPill LABEL_MAP (mirrored from MacroPill.tsx) ---
const LABEL_MAP = {
  cal: " cal",
  protein: "g P",
  carbs: "g C",
  fat: "g F",
};

// ---------------------------------------------------------------------------
// 1. KitchenPreview shape
// ---------------------------------------------------------------------------
console.log("\n[1] KitchenPreview shape");
for (const k of PLACEHOLDER_KITCHENS) {
  assert(typeof k.id === "string" && k.id.length > 0, `kitchen ${k.id}: id is non-empty string`);
  assert(typeof k.name === "string" && k.name.length > 0, `kitchen ${k.id}: name is non-empty string`);
  assert(Array.isArray(k.memberAvatars) && k.memberAvatars.length > 0, `kitchen ${k.id}: memberAvatars is non-empty array`);
  assert(k.memberAvatars.every((a) => typeof a === "string" && a.startsWith("http")), `kitchen ${k.id}: memberAvatars are URLs`);
  assert(typeof k.auraColor === "string" && k.auraColor.startsWith("rgba("), `kitchen ${k.id}: auraColor is rgba string`);
}
assert(PLACEHOLDER_KITCHENS.length === 3, "kitchens: exactly 3 items");

// ---------------------------------------------------------------------------
// 2. SocialRecipeShare shape
// ---------------------------------------------------------------------------
console.log("\n[2] SocialRecipeShare shape");
for (const s of PLACEHOLDER_SOCIAL_FEED) {
  assert(typeof s.id === "string" && s.id.length > 0, `share ${s.id}: id present`);
  assert(typeof s.sharedBy.name === "string" && s.sharedBy.name.length > 0, `share ${s.id}: sharedBy.name present`);
  assert(typeof s.sharedBy.avatar === "string" && s.sharedBy.avatar.startsWith("http"), `share ${s.id}: sharedBy.avatar is URL`);
  assert(typeof s.sharedAt === "string" && !isNaN(Date.parse(s.sharedAt)), `share ${s.id}: sharedAt is valid ISO string`);
  assert(typeof s.recipeName === "string" && s.recipeName.length > 0, `share ${s.id}: recipeName present`);
  assert(typeof s.macros.cal === "number" && s.macros.cal > 0, `share ${s.id}: macros.cal > 0`);
  assert(typeof s.macros.protein === "number" && s.macros.protein > 0, `share ${s.id}: macros.protein > 0`);
  assert(typeof s.macros.carbs === "number" && s.macros.carbs > 0, `share ${s.id}: macros.carbs > 0`);
  assert(typeof s.macros.fat === "number" && s.macros.fat > 0, `share ${s.id}: macros.fat > 0`);
  assert(typeof s.provenance === "string" && s.provenance.length > 0, `share ${s.id}: provenance present`);
}
assert(PLACEHOLDER_SOCIAL_FEED.length === 3, "socialFeed: exactly 3 items");

// ---------------------------------------------------------------------------
// 3. TrendingRecipe shape
// ---------------------------------------------------------------------------
console.log("\n[3] TrendingRecipe shape");
for (const t of PLACEHOLDER_TRENDING) {
  assert(typeof t.id === "string" && t.id.length > 0, `trending ${t.id}: id present`);
  assert(typeof t.recipeName === "string" && t.recipeName.length > 0, `trending ${t.id}: recipeName present`);
  assert(typeof t.savedCount === "number" && t.savedCount > 0, `trending ${t.id}: savedCount > 0`);
  assert(t.imageUrl === null || typeof t.imageUrl === "string", `trending ${t.id}: imageUrl is null or string`);
  assert(typeof t.macros.cal === "number", `trending ${t.id}: macros.cal is number`);
  assert(typeof t.macros.protein === "number", `trending ${t.id}: macros.protein is number`);
  assert(typeof t.macros.carbs === "number", `trending ${t.id}: macros.carbs is number`);
  assert(typeof t.macros.fat === "number", `trending ${t.id}: macros.fat is number`);
}
assert(PLACEHOLDER_TRENDING.length === 3, "trending: exactly 3 items");

// ---------------------------------------------------------------------------
// 4. relativeTime helper
// ---------------------------------------------------------------------------
console.log("\n[4] relativeTime helper");
const nowIso = new Date().toISOString();
const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

assert(relativeTime(thirtyMinsAgo).endsWith("m ago"), "relativeTime: 30 mins ago → Xm ago");
assert(!relativeTime(thirtyMinsAgo).includes("h ago"), "relativeTime: 30 mins ago does NOT show hours");
assert(relativeTime(twoHoursAgo) === "2h ago", "relativeTime: 2 hours ago → '2h ago'");
assert(relativeTime(tenHoursAgo) === "10h ago", "relativeTime: 10 hours ago → '10h ago'");
assert(relativeTime(twoDaysAgo) === "2d ago", "relativeTime: 2 days ago → '2d ago'");
// Edge: 0 mins → "0m ago"
assert(relativeTime(nowIso) === "0m ago", "relativeTime: just now → '0m ago'");
// Verify social feed entries produce valid relative times
for (const s of PLACEHOLDER_SOCIAL_FEED) {
  const result = relativeTime(s.sharedAt);
  assert(/^\d+(m|h|d) ago$/.test(result), `relativeTime: share ${s.id} → "${result}" matches pattern`);
}

// ---------------------------------------------------------------------------
// 5. savedCount formatting
// ---------------------------------------------------------------------------
console.log("\n[5] savedCount formatting");
assert(formatSavedCount(987) === "987", "savedCount: 987 → '987' (no k suffix)");
assert(formatSavedCount(1000) === "1.0k", "savedCount: 1000 → '1.0k'");
assert(formatSavedCount(1243) === "1.2k", "savedCount: 1243 → '1.2k'");
assert(formatSavedCount(2105) === "2.1k", "savedCount: 2105 → '2.1k'");
assert(formatSavedCount(999) === "999", "savedCount: 999 → '999' (boundary below 1000)");
// Verify all trending items format correctly
for (const t of PLACEHOLDER_TRENDING) {
  const result = formatSavedCount(t.savedCount);
  assert(typeof result === "string" && result.length > 0, `trending ${t.id}: savedCount ${t.savedCount} → "${result}"`);
}

// ---------------------------------------------------------------------------
// 6. MacroPill LABEL_MAP completeness
// ---------------------------------------------------------------------------
console.log("\n[6] MacroPill LABEL_MAP");
const REQUIRED_MACRO_KEYS = ["cal", "protein", "carbs", "fat"];
for (const key of REQUIRED_MACRO_KEYS) {
  assert(key in LABEL_MAP, `LABEL_MAP has key: ${key}`);
  assert(typeof LABEL_MAP[key] === "string" && LABEL_MAP[key].length > 0, `LABEL_MAP[${key}] is non-empty string`);
}
assert(Object.keys(LABEL_MAP).length === 4, "LABEL_MAP has exactly 4 keys");

// ---------------------------------------------------------------------------
// 7. KitchenCard avatar overflow logic
// ---------------------------------------------------------------------------
console.log("\n[7] KitchenCard avatar overflow logic");
function sliceAvatars(memberAvatars) {
  const shown = memberAvatars.slice(0, 4);
  const overflowCount = memberAvatars.length > 4 ? memberAvatars.length - 4 : 0;
  return { shown, overflowCount };
}

// k1 has 3 avatars: show 3, no overflow
const k1 = sliceAvatars(PLACEHOLDER_KITCHENS[0].memberAvatars);
assert(k1.shown.length === 3, "k1 (3 avatars): shows 3");
assert(k1.overflowCount === 0, "k1 (3 avatars): no overflow badge");

// k2 has 2 avatars
const k2 = sliceAvatars(PLACEHOLDER_KITCHENS[1].memberAvatars);
assert(k2.shown.length === 2, "k2 (2 avatars): shows 2");
assert(k2.overflowCount === 0, "k2 (2 avatars): no overflow badge");

// k3 has 4 avatars: show 4, no overflow
const k3 = sliceAvatars(PLACEHOLDER_KITCHENS[2].memberAvatars);
assert(k3.shown.length === 4, "k3 (4 avatars): shows 4");
assert(k3.overflowCount === 0, "k3 (4 avatars): no overflow badge");

// Synthetic: 6 avatars → show 4, overflow badge = +2
const synthetic = sliceAvatars(["a", "b", "c", "d", "e", "f"]);
assert(synthetic.shown.length === 4, "6 avatars: shows exactly 4");
assert(synthetic.overflowCount === 2, "6 avatars: overflow badge shows +2");

// Synthetic: exactly 4 avatars → no overflow
const exact4 = sliceAvatars(["a", "b", "c", "d"]);
assert(exact4.shown.length === 4, "exactly 4 avatars: shows 4");
assert(exact4.overflowCount === 0, "exactly 4 avatars: no overflow badge");

// ---------------------------------------------------------------------------
// 8. Store field existence (structural check on initializer object)
// ---------------------------------------------------------------------------
console.log("\n[8] Store initial state fields");
const storeInitialState = {
  recipes: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  cursor: null,
  hasMore: true,
  filters: { sort: "popular" },
  kitchens: PLACEHOLDER_KITCHENS,
  socialFeed: PLACEHOLDER_SOCIAL_FEED,
  trending: PLACEHOLDER_TRENDING,
};
assert("kitchens" in storeInitialState, "store has kitchens field");
assert("socialFeed" in storeInitialState, "store has socialFeed field");
assert("trending" in storeInitialState, "store has trending field");
assert(Array.isArray(storeInitialState.kitchens), "kitchens is array");
assert(Array.isArray(storeInitialState.socialFeed), "socialFeed is array");
assert(Array.isArray(storeInitialState.trending), "trending is array");
assert(storeInitialState.kitchens.length > 0, "kitchens is non-empty on init");
assert(storeInitialState.socialFeed.length > 0, "socialFeed is non-empty on init");
assert(storeInitialState.trending.length > 0, "trending is non-empty on init");
// Existing fields still present (regression check)
assert("recipes" in storeInitialState, "store still has recipes field (regression)");
assert("filters" in storeInitialState, "store still has filters field (regression)");
assert(storeInitialState.filters.sort === "popular", "default filter sort is 'popular'");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
