# Savoro Near-$0 Backend Plan

Source artifacts:
- Web research: `.pi/agent-runs/web-research-20260610T022728Z-932141/final.md`
- WIP backend audit: `.pi/agent-runs/code-scout-20260610T022758Z-4cc3e5/final.md`
- Product alignment scout: `.pi/agent-runs/ux-scout-20260610T022758Z-0dab89/final.md`
- Earlier backend mapping: `SAVORO-BACKEND-IMPLEMENTATION-MAPPING.md`

## Security note

A Turso URL/token was pasted in chat. Treat it as exposed.

- Rotate/revoke it before any implementation.
- Do not commit DB URLs/tokens.
- Do not put secrets into docs.
- Use ignored env files and/or Keychain for local development.

## Executive recommendation

For a backend that stays as close to `$0` as possible:

```txt
Recommended default:
Cloudflare Workers + Hono + D1 + R2 + Sign in with Apple + app-issued sessions/JWT
```

Why:

- Workers Free: 100,000 requests/day, 10 ms CPU/invocation.
  - https://developers.cloudflare.com/workers/platform/pricing/
- D1 Free: 5M rows read/day, 100k rows written/day, 5 GB storage.
  - https://developers.cloudflare.com/d1/platform/pricing/
- R2 Free: 10 GB-month storage, 1M Class A ops/month, 10M Class B ops/month, free internet egress.
  - https://developers.cloudflare.com/r2/pricing/
- Hono runs naturally on Workers and is already close to the WIP backend’s Hono route style.
  - https://hono.dev/docs/

Best Turso variant if you want to keep the existing DB and libSQL:

```txt
Cloudflare Workers + Hono + Turso/libSQL + R2
```

Turso free tier is strong:

- 100 databases
- 5 GB storage
- 500M rows read/month
- 10M rows written/month
- 3 GB monthly syncs
- 1-day point-in-time restore
- https://turso.tech/pricing

But Turso still needs custom auth, object storage, privacy enforcement, and API guardrails. D1 is the cleanest near-$0 all-Cloudflare stack; Turso is the best if preserving current libSQL work matters more than platform simplicity.

## What changed after deeper exploration

Earlier mapping correctly identified recipe-first schema needs, but understated the cost implications of Fly/Tigris and over-weighted Turso as the default.

After web research:

- Fly.io is not truly near-$0 for reliable production. New orgs require a card; tiny always-on shared VMs are low dollars/month and auto-stop introduces cold starts.
  - https://fly.io/docs/about/pricing/
- Render free is demo-only: web services spin down after 15 minutes and free Postgres expires after 30 days.
  - https://render.com/docs/free
- Vercel Hobby is useful for personal/non-commercial work but less ideal as the commercial iOS API default.
  - https://vercel.com/docs/plans/hobby
- Supabase is fastest if we value Auth/Postgres/RLS/Storage, but free storage/DB limits are tighter: 500 MB DB, 1 GB file storage, 5 GB egress.
  - https://supabase.com/pricing

## WIP branch backend audit summary

Remote branch `origin/wip/handoff-2026-05-03` contains an actual backend:

- `apps/api/src/**`
- `packages/db/src/schema.ts`
- `packages/ai/src/**`
- `packages/food-data/src/**`
- many route/db/AI tests

Architecture:

- Hono on Node via `@hono/node-server`.
- Drizzle + libSQL/Turso.
- Fly.io deploy with auto-stop.
- Anthropic/Vercel AI SDK chat endpoint with SSE/tool calling.
- Open Food Facts lookup/cache.
- Routes: `/auth`, `/chat`, `/food`, `/log`, `/goal`, `/favorites`, `/recipe`, `/kitchen`.

Salvageable:

- Hono route organization.
- Drizzle/libSQL schema patterns.
- Session-token auth approach: hashed session token IDs, 30-day sessions, Apple Sign-In verification.
- OFF client/normalizer concept.
- AI tool taxonomy as future reference.
- Recipe/kitchen/favorite/log route nouns and tests as reference material.

Do not port unchanged:

