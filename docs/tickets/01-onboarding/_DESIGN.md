# 01-onboarding — account, onboarding, and Checkpoint A

Status: P0.8 contract/design gate approved 2026-08-05; downstream paused while bounded P0.3 is reopened
Owner direction: privacy-first, calm, zero-judgment; no mixed mock/live in any distributed build
Outer loop: `docs/loop-protocol.md` and `docs/agent-workflow.md` remain the operating system; this
program specializes them for one queue. Decisions here were recorded in the hosted roadmap
(plan-649320e6605c4dcf, approved 2026-08-02) and supersede `docs/epics/onboarding.md` (OB-1..OB-50).

## 1. Product thesis

A person installs Savoro from TestFlight, creates a real account, picks a username, completes a
privacy-first setup — or skips most of it — and lands in a live Today they can log calories into.
Every screen they can reach reads and writes the deployed API or is honestly unavailable. The epic
ends at **Checkpoint A**: an uploaded, usable TestFlight build that survives relaunch and reinstall.

Savoro's voice is calm and non-judgmental. Skipping goal setup is a designed mode, not a degraded
one. A user who never sets targets is never shown progress math, denominators, or coaching copy.

## 2. Locked design direction

These decisions are instructions, not suggestions for ticket workers.

1. **Two auth methods, one session.** Sign in with Apple AND email/password ship at MVP. Both
   converge on the same opaque bearer session immediately after the credential exchange; everything
   downstream (Keychain, 401 handling, state machine, expiry) is written once.
2. **No password reset or email verification at MVP.** Deferred past the core gate. Lockout
   recovery is manual re-issue via seed tooling (P1.4). This is an accepted, documented limitation.
3. **Passwords are PBKDF2 via WebCrypto.** Workers has no native bcrypt/argon2. Versioned params,
   constant-time verify, never plaintext at rest.
4. **Username is collected during signup on its own page**, immediately after account creation, for
   BOTH auth methods (Apple provides no username either). Every completed onboarding has a
   public-capable identity; the old publish-time identity gate is gone.
5. **Identity fields are nullable only mid-onboarding.** `GET /v1/me` carries an explicit
   `onboardingState`. The raw-ID fallback (`?? user.id`) dies in all three DTO mappers
   (`apps/api/src/dto/profiles.ts`, `dto/recipes.ts`, `dto/social.ts`). Raw ids never appear in any
   user-visible string.
6. **Targets are calories-first.** The user enters one number; the app proposes an editable
   protein/carb/fat split and submits all four through the EXISTING `POST /v1/goals` contract
   (calories + 3 macros, each finite and > 0 — `apps/api/src/routes/goals.ts`). No goal-contract
   change in this program.
7. **Skip is first-class.** A nil goal propagates as nil — the `goal.goal?.dailyTargets ?? .zero`
   collapse in `SavoroIOS/Savoro/Core/API/LoggingRequests.swift` is a named defect. The goal-less
   Today is designed: bare totals, no ring denominator, no "N / 0 cal", no progress copy, one calm
   add-targets affordance. A Profile screen provides goal editing and sign out.
8. **Intent is a routing hint, not identity.** One screen, three options ("Track what I eat" /
   "Build my recipe collection" / "Both"); it chooses the landing tab and whether the targets step
   is offered. Client-side only; nothing persisted; no new contract surface.
9. **Contract changes are human-only.** `docs/api-contract.md` is edited exclusively by Dylan-approved
   dedicated `[Contract]` commits (P0.8). Workers draft diffs; they never land them.
10. **Frozen nutrition becomes an extensible nutrient map** (four macros required) in the catalog-food
    contract draft, so micronutrients never force a frozen-log migration. Drafted in P0.6, implemented
    in the Checkpoint B program, not here.
11. **Release never carries development tokens.** The current Debug-only env-var seam
    (`SavoroIOS/Savoro/App/AppEnvironment.swift`) is replaced by Release-safe base-URL configuration
    plus Keychain session injection. The old guard test ("Release must be mock") becomes "Release
    must never carry dev credentials".
12. **Fixtures serve previews and tests only.** No distributed screen renders fixture data. Static
    `liveTodaySections` and fixture-owned orchestration leave the runtime path.
13. **Banned copy is a blocker.** No adherence, compliance, failure, failed, over limit, guilt,
    cheat, "bad food"; no raw IDs, `mock`, `scaffold`, or backend jargon in visible strings. The
    existing copy lint extends to every new surface.
14. **Privacy defaults hold.** `profileVisibility` defaults to `private`. Public DTOs never spread
    logs, goals, body data, or private progress. A second account must not read the first's data.
