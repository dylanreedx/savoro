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

## Privacy guarantees (tested invariants)

- All `/v1/logs/*` data is scoped to the session user; there is no parameter that reads another user's logs.
- Public recipe DTOs (later phases) will never embed logs, goals, body metrics, day progress, or adherence.
- Snapshots are immutable: editing a recipe after logging never changes historical entries or day totals.
