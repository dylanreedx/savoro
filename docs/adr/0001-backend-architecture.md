# ADR 0001: Backend architecture for Savoro MVP

Date: 2026-06-10
Status: Accepted

## Decision

- **Stack:** Cloudflare Workers + Hono (TypeScript) + D1 (SQLite) + R2, deployed via Wrangler.
- **Location:** `apps/api/` in this repo; shared code moves to `packages/*` only when a second consumer exists.
- **Auth:** Phase 1 uses dev bearer-token auth against a `sessions` table (hashed tokens). Sign in with Apple is Phase 2 and issues sessions into the same table — the middleware contract does not change.
- **Product IA:** stays recipe-first 5-tab (Today / Cookbook / Discover / Community / Profile). WIP chat/gen-UI is a deferred acceleration layer; WIP "Kitchen" becomes a future `community.kind = private_kitchen`, not a root IA change.

## Why

Near-$0 hosting was a hard requirement. Cloudflare free tiers (Workers 100k req/day, D1 5M row reads/day + 5 GB, R2 10 GB + free egress) cover the MVP on one platform with no card-required always-on compute. See `SAVORO-ZERO-COST-BACKEND-PLAN.md` for pricing sources and the full comparison.

## Rejected alternatives

- **Turso/libSQL as the database** — strong free tier, but adds a second vendor, still needs custom auth/storage/privacy, and the existing DB's token was exposed in chat (must be rotated/abandoned regardless).
- **Fly.io (WIP branch's deploy target)** — small monthly cost plus auto-stop cold starts; not near-$0.
- **Go on Workers** — WASM/TinyGo constraints, not a normal Go HTTP server. TypeScript + Hono only.
- **Porting the WIP branch backend (`origin/wip/handoff-2026-05-03`) unchanged** — see salvage list below.

## WIP branch salvage list

Reuse as reference: Hono route organization; hashed-session-token auth approach (30-day sessions, Apple identity verification flow); Open Food Facts client/normalizer concept; route nouns and tests.

Do **not** port: log schema (no frozen nutrition snapshot); recipe logging via synthetic mutable food rows (no `recipeVersionId`); AI chat endpoint (no per-user quota, token budget, or kill switch); Fly deploy config; OFF serving normalization as-is (100g-vs-serving ambiguity); kitchen member-email exposure.

## Invariants (enforced in code and tests)

1. **Frozen snapshots.** Every food log row stores its nutrition values at write time. Historical totals are computed only from stored snapshots, never from current recipe/food data.
2. **Recipe versioning.** Recipe log entries store `recipe_version_id`. Editing a recipe creates a new version; old logs keep pointing at the version they logged.
3. **Identity from session.** `userId` is always derived from the authenticated session. Client-supplied user IDs in bodies or query strings are never trusted.
4. **Privacy at the DTO layer.** D1 has no row-level security; every repository query is scoped by the session's `userId`, and public DTOs never include logs, goals, body metrics, day progress, or adherence. Each invariant has a test.
5. **No secrets in the repo.** Config via `wrangler.jsonc` bindings and Wrangler secrets; local dev via ignored `.env` files.

## Out of scope for Phase 1

Sign in with Apple, R2 uploads, Discover/Community endpoints, food search (OFF/FatSecret), all AI features, production deploy.