15. **Design is reviewed by a human.** Deterministic gates certify decoding, state machines,
    geometry, and copy — not beauty. The queue stops at supervised rows; Dylan owns visual verdicts.
16. **Never apply `apps/api/seed/local-dev.sql` remotely.** It contains a known development token.
    Remote seeding goes through P1.4's safe tooling only.

## 3. Current pipeline and its limit

```text
SavoroApp
  → RootPlaceholderView (5 tabs, no auth gate, no first-run state)
  → Today only: usesLiveTodayAPI? → TodayAPIService (Debug env-var gate)
  → everything else: fixtures / MockAPIClient (/mock/… mirrors)
```

What exists and is good: a tested Hono/D1 backend (124 vitest tests: goals, logs, recipes,
cookbook, profiles, social, foods), Apple token exchange (`POST /v1/auth/apple`), opaque bearer
sessions with expiry/revocation columns, a typed iOS API layer with contract-exact request tests,
a 36-image snapshot matrix ({light,dark} × {standard,XXXL}), and an XCUITest live-Worker journey.

The limits this program removes:

- **No auth or onboarding UI exists at all.** No `Features/Onboarding/`, no `Core/Auth/`; the app
  boots straight into tabs. The Profile tab is a stub.
- **No email/password auth exists server-side.** `users` has no email or password columns.
- **`GET /v1/me` can emit `username: null` and a raw id as `displayName`** while Swift's
  `UserProfile` requires both non-optional — the first live call for a fresh user throws a decode
  error.
- **A goal-less user renders "N / 0 cal"** with a permanently empty ring and copy that lies,
  and no UI anywhere can create or edit a goal.
- **The real HTTP client has zero test coverage** (`URLSessionAPIClient.send` — status branching,
  error envelopes, decoding). Every response test runs through `MockAPIClient` fixtures.
- **`src/lib/apple.ts` is never exercised** — auth tests inject a fake verifier; session
  expiry/revocation columns have no tests.
- **The live journey is skipped by default** (`SAVORO_RUN_LIVE_UI_TEST=1` / marker file), so the
  only end-to-end proof regresses silently.
- **Release is hard-wired to mock**, so no TestFlight build has ever exercised the live path.
- **No remote deployment exists** — `wrangler.jsonc` carries the zero-UUID D1 placeholder.

## 4. Target architecture

```text
iPhone (TestFlight)                          Cloudflare preview
─────────────────────                        ──────────────────
Welcome / Auth screen
  ├─ Sign in with Apple ─────────────────▶  POST /v1/auth/apple      (verifier: JWKS, aud, iss, exp)
  └─ Email + password ──────────────────▶  POST /v1/auth/signup|login (PBKDF2, 409/401 taxonomy)
                │                                    │
                ▼                                    ▼
        SessionStore ◀──── opaque session ──── sessions (expiresAt, revokedAt enforced)
        (Keychain; restore on launch; clear on 401/logout)
                │
                ▼
SavoroApp root state machine: signedOut → onboarding(step) → authenticated
                │
   onboarding steps (server-authoritative resume via GET /v1/me onboardingState):
   username page → profile basics (display name + privacy) → intent (client-side) → targets (optional)
                │
                ▼
        Today (live; goal or designed goal-less) · Profile (targets editor, sign out)
```

One authenticated API boundary replaces launch-environment tokens and per-screen mock seams.

## 5. Module and file boundaries

### `apps/api` (Hono Worker + D1)

- `src/routes/auth.ts` — Apple exchange today; gains signup/login/logout.
- `src/lib/` — `apple.ts` (existing verifier), new `passwords.ts` (PBKDF2).
- `src/middleware/auth.ts` — `findUserIdByToken` is the single session chokepoint; gains
  expiry/revocation enforcement.
- `src/routes/profiles.ts`, `src/dto/profiles.ts` — onboarding state, username availability,
  fallback removal.
- `src/db/schema.ts` + `drizzle/` migrations — email/password columns.
- `test/` — vitest; every endpoint ticket lands with route + repo tests.

### `SavoroIOS/Savoro`

- `Core/Auth/` (new) — SessionStore, Keychain token store, Apple authorization adapter (protocol +
  DEBUG mock), auth request types.
- `Core/API/` — APIClient central 401 handling; URLProtocol test harness; typed me/goals requests.
- `App/SavoroApp.swift`, `App/AppEnvironment.swift`, `App/RootPlaceholderView.swift` — root state
  machine, Release-safe configuration, removal of fixture orchestration.