- Fly deploy as default near-$0 plan.
- Log schema: no frozen nutrition snapshot.
- Recipe logs: no `recipeVersionId`; uses synthetic mutable food rows.
- AI endpoint: no per-user quota/token budget/cost kill switch.
- OFF serving normalization: risk of misleading 100g vs serving macros.
- Kitchen/member privacy: member emails returned to kitchen members; needs explicit decision.
- Tigris: docs mention it, but scout found no implemented object storage.

## Product alignment decision

Current MVP should stay recipe-first, not pivot wholesale to WIP chat-first IA.

Preserve current native plan:

```txt
Today → Cookbook → Discover → Community → Profile
```

Use WIP chat/gen-UI as a deferred acceleration layer:

- Later: natural-language logging input on Today.
- Later: AI draft logs and recipe builder cards.
- Later: barcode/photo attachments.
- Always: confirm before log; no silent AI writes.

Use WIP “Kitchen” as a future community subtype, not a root IA replacement:

```txt
Community.kind = private_kitchen | public_community | invite_only_group
```

MVP Community stays recipe-first and must not include grocery/meal-planning unless explicitly reprioritized.

## Backend architecture options

### Option A — preferred near-$0 default

```txt
Cloudflare Workers + Hono + D1 + R2
```

Pros:

- Best $0 runway.
- Low cold-start risk.
- No always-on compute.
- D1 + R2 free tiers are enough for early MVP.
- One platform for API, SQL, images.

Cons:

- D1/Workers platform lock-in.
- No Postgres RLS; privacy enforced in app/repository layer.
- Need custom auth/session implementation.
- Need careful SQL/index/query design to stay within row limits.

### Option B — Turso-preserving near-$0

```txt
Cloudflare Workers + Hono + Turso/libSQL + R2
```

Pros:

- Preserves current Turso DB direction.
- Strong free tier.
- Drizzle/libSQL work from WIP branch is easier to reuse.
- SQLite/libSQL portability is better than D1-only bindings.

Cons:

- More moving parts than all-Cloudflare.
- Still no native RLS.
- Auth/storage must be built separately.
- Direct DB tokens must never reach iOS.

### Option C — fastest managed product path

```txt
Supabase Auth + Postgres + Storage
```

Pros:

- Auth, Postgres, RLS, dashboard, Storage built in.
- Fastest to secure private data if RLS is done well.

Cons:

- Free tier is tighter for app data/images.
- Pro jump is materially higher than Turso/Workers.
- More Postgres/RLS migration work away from WIP libSQL schema.

## Recommended near-$0 implementation sequence

### Phase 0 — Decide and secure

1. Rotate exposed Turso token.
2. Decide Option A vs Option B.
3. If preserving existing Turso DB matters: Option B.
4. If `$0` and operational simplicity matter most: Option A.
5. Pick backend location in repo.
6. Write a short ADR before coding.

### Phase 1 — Backend skeleton

For Option A:

- Add `apps/api` or `SavoroBackend` with Hono for Cloudflare Workers.
- Add D1 migrations.
- Add R2 binding for future images, but do not require image upload in first API slice.

For Option B:

- Port WIP `apps/api` Hono structure, but target Workers or keep Node only if absolutely needed.
- Keep Drizzle/libSQL but remove Fly as default deployment assumption.
- Add R2 for images.

Both:

- Env validation at startup/deploy.
- No fallback secrets.
- `/health`.
- Test harness.

### Phase 2 — Auth/session MVP

- Sign in with Apple first.
- Optional email/password only if needed.
- Backend verifies Apple identity token.
- Backend issues app session/refresh token.
- Store hashed session token IDs in DB.
- iOS stores token in Keychain.
- Add auth rate limiting before public launch.

### Phase 3 — Private logging and goals

Implement only private endpoints first:

```txt
GET  /v1/logs/day?date=YYYY-MM-DD
POST /v1/logs/recipes
POST /v1/logs/foods
GET  /v1/goals/current
POST /v1/goals
```

Hard requirements:

