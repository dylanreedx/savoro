# Savoro Backend Implementation Mapping

Source artifacts:
- Previous backend audit: `.pi/agent-runs/code-scout-20260610T021643Z-6b8ee4/final.md`
- Native client data-needs scout: `.pi/agent-runs/code-scout-20260610T021643Z-20f9b4/final.md`
- Turso/libSQL planning scout: `.pi/agent-runs/code-scout-20260610T021643Z-cc620f/final.md`

## Immediate security note

A Turso URL/token was pasted in chat. Treat it as exposed.

- Rotate/revoke the token before implementation.
- Do not write database tokens into docs, code, migrations, or committed env files.
- Future local config should use Keychain or ignored `.env.local` only.
- Prior `../bite` also contains a hardcoded Turso credential fallback in `../bite/packages/db/src/db.ts`; do not reuse it.

## Objective

Plan a cheaper, more efficient Savoro backend using Turso/libSQL while preserving product invariants:

- Private logs, goals, body metrics, day progress, and food log payloads stay private.
- Public/social/community/search surfaces are recipe-first and never expose private nutrition logs/goals/body metrics.
- Food logs preserve frozen nutrition snapshots.
- Recipe logs preserve `recipeVersionId`.
- Recipes support draft/save/publish/archive/fork lifecycle.
- Friends and communities are MVP scope.
- Avoid shaming/compliance framing in API/DTO naming and user-facing copy.

## What `../bite` gives us

`../bite` is a TypeScript Turborepo:

- `apps/web`: Next.js 15 App Router UI + API routes.
- `packages/db`: Drizzle ORM targeting Turso/libSQL.
- `apps/fs-proxy`: Express FatSecret proxy deployed separately to Fly.io.
- Schema tables: `food`, `serving`, `user`, `session`, `food_log`.

Reusable as reference:

- Drizzle + Turso/libSQL setup pattern.
- Basic food/serving cache concept.
- FatSecret/external nutrition adapter idea.
- Local-first search-then-cache pattern.

Do not port unchanged:

- Auth: JWT cookie with unsafe `JWT_SECRET || 'secret'` fallback.
- Middleware: only checks cookie presence.
- Privacy: `GET /api/food/log?userId=...` can expose logs for arbitrary users.
- Logs: no frozen `NutritionSnapshot`; historical logs can drift with current serving values.
- Food-first data model: too broad/costly before Savoro recipe-first MVP is proven.
- FatSecret proxy: open CORS, no auth/rate limit, cold-start prone, long in-request retry.

Conclusion: `../bite` is a cautionary/reference implementation, not the Savoro backend foundation.

## Recommended backend shape

```txt
Savoro iOS SwiftUI app
  -> HTTPS JSON API /v1
    -> small TypeScript API service, Hono or Fastify
      -> Drizzle ORM
        -> Turso/libSQL
      -> R2/S3-compatible image storage later
```

Recommended choices:

- API framework: Hono or Fastify.
- DB: Turso/libSQL.
- ORM/migrations: Drizzle.
- Auth: Sign in with Apple first; email optional later.
- Images: Cloudflare R2 or S3-compatible storage.
- Search MVP: SQLite FTS5 public projections.
- Avoid Meilisearch/Algolia/large food imports until usage proves need.

Why cheaper/more efficient than `../bite`:

1. Model recipes/logs/social contracts first, not a large food database first.
2. Store frozen snapshots directly on logs.
3. Store recipe nutrition summary/version data directly.
4. Cache food/source data sparsely on use.
5. Use FTS only for public recipes/profiles/communities.
6. Keep private logs/goals/body metrics outside public projections entirely.

## Native client backend requirements

Current iOS seams already exist:

- `SavoroIOS/Savoro/Core/API/APIClient.swift`
- `SavoroIOS/Savoro/Core/API/LoggingRequests.swift`
- `SavoroIOS/Savoro/Core/API/MockAPIClient.swift`

Current mock request:

- `LogRecipeRequest` posts to `/mock/logs/recipes`.
- Payload includes full frozen `NutritionSnapshot`.
- Response is `LogRecipeResponse(entry, dayLog?)`.

Backend should move this to real endpoints and derive user identity from auth:

- `POST /v1/logs/recipes`
- `GET /v1/logs/day?date=YYYY-MM-DD`

Important adjustment:

- Real APIs should not trust client-supplied `userId` for private writes.
- Use authenticated `currentUserId` in middleware/repositories.

## Schema v0 plan