- `Features/Onboarding/` (new) — the six onboarding screens.
- `Features/Today/`, `Features/Profile/` — goal-less mode, account screen.
- `SavoroTests/` — unit + snapshot (swift-snapshot-testing, 4-mode matrix);
  `SavoroUITests/SavoroSmokeJourneyTests.swift` — journeys.

All frontend work builds from the L-35 design-system primitives; hand-rolled padding, raw colors,
and ad-hoc fonts are lint failures.

## 6. Verification doctrine

Every ticket has a deterministic part. Commands (from `docs/loop-protocol.md`):

```bash
cd apps/api && bun run test && bun run typecheck
cd SavoroIOS && xcodebuild test -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 17'
```

Required categories across the program:

- endpoint tests: success, each named failure mode, cross-user isolation, session-derived identity;
- Apple verifier proof against a locally signed JWKS fixture (forged sig, wrong aud/iss, expired);
- session lifecycle: expiry and revocation observed as 401 at the middleware chokepoint;
- URLProtocol-stubbed live-client tests: status branching, error envelopes, decoding — including
  the nullable mid-onboarding `GET /v1/me` payload;
- root state machine transitions as unit tests (signedOut/onboarding/authenticated, resume,
  reinstall, mid-session 401);
- snapshot matrix {light,dark} × {standard,XXXL} for every new screen and every named state
  (normal, empty, loading, error) — the goal-less Today is a required state, not an afterthought;
- XCUITest journeys with per-step screenshots; the live-Worker journey becomes REQUIRED at
  checkpoint gates instead of skipped-by-default;
- banned-copy grep over all new visible strings;
- test counts re-derived from runner output, never read from `docs/STATUS.md` (P0.2 reconciles it).

Negative witnesses are required where a packet names them: mutate the final implementation to
reintroduce the named failure, record the exact red assertion, restore, and rerun green. "Tests
green" without the named witness is not done.

### Never weaken a gate

No removing suites or matrix modes; no lowering counts or floors to pass; no broadening the copy
lint allowlist; no re-recording snapshot references outside the ticket that owns them
(`SavoroIOS/Scripts/record-snapshots.sh` pins the expected reference count — grow it deliberately);
no replacing a real-path check with a stand-in that cannot fail the production seam.

## 7. Migration strategy

1. Foundations first: program guard, ledger reconciliation, pre-land script (P0.1–P0.3) — the loop's
   own instruments are trustworthy before feature work starts.
2. Contracts and design are drafted (P0.4–P0.7) and approved in one supervised gate (P0.8). Nothing
   downstream builds against an unapproved contract.
3. Preview infrastructure (P1) makes a deployed Worker real; local Worker remains the dev loop.
4. Backend auth and profile (P2–P3) land endpoint-by-endpoint, each with its failure-mode tests.
5. iOS auth core (P4) builds against the local Worker and mocks; the root state machine replaces
   the unconditional tab boot.
6. Onboarding UI (P5) builds only after the design verdict; screens land with their snapshot sets.
7. Goal-less mode and Profile (P6) close the skip path; supervised visual review (P7.3) gates density.
8. Checkpoint A (P8): manual logging live, fixtures out of runtime, physical-device Apple check,
   archive, upload, UAT.

At no point may a distributed build mix fixture and live data on one screen.

## 8. Explicit non-goals

- Password reset, email verification, or any email-sending infrastructure.
- Micronutrient storage, display, or targets (the contract draft only makes them cheap later).
- USDA import, catalog-food logging implementation, recipe/Cookbook work (Checkpoint B program).
- Social surfaces, communities, video import, Discover work.
- Adaptive/coached goal math (MacroFactor-style TDEE) — targets are user-entered, calories-first.
- Rebuilding the design system; new screens compose existing L-35 primitives.
- Migrating this queue to Linear (blocked since 2026-07-17; `docs/backlog-local.md` is the index).

## 9. Human review gates

The queue intentionally stops five times:

1. **P0.8 contract + design approval** — Dylan lands the three `[Contract]` commits and approves
   the onboarding design pack (or redlines it).
2. **P1.2 Cloudflare provisioning** — Wrangler sign-in and preview D1 creation are Dylan's account
   actions.
3. **P7.3 onboarding visual review** — all six screens plus goal-less Today, both appearances,
   both type sizes, against the approved design pack.
4. **P8.4 physical-device Apple sign-in** — entitlements only prove themselves on Dylan's iPhone.
5. **P8.5 Checkpoint A UAT** — fresh install, both account types, complete AND skip paths, log,
   relaunch, verify persistence. Feedback becomes new tickets before Checkpoint B work starts.

The loop must stop and report when a supervised row becomes first eligible; it never marks one done
on Dylan's behalf.