- Derive user from auth, never trusted client `userId`.
- Persist frozen nutrition snapshot on each log.
- Recipe logs require `recipeVersionId`.
- Historical totals read snapshot fields, not mutable recipe/serving rows.

### Phase 4 — Recipe lifecycle

```txt
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

Hard requirements:

- Draft/private by default.
- Published versions append-only.
- Fork preserves source recipe/version.
- Public surfaces require `visibility = public` and `status = published`.

### Phase 5 — Public search/discover/community

- Public recipe list/search.
- Public profile endpoint.
- Community tables and recipe shares.
- FTS/projection tables only for public data.
- No private logs/goals/body metrics in search/activity/community/profile DTOs.

### Phase 6 — Food data and AI

Food data:

- Start sparse/cache-on-use.
- Salvage WIP OFF client/normalizer only after fixing serving-size semantics.
- Avoid bulk food DB import.

AI/chat:

- Defer from backend MVP.
- If prototyped, add per-user quotas, token budgets, kill switch, redaction/retention policy.
- AI creates draft logs/cards only; user confirms before write.

## Schema invariants to enforce regardless of platform

- `food_log_entries` stores frozen snapshot columns/JSON.
- `food_log_entries.recipe_version_id` required for recipe logs.
- `recipes.visibility` and `recipes.status` jointly gate public access.
- `recipe_versions` immutable after publish.
- `saved_recipes` is viewer-scoped.
- `community_recipe_shares` references public/published recipes for MVP.
- Public DTO mappers never serialize raw private DB rows.

## Cost-control guardrails

- No always-on containers for MVP if `$0` is the target.
- No AI in default logging path.
- Smart router before LLM if/when AI arrives.
- Per-user AI quotas and global kill switch.
- Cache OFF lookups and rate-limit external providers.
- R2 image size limits and signed upload URLs.
- Avoid image transforms until needed.
- Add indexes before public search/feed endpoints to reduce row scans.

## Open decisions

1. Option A D1 or Option B Turso?
2. Backend folder: `apps/api/`, `SavoroBackend/`, or separate repo?
3. Preserve WIP branch code by cherry-picking/copying, or rewrite cleanly from its patterns?
4. Is Sign in with Apple enough for auth MVP?
5. Do we need image uploads in first backend slice, or URLs/placeholders only?
6. Does MVP Community include private Kitchens, or are Kitchens deferred?

## Recommendation for next action

Do not implement yet. Create an ADR that locks:

- near-$0 architecture choice,
- backend location,
- product scope alignment,
- privacy/log snapshot invariants,
- WIP salvage list.

Then implement Phase 1 behind tests on the intended WIP branch.

---

# Operational Addendum — Cloudflare/Hono/D1/R2 Details

## Hono in 2026: why it is still a good fit

Hono is not just an old edge-framework fad. Current official docs describe it as a small, zero-dependency, Web Standards framework that runs on Cloudflare Workers, Fastly Compute, Deno, Bun, Vercel, Netlify, AWS Lambda, Lambda@Edge, and Node.js. It has first-class TypeScript support and built-in middleware/helpers for bearer auth, CORS, body limits, JWT, secure headers, logging, ETag, and streaming.

Official docs:
- Hono docs: https://hono.dev/docs/
- Hono quick start: `npm create hono@latest`

Why it fits Savoro:

- We already have WIP backend code using Hono. Salvaging route shape is natural.
- It runs directly on Cloudflare Workers, the best near-$0 target.
- It uses Web `Request`/`Response`, which keeps it portable to Node/Bun/Deno if needed.
- It is small enough for Workers startup constraints.
- TypeScript + Zod/Valibot/Standard Schema validation is practical for sharing API contracts with Swift DTO tests.

When Hono is not ideal:

- Heavy background jobs.
- Long-running AI streams with expensive provider calls on the free tier.
- Native Node APIs or libraries that assume filesystem/TCP sockets.
- Complex monolith/admin app needs where a full Node server or Next.js is more convenient.

## Should we use Go?

Short answer: not for the near-$0 Cloudflare Workers MVP API.

Cloudflare Workers can run WebAssembly compiled from Go/Rust/C, but this is not equivalent to deploying a normal Go HTTP server. Official Workers docs say Wasm supports languages like Rust, Go, or C, but also notes constraints:

- Workers are single-threaded; no threading.
- WASM binaries are larger and can increase startup time.
- WASI support is experimental/partial.
- You still interact with Workers APIs/bindings through the Workers runtime model.

Official docs:
- https://developers.cloudflare.com/workers/runtime-apis/webassembly/

Use Go if:

- We choose Fly.io/Render/Railway/container hosting instead of Workers.
- We accept a non-$0 baseline cost.
- We need CPU-heavy parsing/service code where Go’s runtime/tooling matters.
- We want a conventional backend process and are okay paying for it.

Do not use Go if:

- Primary goal is near-$0.
- We want D1/R2/Workers bindings with least friction.
- We want to salvage Hono/TypeScript route and Drizzle patterns from WIP.

Recommendation:

```txt
Use TypeScript + Hono for the MVP API.
Keep Go out of the request path unless a future service genuinely needs it.
```

## What must be done in Cloudflare dashboard vs CLI?

Most setup can be done from CLI with Wrangler. Dashboard is mainly needed for account creation/login, reviewing settings, custom domains, API tokens, and optional R2 token creation if using S3 presigned URLs.

### Required dashboard steps

1. Create/log into Cloudflare account.
2. Confirm Workers subdomain, e.g. `savoro.<subdomain>.workers.dev`.
3. Optional but likely later:
   - add `api.savoro.app` custom domain
   - add `cdn.savoro.app` custom domain or public R2 bucket domain
   - inspect usage/billing limits
4. If using S3 presigned URLs for R2 uploads:
   - create R2 API token/access key in dashboard
   - store as Worker secrets, never in code

### CLI can handle

- Create Worker project.
- Create D1 database.
- Bind D1 to Worker.
- Create D1 migrations.
- Apply migrations locally/remotely.
- Create/list/delete R2 buckets.
- Add Worker secrets.
- Run local dev.
- Deploy.

## Proposed repo location

Prefer:

```txt
apps/api/
```

Rationale:

- Matches WIP branch structure.
- Keeps future web/admin packages possible.
- Easier to salvage from `origin/wip/handoff-2026-05-03:apps/api`.

Alternative:

```txt
SavoroBackend/
```

Only choose this if we want a clean separation from web/app monorepo conventions.

## Minimal Cloudflare CLI setup

From repo root, after deciding to implement:

```bash
# Create worker app, if not manually creating files
npm create cloudflare@latest apps/api
# Choose Worker only + TypeScript + no deploy initially

