# Savoro API Contract — Phase 1

This document is the shared source of truth for the parallel UI and backend tracks. The backend implements exactly these shapes; the iOS app shapes its mocks (`MockAPIClient`) to them. Change this file first, in its own commit on `main`, before either side diverges.

JSON is camelCase to match the iOS `Codable` models in `SavoroIOS/Savoro/Core/Models/NutritionModels.swift`. Dates: calendar days are `YYYY-MM-DD` strings; timestamps are ISO 8601 UTC strings.

## Conventions

### Auth

```
Authorization: Bearer <session-token>
```

Phase 1 tokens are dev tokens seeded into the `sessions` table. Sign in with Apple (Phase 2) issues tokens into the same table; clients see no change. The server derives the user from the token — **request bodies never carry `userId`**. (The current iOS `LogRecipeRequestPayload` includes `userId` and a client-built `snapshot`; the real API ignores unknown fields, but UI track should drop them when pointing at the real client.)

### Error envelope

Non-2xx responses:

```json
{ "error": { "code": "unauthorized", "message": "Invalid or expired session token." } }
```

Codes used in Phase 1: `unauthorized` (401), `not_found` (404), `validation_failed` (422), `internal` (500).

## Shared shapes

### MacroTotals

```json
{
  "calories": 520,
  "proteinGrams": 38.5,
  "carbsGrams": 42,
  "fatGrams": 21,
  "fiberGrams": 6.5,
  "sodiumMilligrams": 740
}
```

`fiberGrams` / `sodiumMilligrams` optional (omitted when unknown).

### NutritionSnapshot

Frozen at log time, server-computed, immutable thereafter.

```json
{
  "displayName": "Chicken Burrito Bowl",
  "macros": { "...": "MacroTotals" },
  "sourceLabel": "recipe v3",
  "capturedAt": "2026-06-10T18:03:21Z"
}
```

### FoodLogEntry

```json
{
  "id": "log_01J...",
  "userId": "usr_01J...",
  "date": "2026-06-10",
  "mealType": "lunch",
  "itemType": "recipe",
  "foodId": null,
  "servingId": null,
  "recipeId": "rec_01J...",
  "recipeVersionId": "rcv_01J...",
  "quantity": 1.5,
  "quantityUnit": "serving",
  "snapshot": { "...": "NutritionSnapshot" },
  "sourceType": "recipe",
  "privacyDomain": "private_user_data",
  "createdAt": "2026-06-10T18:03:21Z",
  "updatedAt": "2026-06-10T18:03:21Z"
}
```

`mealType`: `breakfast | lunch | dinner | snack`. `itemType`: `food | recipe`. `sourceType`: `manual | search | barcode | recipe | ai_draft`.

## Endpoints

### GET /health

No auth. `200 {"status":"ok"}`.

### GET /v1/logs/day?date=YYYY-MM-DD

Auth required. Returns the authenticated user's day, grouped by meal, with totals computed **only from stored snapshots**.

```json
{
  "dayLog": {
    "userId": "usr_01J...",
    "date": "2026-06-10",
    "meals": [
      { "mealType": "lunch", "entries": [ { "...": "FoodLogEntry" } ], "totals": { "...": "MacroTotals" } }
    ],
    "totals": { "...": "MacroTotals" },
    "privacyDomain": "private_user_data"
  },
  "goal": { "dailyTargets": { "...": "MacroTotals" } }
}
```

`goal` is `null` when the user has no active goal for that date. Meals with no entries are omitted. Missing `date` param → `validation_failed`.

### POST /v1/logs/recipes

Auth required. Logs a recipe serving for the authenticated user.

Request:

```json
{
  "recipeId": "rec_01J...",
  "recipeVersionId": "rcv_01J...",
  "date": "2026-06-10",
  "mealType": "lunch",
  "servings": 1.5
}
```

- `recipeVersionId` optional: if present it must belong to `recipeId` (else `validation_failed`); if absent the server uses the recipe's current version. Either way the server loads that version's nutrition, scales by `servings`, and **freezes the snapshot server-side** — any client-supplied `snapshot` or `userId` is ignored.
- `servings` must be finite and > 0.
- Unknown `recipeId` → `not_found`. Recipe must be visible to the user (own recipe, or public).

Response `201`:

```json
{ "entry": { "...": "FoodLogEntry" }, "dayLog": { "...": "as in GET /v1/logs/day" } }
```

### POST /v1/auth/apple

No auth. Exchanges an Apple identity token for an app session.