Use text UUID/ULID IDs. Use ISO-8601 text timestamps. Use `YYYY-MM-DD` local dates for day logs. Turso/libSQL has no Postgres RLS, so enforce privacy in API/repository layer plus public projection separation.

### Identity/profile

Core tables:

- `users`
- `auth_identities`
- `user_profiles`

Purpose:

- App identity.
- Provider identity mapping, initially Apple.
- Own/public profile metadata.

Public profile DTO must not include goals, logs, day progress, body metrics, or food log payloads.

### Private goals/body metrics

Core tables:

- `nutrition_goals`
- `body_metrics`

Rules:

- Always scoped by authenticated user.
- Never joined into public profile/search/community/activity queries.
- Include `privacy_domain = 'private_user_data'` for defense-in-depth/tests.

### Recipes/versioning

Core tables:

- `recipes`
- `recipe_versions`
- `recipe_ingredients`
- `recipe_steps`
- `recipe_tags`

Rules:

- Public surfaces require `recipes.visibility = 'public'` and `recipes.status = 'published'`.
- `recipe_versions` are append-only after publish.
- Editing a published recipe creates a new version.
- Logs/forks reference the exact `recipe_version_id` used.

### Save/fork/lifecycle

Core tables:

- `saved_recipes`
- `recipe_events`

Flows:

- Save: current user saves public/published recipe.
- Draft: recipe is private/draft by default.
- Publish: validate complete draft/version, then set published/public or unlisted.
- Fork: copy source public/published version into a new private draft owned by current user; preserve source `recipe_id` and `recipe_version_id`.

### Private logs

Core table:

- `food_log_entries`

Required fields:

- `user_id`
- `log_date`
- `meal_type`
- `item_type = food|recipe`
- `food_id`/`serving_id` for foods
- `recipe_id`/`recipe_version_id` for recipes
- `quantity`, `quantity_unit`
- frozen snapshot columns:
  - display name
  - calories
  - protein/carbs/fat
  - optional fiber/sodium
  - source label
  - captured timestamp
- `source_type`
- `privacy_domain = private_user_data`

Rules:

- Snapshot fields are authoritative for Today/history.
- Do not recalculate historical logs from current recipe/serving values.
- Recipe logs require `recipe_version_id`.
- Logs never feed public activity/search/community/profile.

### Food source/cache MVP

Core tables:

- `foods`
- `food_servings`

MVP strategy:

- Start sparse.
- Seed fixtures/manual foods only if needed.
- Add USDA/OFF/FatSecret lookup later behind a typed provider adapter.
- Cache external foods only when users import/log/save them.

### Relationships/friends

Core table:

- `user_relationships`

MVP options:

- Follow model first, or friend request/accept.
- If friends are required for MVP, use request/accept and reciprocal accepted rows for simple lookup.

### Communities

Core tables:

- `communities`
- `community_members`
- `community_recipe_shares`

Rules:

- MVP community shares reference public/published recipes only.
- Private/unlisted communities require membership for detail/feed access.
- Public search includes only public communities.

### Activity/search projections

Core tables/projections:

- `activity_items`
- `recipe_search` FTS5
- optional `profile_search`
- optional `community_search`

Rules:

- Activity types limited to recipe/community/profile events.
- Do not create activity from food logs, goals, progress, body metrics, or nutrition compliance.
- FTS projections include only public/published/searchable entities.
- Remove projection rows when visibility changes away from public.

## API boundary plan

Root: `/v1`

### Auth/profile

```txt
GET    /v1/me
PATCH  /v1/me/profile
GET    /v1/profiles/:username
```

### Private Today/logging

```txt
GET    /v1/logs/day?date=YYYY-MM-DD
POST   /v1/logs/recipes
POST   /v1/logs/foods
PATCH  /v1/logs/:id
DELETE /v1/logs/:id

GET    /v1/goals/current
POST   /v1/goals
PATCH  /v1/goals/:id
```

### Recipes/cookbook

```txt
GET    /v1/recipes/:id
POST   /v1/recipes
PATCH  /v1/recipes/:id
POST   /v1/recipes/:id/publish
POST   /v1/recipes/:id/archive
POST   /v1/recipes/:id/fork
POST   /v1/recipes/:id/save
DELETE /v1/recipes/:id/save

GET    /v1/cookbook/recipes
GET    /v1/cookbook/saved
```

### Discover/search

```txt
GET /v1/discover
GET /v1/search?q=...
GET /v1/recipes?visibility=public&tag=...
```

### Friends/social