cd apps/api
npm install hono
npm install -D wrangler typescript vitest
```

If adding to existing package manager workspace, adapt to `bun`/`pnpm` later. Keep commands explicit in package scripts.

### Wrangler login

```bash
npx wrangler login
npx wrangler whoami
```

### Create D1 database

```bash
npx wrangler d1 create savoro-dev --binding DB --location enam
```

Cloudflare D1 location hints include:

- `wnam`: Western North America
- `enam`: Eastern North America
- `weur`: Western Europe
- `eeur`: Eastern Europe
- `apac`: Asia Pacific
- `oc`: Oceania

For current Turso URL region was AWS US East, so `enam` is a reasonable D1 hint.

Wrangler will output config like:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "savoro-dev",
      "database_id": "<uuid>"
    }
  ]
}
```

### Create R2 bucket

```bash
npx wrangler r2 bucket create savoro-dev-images
```

Add binding in `wrangler.jsonc`:

```jsonc
{
  "r2_buckets": [
    {
      "binding": "IMAGES",
      "bucket_name": "savoro-dev-images"
    }
  ]
}
```

For first backend slice, R2 can be bound but unused. Do not block private logging/recipe lifecycle on image upload.

### Secrets

Use Worker secrets for runtime secrets:

```bash
npx wrangler secret put APP_JWT_SECRET
npx wrangler secret put APPLE_CLIENT_ID
npx wrangler secret put APPLE_TEAM_ID
npx wrangler secret put APPLE_KEY_ID
npx wrangler secret put APPLE_PRIVATE_KEY
```