Request: `{ "identityToken": "<jwt from Sign in with Apple>" }`

Response `200`:

```json
{
  "sessionToken": "<opaque bearer token — returned once, store in Keychain>",
  "user": { "id": "usr_01J...", "email": "relay@privaterelay.appleid.com", "displayName": null }
}
```

Server verifies the token against Apple's JWKS (issuer `https://appleid.apple.com`,
audience = app bundle id), upserts the user by Apple `sub`, and stores only a hash of
the session token. Invalid/expired identity token → `unauthorized`.

### GET /v1/goals/current?date=YYYY-MM-DD

Auth required. The goal active on `date` for the authenticated user, or `{ "goal": null }`.

```json
{ "goal": { "id": "goal_01J...", "dailyTargets": { "...": "MacroTotals" }, "startDate": "2026-06-01", "endDate": null } }
```

### POST /v1/goals

Auth required. Creates a goal starting `startDate` (open-ended unless `endDate` given).
Creating a goal that overlaps an existing open goal closes the old one at `startDate`.

Request:

```json
{ "dailyTargets": { "...": "MacroTotals" }, "startDate": "2026-06-11", "endDate": null }
```

Response `201`: `{ "goal": { "...": "as above" } }`. Invalid dates or non-positive
targets → `validation_failed`.

### POST /v1/logs/foods

Auth required. Logs a manually-entered food (no food database row required). The
client supplies the nutrition for the logged amount; the server freezes it verbatim
as the snapshot — it is never recomputed or shared.

Request:

```json
{
  "displayName": "Greek yogurt, 2% (manual)",
  "macros": { "...": "MacroTotals for the logged amount" },
  "date": "2026-06-10",
  "mealType": "breakfast",
  "quantity": 1,
  "quantityUnit": "serving"
}
```

Response `201`: same shape as `POST /v1/logs/recipes` — `{ "entry": ..., "dayLog": ... }`
with `itemType: "food"`, `sourceType: "manual"`. Client-supplied `userId` is ignored.

---

# Phase 2+ domains

Everything below maps the remaining UI surfaces to endpoints. DTO field names match
the iOS models in `SavoroIOS/Savoro/Core/Models/RecipeModels.swift` and
`SocialModels.swift` — those files are the canonical field lists; this section defines
endpoint semantics, auth, and privacy rules. All endpoints require auth unless noted.
Pagination: list endpoints accept `?cursor=&limit=` (default 20, max 50) and return
`{ "items": [...], "nextCursor": "..." | null }`.

## Recipes — lifecycle

DTOs: `RecipeSummary`, `RecipeVersion`, `Ingredient`, `Step`, `RecipeDetail`
(summary + currentVersion + ingredients + steps), `RecipeViewerState`
(`isOwner/isSaved/canFork/canLog`, computed server-side per viewer).

- `POST /v1/recipes` — create a draft (visibility `private`, status `draft`). Body:
  title, description?, servings, ingredients[], steps[], perServingMacros. Creates
  recipe + version 1. → `201 { "recipe": RecipeDetail }`
- `PATCH /v1/recipes/:id` — owner only. Editing a *draft* mutates version 1 in place;
  editing a *published* recipe creates a new version (append-only — published
  versions are immutable, logs keep pointing at the version they logged).
  → `{ "recipe": RecipeDetail }`
- `GET /v1/recipes/:id` — visible if owner, or `visibility != private` and
  `status = published`. Includes viewer-computed `viewerState`. Unlisted = reachable
  by id/link, never listed. → `{ "recipe": RecipeDetail }`
- `POST /v1/recipes/:id/publish` — owner only. Body: `{ "visibility": "public" | "unlisted" }`.
  Freezes current version (immutable), sets status `published`. → `{ "recipe": RecipeDetail }`
- `POST /v1/recipes/:id/unpublish` — owner only; back to `private`/`draft`. Existing
  logs and forks keep their version references.
- `POST /v1/recipes/:id/archive` — owner only; hides from all lists, keeps versions
  for historical logs.
- `POST /v1/recipes/:id/fork` — viewer must be able to see the recipe. Creates a new
  *private draft* copy owned by the caller with `forkedFromRecipeId` +
  `forkedFromVersionId` preserved. Source recipe is never modified. → `201 { "recipe": RecipeDetail }`

## Cookbook — save/lists

- `POST /v1/recipes/:id/save` / `DELETE /v1/recipes/:id/save` — viewer-scoped
  `saved_recipes` row. Saving requires visibility.