```txt
POST   /v1/users/:id/follow
DELETE /v1/users/:id/follow

POST /v1/friends/requests
POST /v1/friends/requests/:id/accept
POST /v1/friends/requests/:id/decline
GET  /v1/friends
GET  /v1/activity
```

### Communities

```txt
GET  /v1/communities
POST /v1/communities
GET  /v1/communities/:slug
POST /v1/communities/:id/join
POST /v1/communities/:id/leave
GET  /v1/communities/:id/feed
POST /v1/communities/:id/share-recipe
```

## Privacy strategy for Turso/libSQL

Turso/libSQL has no native Postgres-style RLS. Use application-enforced privacy plus table/projection separation.

Required practices:

1. Auth middleware resolves `currentUserId`.
2. Private endpoints derive `user_id` from `currentUserId`, never request body/query.
3. Repository functions are viewer-aware:
   - `getPrivateDayLog(currentUserId, date)`
   - `getRecipeForViewer(recipeId, viewerUserId)`
   - `listCommunityFeed(communityId, viewerUserId)`
4. Public DTO mappers serialize only approved fields.
5. Never serialize raw DB rows directly for public/search/social endpoints.
6. Add privacy regression tests:
   - Search excludes private recipes/profiles/communities.
   - Activity excludes logs/goals/body metrics.
   - Community shares reject private recipes.
   - Day logs/goals require owner auth.
   - Public profile excludes private nutrition data.

## Migration / implementation phases

### Phase 0 — Branch + contract lock

- Switch to the user’s intended WIP branch before editing.
- Rotate/revoke exposed Turso tokens.
- Decide backend location/package name.
- Decide exact DTO encoding for dates/timestamps and enum strings.
- Decide if real log request removes `userId`; recommendation: yes.

### Phase 1 — Minimal Turso foundation

- Add TypeScript API app/package.
- Add Drizzle/libSQL config and migrations.
- Add identity/profile, recipes/versions/ingredients/steps/tags, logs, goals.
- Validate env at boot; no fallback credentials/secrets.

### Phase 2 — Private Today/logging API

- Implement `GET /v1/logs/day`.
- Implement `POST /v1/logs/recipes`.
- Implement `POST /v1/logs/foods` if needed.
- Preserve frozen snapshot and require recipeVersionId.
- Add privacy/ownership tests.

### Phase 3 — Recipe lifecycle API

- Create/edit draft.
- Save draft.
- Publish.
- Archive.
- Fork.
- Enforce append-only published versions.

This aligns with current iOS next child `SAV-72` and parent `SAV-18`.

### Phase 4 — Public discover/search

- Public recipes endpoint.
- Recipe FTS projection.
- Public profile endpoint.
- Public DTO/privacy mappers.

### Phase 5 — Friends/communities MVP

- Relationships/friends.
- Communities/members.
- Community recipe shares.
- Activity feed limited to recipe/community/profile events.

### Phase 6 — Food source expansion

- External food provider adapter.
- Sparse cache-on-use `foods`/`food_servings`.
- Avoid bulk food imports until needed.

## Recommended Linear/backlog tickets

1. Backend architecture decision record.
2. Secure config/token rotation and env validation.
3. Schema v0 migrations.
4. Auth middleware/current-user repository contract.
5. Private logging API with frozen snapshots.
6. Recipe draft/save/publish/fork API.
7. Public DTO/privacy mapper layer.
8. Public recipe search with FTS.
9. Friends MVP.
10. Communities MVP.
11. Sparse food source/cache MVP.
12. iOS API integration seam from mock `/mock/logs/recipes` to `/v1/logs/recipes`.

## Open questions before coding

- Which WIP branch should be used?
- Where should backend live?
  - inside this repo, e.g. `SavoroBackend/` or `apps/api/`
  - in existing `savoro-web/`
  - separate repo/package
- Deployment target:
  - Cloudflare Workers
  - Fly.io
  - Render/Railway
  - other
- Auth MVP:
  - Sign in with Apple only?
  - email/password?
  - anonymous/local-first account upgrade?
- Image storage choice:
  - R2
  - S3
  - defer images and use URLs/placeholders
- Food provider timing:
  - seed/manual only for MVP?
  - FatSecret/OFF/USDA adapter now?
- Community model:
  - dedicated Community tab content for MVP, or community surfaces mainly via Discover?

## Immediate recommendation

Do not start backend code yet. First:

1. Rotate the exposed Turso token.
2. Switch to the intended WIP branch.
3. Create/approve a short backend ADR from this mapping.
4. Then implement Phase 1 schema/API foundation behind tests.