If using R2 S3 presigned URLs from the Worker:

```bash
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
```

But prefer direct R2 Worker binding for server-side object operations when possible; use presigned PUT only when mobile direct-upload becomes necessary.

## Example `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "savoro-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-06-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "savoro-dev",
      "database_id": "<d1-database-id>"
    }
  ],
  "r2_buckets": [
    {
      "binding": "IMAGES",
      "bucket_name": "savoro-dev-images"
    }
  ],
  "vars": {
    "ENVIRONMENT": "development",
    "PUBLIC_API_BASE_URL": "http://localhost:8787"
  }
}
```

Note: only non-secret values go in `vars`.

## Recommended package scripts

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "cf:whoami": "wrangler whoami",
    "db:create:migration": "wrangler d1 migrations create DB",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:migrate:remote": "wrangler d1 migrations apply DB --remote",
    "db:console:local": "wrangler d1 execute DB --local --command",
    "db:console:remote": "wrangler d1 execute DB --remote --command",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Wrangler D1 commands are official:
- `d1 create`
- `d1 execute`
- `d1 migrations create`
- `d1 migrations apply`
- `d1 info`
- `d1 export`

Docs: https://developers.cloudflare.com/d1/wrangler-commands/

## Minimal Hono API skeleton

```ts
// apps/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'

export type Env = {
  Bindings: {
    DB: D1Database
    IMAGES: R2Bucket
    APP_JWT_SECRET: string
    ENVIRONMENT: string
  }
  Variables: {
    currentUserId?: string
  }
}

const app = new Hono<Env>()

app.use('*', secureHeaders())
app.use('*', logger())
app.use('*', cors({
  origin: (origin) => origin ?? '*', // native apps often send no Origin
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}))

app.get('/health', (c) => c.json({ ok: true, service: 'savoro-api' }))

app.route('/v1/logs', logsRoutes)
app.route('/v1/recipes', recipeRoutes)
app.route('/v1/me', meRoutes)

export default app
```

## Auth middleware pseudocode

Do not trust `userId` from iOS payloads.

```ts
async function requireAuth(c: Context<Env>, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const token = header.slice('Bearer '.length)
  const session = await verifyAppSession(c.env.DB, token, c.env.APP_JWT_SECRET)
  if (!session) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  c.set('currentUserId', session.userId)
  await next()
}
```

Session table concept:

```sql
create table sessions (
  id text primary key,
  user_id text not null references users(id),
  token_hash text not null unique,
  expires_at text not null,
  created_at text not null,
  last_used_at text,
  revoked_at text
);

create index idx_sessions_user on sessions(user_id);
create index idx_sessions_token_hash on sessions(token_hash);
```

## D1 schema snippets for invariants

### Private logs with frozen snapshots

```sql
create table food_log_entries (
  id text primary key,
  user_id text not null references users(id),
  log_date text not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),

  item_type text not null check (item_type in ('food','recipe')),
  food_id text,
  serving_id text,
  recipe_id text references recipes(id),
  recipe_version_id text references recipe_versions(id),

  quantity real not null,
  quantity_unit text not null,

  snapshot_display_name text not null,
  snapshot_calories real not null,
  snapshot_protein_grams real not null,
  snapshot_carbs_grams real not null,
  snapshot_fat_grams real not null,
  snapshot_fiber_grams real,
  snapshot_sodium_milligrams real,
  snapshot_source_label text,
  snapshot_captured_at text not null,

  source_type text not null,
  privacy_domain text not null default 'private_user_data',

  created_at text not null,
  updated_at text not null,

  check (
    (item_type = 'recipe' and recipe_id is not null and recipe_version_id is not null and food_id is null and serving_id is null)
    or
    (item_type = 'food' and food_id is not null and recipe_id is null and recipe_version_id is null)
  )
);