- `GET /v1/cookbook/mine` — own recipes (any status), newest first.
- `GET /v1/cookbook/saved` — saved recipes still visible to the viewer.
- `GET /v1/cookbook/drafts` — own drafts only.

## Logs — management (extends Phase 1)

- `GET /v1/logs/recents?limit=` — the viewer's most recent distinct logged items
  (for the log picker), newest first.
- `DELETE /v1/logs/:entryId` — owner only.
- `PATCH /v1/logs/:entryId` — owner only; may change `date`, `mealType`, `quantity`.
  Changing quantity rescales the frozen snapshot proportionally **from the stored
  snapshot values** — never re-reads current recipe/food data.

## Discover & search

Public surfaces: only `visibility = public` + `status = published` recipes ever
appear. No logs, goals, or private data in any response (server-enforced DTO mappers).

- `GET /v1/discover/recipes?rail=featured|recent|trending&cursor=` — public recipe
  rails. → `{ "items": [RecipeSummary] }`
- `GET /v1/search?q=&kind=recipes|profiles|communities|all` — combined search.
  → `{ "query": "...", "results": [SearchResult] }` (`SearchResult` = kind + one of
  recipe/profile/community). First implementation may be SQL LIKE; FTS later.
- `GET /v1/foods/search?q=` — food database search (sparse cache-on-use backed by
  Open Food Facts; per-100g vs per-serving semantics must be explicit in the DTO).
- `GET /v1/foods/:id` — food detail with servings.

## Profiles & social

DTOs: `UserProfile`, `PublicProfile` (profile + isSelf + followState + publicRecipes),
`UserRelationship`.

- `GET /v1/me` — current user + own profile + settings.
- `PATCH /v1/me/profile` — username, displayName, bio, avatarUrl, links, visibility.
- `GET /v1/profiles/:username` — public profile. **Never includes** logs, goals, body
  metrics, day progress, or adherence — tested denylist.
- `GET /v1/profiles/:username/recipes` — that user's public published recipes.
- `POST /v1/users/:id/follow` / `DELETE /v1/users/:id/follow`
- `POST /v1/friends/requests` (body: targetUserId), `POST /v1/friends/requests/:id/accept`,
  `POST /v1/friends/requests/:id/decline`, `GET /v1/friends`
- `GET /v1/activity?scope=friends|communities` — activity feed. Event types are
  recipe/community/profile events ONLY (`recipe_published`, `recipe_forked`,
  `joined_community`, ...). **Logging food is never an activity event.**

## Communities

DTOs: `Community` (with `viewerMembership`), `CommunityMember`, `CommunityRecipeShare`.

- `GET /v1/communities/mine` — joined + pending.
- `POST /v1/communities` — create (caller becomes owner).
- `GET /v1/communities/:idOrSlug` — detail + viewer membership state.
- `PATCH /v1/communities/:id` — owner/admin only.
- `POST /v1/communities/:id/join` — respects joinPolicy (open → active,
  request → pending, invite_only → 403 without invite).
- `POST /v1/communities/:id/leave`
- `GET /v1/communities/:id/members` — members only. **Exposes username/displayName/
  avatar — never email** (the WIP-branch email leak is explicitly rejected).
- `GET /v1/communities/:id/recipes` — community share feed (members, or anyone if
  community is public).
- `POST /v1/communities/:id/recipes` — share a recipe + caption. Recipe must be
  public+published (or the sharer's own unlisted — pick stricter: public only for MVP).
- `DELETE /v1/communities/:id/recipes/:shareId` — sharer or admin.

## Images (R2)

- `POST /v1/images/upload-url` — body: `{ "kind": "recipe" | "profile" | "community", "ownerId": "...", "contentType": "image/jpeg|png|webp" }`.
  Returns short-lived presigned PUT URL + final public URL. Keys per the R2 path
  model in `SAVORO-ZERO-COST-BACKEND-PLAN.md`. Size limit enforced; private log
  attachments are NOT in scope.

## Explicitly deferred (no tickets until re-decided)

Collections, recipe reactions/comments, barcode lookup, body metrics endpoints,
AI/chat anything, offline sync, monetization.

## Privacy guarantees (tested invariants)

- All `/v1/logs/*` data is scoped to the session user; there is no parameter that reads another user's logs.
- Public recipe DTOs (later phases) will never embed logs, goals, body metrics, day progress, or adherence.
- Snapshots are immutable: editing a recipe after logging never changes historical entries or day totals.
