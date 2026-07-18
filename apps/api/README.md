# Savoro API

Cloudflare Workers + Hono + D1 backend for the Savoro MVP.

Phase 1 endpoints are defined in `../../docs/api-contract.md`. Do not change response/request shapes here without updating that contract first.

## Local setup

```bash
cd apps/api
bun install
bun run db:migrate:local
bun run db:seed:local
bun run dev
```

The local seed is deterministic and idempotent. It creates:

- user: `usr_dev_alice`
- local-only bearer token: `dev-alice-token`
- active goal for dates after `2026-01-01`
- recipe: `rec_dev_bowl`
- recipe version: `rcv_dev_bowl_v1`

The token is a non-secret local fixture. Production/dev deploy secrets must use ignored `.env` files locally and Wrangler secrets remotely.

## Verification

In another shell:

```bash
curl -s http://localhost:8787/health
```

Expected:

```json
{"status":"ok"}
```

Read a seeded empty day log:

```bash
curl -s 'http://localhost:8787/v1/logs/day?date=2026-06-10' \
  -H 'Authorization: Bearer dev-alice-token'
```

Log the seeded recipe:

```bash
curl -s -X POST 'http://localhost:8787/v1/logs/recipes' \
  -H 'Authorization: Bearer dev-alice-token' \
  -H 'Content-Type: application/json' \
  -d '{
    "recipeId": "rec_dev_bowl",
    "recipeVersionId": "rcv_dev_bowl_v1",
    "date": "2026-06-10",
    "mealType": "lunch",
    "servings": 1.5
  }'
```

Then read the day again:

```bash
curl -s 'http://localhost:8787/v1/logs/day?date=2026-06-10' \
  -H 'Authorization: Bearer dev-alice-token'
```

Expected behavior:

- `dayLog.userId` is `usr_dev_alice`, derived from the bearer token.
- the logged entry has `recipeVersionId: "rcv_dev_bowl_v1"`.
- nutrition totals are computed from frozen snapshot columns.
- client-supplied `userId` or `snapshot` fields are ignored by the log endpoint.

## Social MVP semantics

- Follow and unfollow are viewer-scoped and idempotent. A private profile may be
  followed, but the follow grants no visibility: that profile and its activity
  remain hidden.
- Friend requests are accepted or declined only by the target user. Repeating a
  same-direction pending request returns the existing request; a reverse pending
  request is rejected rather than changing who owns the decision.
- `GET /v1/activity?scope=friends` is a read-time projection of public-profile
  friends' public, published recipe events only. It never queries food logs,
  goals, progress/adherence, or body metrics.
- `GET /v1/activity?scope=communities` currently returns `{ "items": [] }` with
  the final contract shape. It remains empty until community persistence lands.

## Tests

```bash
cd apps/api
bun run test
bun run typecheck
```

Current invariant tests live in `test/logs.test.ts` and pin:

1. recipe logs store frozen snapshots and `recipeVersionId`
2. historical totals stay frozen if recipe nutrition changes later
3. user identity comes from the session token
4. one user cannot read another user's logs

## Useful scripts

```bash
bun run dev              # wrangler dev
bun run db:migrate:local # apply D1 migrations to local DB
bun run db:seed:local    # seed deterministic local integration data
bun run test             # vitest
bun run typecheck        # TypeScript check
```