create index idx_food_logs_user_date on food_log_entries(user_id, log_date);
create index idx_food_logs_user_date_meal on food_log_entries(user_id, log_date, meal_type);
create index idx_food_logs_recipe_version on food_log_entries(recipe_version_id);
```

### Recipes and immutable versions

```sql
create table recipes (
  id text primary key,
  owner_user_id text not null references users(id),
  slug text not null,
  visibility text not null check (visibility in ('private','unlisted','public')),
  status text not null check (status in ('draft','published','archived')),
  current_version_id text,
  forked_from_recipe_id text references recipes(id),
  forked_from_version_id text,
  created_at text not null,
  updated_at text not null,
  published_at text,
  archived_at text,
  unique(owner_user_id, slug)
);

create table recipe_versions (
  id text primary key,
  recipe_id text not null references recipes(id),
  version_number integer not null,
  title text not null,
  description text,
  instructions_markdown text not null,
  servings real not null,
  calories real not null,
  protein_grams real not null,
  carbs_grams real not null,
  fat_grams real not null,
  fiber_grams real,
  sodium_milligrams real,
  created_by_user_id text not null references users(id),
  created_at text not null,
  published_at text,
  immutable_after_publish integer not null default 1,
  unique(recipe_id, version_number)
);

create index idx_recipes_owner_status on recipes(owner_user_id, status);
create index idx_recipes_public on recipes(visibility, status, published_at);
create index idx_recipe_versions_recipe on recipe_versions(recipe_id, version_number);
```

## Private log endpoint pseudocode

```ts
const logsRoutes = new Hono<Env>()

logsRoutes.use('*', requireAuth)

logsRoutes.get('/day', async (c) => {
  const userId = c.get('currentUserId')!
  const date = c.req.query('date')
  if (!isLocalDate(date)) return c.json({ error: 'invalid_date' }, 400)

  const entries = await c.env.DB.prepare(`
    select * from food_log_entries
    where user_id = ? and log_date = ?
    order by meal_type, created_at
  `).bind(userId, date).all()

  const totals = sumSnapshotMacros(entries.results)
  const goal = await getCurrentGoal(c.env.DB, userId, date)

  return c.json(mapDayLogDTO({ date, entries: entries.results, totals, goal }))
})

logsRoutes.post('/recipes', async (c) => {
  const userId = c.get('currentUserId')!
  const body = await c.req.json()
  const input = parseLogRecipeInput(body)

  // Validate access and version.
  const version = await getRecipeVersionForViewer(
    c.env.DB,
    input.recipeId,
    input.recipeVersionId,
    userId,
  )
  if (!version) return c.json({ error: 'recipe_not_found' }, 404)

  // Server should derive snapshot from version when possible.
  const snapshot = buildRecipeSnapshot(version, input.servings)

  const id = newId()
  const now = new Date().toISOString()

  await c.env.DB.prepare(`
    insert into food_log_entries (
      id, user_id, log_date, meal_type, item_type,
      recipe_id, recipe_version_id, quantity, quantity_unit,
      snapshot_display_name, snapshot_calories, snapshot_protein_grams,
      snapshot_carbs_grams, snapshot_fat_grams, snapshot_fiber_grams,
      snapshot_sodium_milligrams, snapshot_source_label, snapshot_captured_at,
      source_type, privacy_domain, created_at, updated_at
    ) values (?, ?, ?, ?, 'recipe', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'private_user_data', ?, ?)
  `).bind(
    id, userId, input.date, input.mealType,
    input.recipeId, input.recipeVersionId, input.servings, 'serving',
    snapshot.displayName, snapshot.calories, snapshot.proteinGrams,
    snapshot.carbsGrams, snapshot.fatGrams, snapshot.fiberGrams,
    snapshot.sodiumMilligrams, snapshot.sourceLabel, now,
    'recipe', now, now,
  ).run()

  return c.json({ entry: await getLogEntryById(c.env.DB, userId, id) }, 201)
})
```

## Public DTO mapper pattern

Never return raw rows for public endpoints.

```ts
function mapPublicRecipeSummary(row: RecipeJoinedRow, viewer?: ViewerState): RecipeSummaryDTO {
  if (row.visibility !== 'public' || row.status !== 'published') {
    throw new Error('private_recipe_cannot_be_mapped_publicly')
  }

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    visibility: row.visibility,
    status: row.status,
    currentVersionId: row.current_version_id,
    creator: {
      id: row.creator_id,
      username: row.creator_username,
      displayName: row.creator_display_name,
      avatarUrl: row.creator_avatar_url,
    },
    macrosPerServing: {
      calories: row.calories,
      proteinGrams: row.protein_grams,
      carbsGrams: row.carbs_grams,
      fatGrams: row.fat_grams,
    },
    tags: row.tags,
    viewerState: viewer ?? null,
  }
}
```

Never include:

- log entries
- daily goal totals
- day progress
- body metrics
- private food log payloads
- adherence/compliance/progress language

## R2 image path model

For first pass, prefer image URLs/placeholders. When adding uploads:

```txt
recipe-images/{recipeId}/{uuid}.jpg
profile-images/{userId}/{uuid}.jpg
community-images/{communityId}/{uuid}.jpg
private-log-attachments/{userId}/{logEntryId}/{uuid}.jpg
```

Rules:

- Public recipe/profile/community images may be served via public URLs/CDN after moderation/validation.
- Private log attachments must remain private and be served through signed short-lived access only.
- Direct mobile upload should use presigned PUT URLs or Worker-mediated upload with size limits.
- R2 presigned URLs are bearer tokens; short expiry only.

R2 docs:
- Presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- R2 pricing/free tier: https://developers.cloudflare.com/r2/pricing/

## R2 presigned upload pseudocode

Only when we need direct mobile upload:

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

async function createRecipeImageUploadUrl(env: Env['Bindings'], userId: string, recipeId: string, contentType: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    throw new Error('unsupported_image_type')
  }

  const key = `recipe-images/${recipeId}/${crypto.randomUUID()}`

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: 'savoro-dev-images',
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  )

  return { uploadUrl: url, objectKey: key, expiresIn: 300 }
}
```

But initial implementation can skip this and store `image_url` as nullable.

## Testing strategy

Use Vitest with Hono request testing and local D1 where possible.

Critical tests before any deploy:

1. `POST /v1/logs/recipes` rejects unauthenticated request.
2. `POST /v1/logs/recipes` ignores/rejects body `userId`.
3. Recipe log requires `recipeVersionId`.
4. Day log totals sum frozen snapshots, not current recipe version.
5. Public recipe feed excludes private/unlisted/draft recipes.
6. Public profile excludes goals/logs/body metrics.
7. Community share rejects private recipes.
8. Search projection only indexes public/published recipes.

Example test shape:

```ts
it('does not trust client userId for private recipe log', async () => {
  const res = await app.request('/v1/logs/recipes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}` },
    body: JSON.stringify({
      userId: bobId,
      recipeId,
      recipeVersionId,
      date: '2026-06-10',
      mealType: 'lunch',
      servings: 1,
    }),
  }, env)

  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.entry.userId).toBe(aliceId)
  expect(body.entry.userId).not.toBe(bobId)
})
```

## First implementation slice proposal

Smallest useful backend slice:

1. `apps/api` Hono Worker.
2. D1 migrations:
   - users
   - sessions
   - recipes
   - recipe_versions
   - food_log_entries
   - nutrition_goals
3. Auth middleware with test fake-token path for local tests, real Apple later.
4. `GET /health`.
5. `GET /v1/logs/day`.
6. `POST /v1/logs/recipes`.
7. Tests for privacy and frozen snapshots.

Defer:

- R2 uploads.
- Discover/search.
- communities/kitchens.
- AI/chat.
- external food provider.

## Current recommended decision

Unless you strongly want Turso because the DB already exists, choose:

```txt
Cloudflare Workers + Hono + D1 + R2
```

If preserving the existing Turso database/work is strategically important, choose:

```txt
Cloudflare Workers + Hono + Turso + R2
```

Either way, do not use Fly as the default for a near-$0 MVP.
