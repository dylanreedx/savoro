# Local backlog (Linear blocked)

Linear (Savorofit/SAV, project "Savoro MVP") cannot take new or edited tickets right now,
so gap tickets discovered after 2026-07-17 live here. Same rules as Linear tickets:
one track label each, agents claim one at a time, and each migrates to a real SAV issue
when Linear unblocks. IDs here are `L-<n>` unless the SAV ID is already known from code
or docs. `docs/ideas/` remains the place for unscheduled product concepts.

Source: full repo audit on 2026-07-17 (main @ 77d74b6; iOS 204/204 tests green,
API 66/66 tests + typecheck green).

## Backend — track:backend

- **SAV-129 — Recipe publish/unpublish/archive endpoints.** `POST /v1/recipes/:id/publish`,
  `/unpublish`, `/archive` per contract. Today a recipe can never leave `draft` via the
  API (create always yields `private`/`draft`); every recipe test forces state with raw
  SQL. This blocks any recipe becoming public/loggable/forkable by others, so it gates
  Discover, Cookbook-save, and real fork flows. Highest-priority backend item.
- **L-1 — `getLoggableVersion` missing `status='published'` check.**
  `apps/api/src/repo/recipes.ts:30` allows logging any `public` recipe regardless of
  status, while the DTO computes `canLog = isOwner || (published && public)`
  (`src/dto/recipes.ts:50`). Unreachable through the API until SAV-129 exists, but the
  two rules disagree — fix alongside or before SAV-129. Small.
- **SAV-131 — Cookbook endpoints.** `POST/DELETE /v1/recipes/:id/save`,
  `GET /v1/cookbook/mine|saved|drafts`. `viewerState.isSaved` is currently hardcoded
  `false` in the recipe DTO pending this.
- **L-2 — Logs management endpoints.** `GET /v1/logs/recents`, `DELETE /v1/logs/:entryId`,
  `PATCH /v1/logs/:entryId` per contract.
- **L-3 — Discover/search endpoints.** `GET /v1/discover/recipes`, `GET /v1/search`,
  `GET /v1/foods/search`, `GET /v1/foods/:id`. Depends on SAV-129 (needs published
  public recipes to surface).
- **SAV-133 — Profiles/usernames.** `GET /v1/me`, `PATCH /v1/me/profile`,
  `GET /v1/profiles/:username[/recipes]`. Recipe DTO currently uses `owner.id` as a
  username placeholder.
- **L-4 — Provision remote D1 + deploy wiring.** `wrangler.jsonc` `database_id` is the
  zero-UUID placeholder; `db:migrate:remote`/`deploy` are unusable until replaced.
  Ops-ish; needed before any live integration testing against a deployed Worker.

## Frontend — track:frontend

- **SAV-72 — Recipe editor save/publish UX.** Next child of SAV-18 per
  SAVORO-IOS-UI-UX-MAPPING.md; pairs with SAV-129 on the backend.
- **L-5 — Discover tab (SAV-21 children).** `DiscoverPlaceholderView` is a 16-line stub.
  Mock-first like the recipe flows; the video-carousel idea in
  `docs/ideas/video-discover-carousel.md` stays unscheduled until its open questions
  resolve.
- **L-6 — Profile tab (SAV-25/26 children).** 16-line stub.
- **L-7 — Community tab (SAV-22/23 children).** 16-line stub.

## Integration — track:integration

- **L-8 — Wire iOS to the live API.** `URLSessionAPIClient` and `AppEnvironment.live`
  exist but are never invoked; the app is hard-wired to `MockAPIClient` in
  `SavoroApp.swift` and `RootPlaceholderView.swift:220`, and request paths use `/mock/…`
  mirrors instead of `/v1/…`. Scope: environment selection, `/v1` paths, auth token flow
  (Apple auth exists backend-side via SAV-125), and error/loading states against a real
  network. Per workflow rules this starts only when the relevant frontend and backend
  issues are Done — currently gated on SAV-129 at minimum.

## Housekeeping (no track)

- **L-9 — Retire `origin/wip/handoff-2026-05-03`** (72 commits, pre-rebuild
  AI-chat/kitchens generation, dead since 2026-05-03). Before deleting, mine it for
  reusable ideas: offline queue + tests, deep-link resolution tests, discover feed
  tests, food search/barcode endpoints with OFF/USDA seeds (`scripts/seed-off.ts`,
  `seed-usda.ts`).
- **L-10 — Remove or archive `savoro-web/`** (SvelteKit site, off the iOS-only MVP
  direction, untouched since 2026-06-05). Precedent: `savoro-web-2` was already removed.
- **L-11 — Dedupe prototype bundles.** `Savoro MVP/` and `savoro-mvp/` are near-duplicate
  copies of the Claude Design handoff; keep one as the visual reference.

## Adversarial recheck corrections (2026-07-17)

- The source-state sentence above is not literally clean: `main` is synced with
  `origin/main` at `77d74b6`, but `.agents/`, `.codex/`, and this backlog are untracked.
- **L-1 is confirmed and higher severity than first stated.** A real local Worker probe
  showed another user receives `404` when fetching a `public` + `draft` recipe but can
  still log it successfully (`201`). Add a stranger/public/draft regression test.
- **SAV-129 should also add real publish metadata.** `RecipeVersion.publishedAt` is always
  `null` and the schema has no published timestamp, so the lifecycle implementation must
  make the contract field representable.
- **L-8 wording correction.** The app shell hardcodes `MockAPIClient` for log/fork only;
  most screens use local fixtures/stores or static views rather than APIClient requests.
  Add dependency-injected environment selection and a real XCUITest journey for
  log recipe → fork → edit the fork.
- **L-9 salvage result.** Reuse the old offline queue's FIFO/partial-failure semantics as
  design reference, not code. Reuse deep-link/discover tests as acceptance scenarios,
  not executables. Port the food normalizer/cache concepts with current D1/contracts.
  Treat `seed-usda.ts`/`seed-off.ts` as reference only; do not run unchanged.
- **L-10 correction.** Do not remove `savoro-web/` wholesale. The architecture explicitly
  retains the web base for landing, public recipe/profile pages, previews, and deep links,
  and its landing page still matches the product thesis. Narrow this to an ownership and
  obsolete server/database-code review before archiving anything.
- **L-11 is an exact duplicate, not a near-duplicate.** `diff -qr 'Savoro MVP'
  savoro-mvp/project` reports no differences.

## Additional Backend gaps — track:backend

- **L-12 — Prevent invalid goal date ranges.** Creating a backdated open goal currently
  closes every later open goal to the day before the new start, producing rows where
  `endDate < startDate`. Define historical/future overlap semantics and add chronological,
  backdated-open, and bounded-range regression tests.
- **L-13 — Upgrade vulnerable API dependencies.** `bun audit` reports a high-severity
  advisory affecting direct `drizzle-orm@0.44.7` plus vulnerable nested Wrangler stack
  packages. Upgrade Drizzle to a fixed release first, then coordinate Wrangler,
  `@cloudflare/vitest-pool-workers`, and Vitest peer-compatible upgrades; rerun all tests,
  typecheck, migrations, and local Worker curls.
- **L-14 — Restore exact log-create contract parity.** The contract specifies
  `{ entry, dayLog }`, but both log-create handlers also emit top-level `goal`. Either
  remove the extra field or make a human-approved dedicated contract change.

## Additional Frontend gaps — track:frontend

- **L-15 — Adaptive dark-mode palette and contrast coverage.** Fixed RGB/white semantic
  colors leave navigation/status text and placeholder copy illegible in dark mode.
  Replace them with adaptive colors and add light/dark contrast or snapshot coverage.
- **L-16 — Accessibility Dynamic Type reflow.** At Accessibility XXXL, Cookbook and all
  three placeholder tabs clip/overflow, while Today truncates its header/trust badge.
  Reflow fixed horizontal layouts and capsules, then add meaningful largest-size render
  assertions rather than bitmap-dimension checks.
- **L-17 — Remove implementation jargon and raw IDs from visible copy.** Today, logging,
  picker, editor, and placeholder screens expose `mock`, `scaffold`, `backend`, and raw
  recipe-version identifiers; Discover/Profile also expose the banned word `adherence`.
  Replace with product copy and audit rendered surfaces so the copy test cannot omit
  view-only strings.
- **L-18 — Add real UI journey coverage.** Keep the strong model/unit tests, but replace
  padded construction/nonzero-image/manual-state-mutation tests with XCUITest or a
  render-aware harness covering tab navigation, log, fork, edit, sheets, dark mode,
  largest Dynamic Type, and core accessibility labels.

## Additional Housekeeping (no track)

- **L-19 — Reconcile stale planning documents.** `SAVORO-MVP-ARCHITECTURE.md` still
  recommends Postgres/Drizzle, lists already-settled decisions as open, and conflicts
  with the accepted Hono/D1 ADR. Mark superseded sections, keep the product thesis/build
  sequence, and replace the research report's unresolved citation markup with durable
  source links or an explicit archival label.

## Verification scaffolding + first vertical slice (added 2026-07-17 evening)

Direction change: before more feature work, build the verification scaffolding so
agents can SEE what they ship (agents have no eyes — rendered screenshots and
snapshot diffs are the next best thing), then take ONE page fully functioning
end-to-end: UX → functionality → UAT → feedback. Chosen page: **Today** — its
backend already exists (`GET /v1/logs/day`, `GET /v1/goals/current`,
`POST /v1/logs/recipes|foods`), so it does not gate on SAV-129.

L-18 is superseded: its tier-1 scope is L-20/L-21 below; its full-stack tier
returns as part of L-23.

- **L-20 — XCUITest scaffolding + first journey.** track:frontend. Add a real
  UI-testing bundle target wired into the Savoro scheme. First smoke journey:
  launch → visit all 5 tabs → log a recipe from Today → fork from detail → edit
  the fork (mock data). Every step saves an XCTAttachment screenshot AND writes
  PNGs to a stable directory (e.g. `SavoroIOS/.ui-artifacts/`, gitignored) so a
  reviewing agent can Read the images. Acceptance: `xcodebuild test` runs unit +
  UI targets; screenshots exist for every step; journey fails if a tab crashes
  or the log flow breaks.
- **L-21 — Snapshot rendering harness ("agent eyes").** track:frontend. Add
  swift-snapshot-testing (Point-Free) via SPM. Per-screen snapshot matrix:
  {light, dark} × {standard, Accessibility XXXL} for Today, Cookbook, Recipe
  Detail, Editor, Logging sheets, and the three stub tabs. Reference images
  committed; failures produce diff images an agent can read. Include a small
  runner (script or test flag) that re-renders all current screens to PNG on
  demand for review. Note: dark/XXXL references will capture today's BROKEN
  rendering first — that is the point; L-15/L-16 then fix and re-record them.
- **L-15a/L-16a ordering note.** L-15 (dark mode) and L-16 (XXXL reflow) now land
  AFTER L-21 and must update its snapshot references as their proof. Scope their
  first pass to the Today screen end-state plus app chrome (tab bar, nav), full
  sweep after.
- **L-23 — Vertical slice: Today live against the real API.** track:integration
  (gated on L-20 + L-21 landed; does NOT wait for SAV-129). Wire the Today tab
  to the real backend via `AppEnvironment.live` + `/v1` paths: dev-token auth
  against `wrangler dev` (seeded local D1), fetch day log + current goal, create
  recipe/food logs, loading/error/empty states. Mock client remains the default
  for other tabs; environment selection is explicit (scheme env var or debug
  setting). Acceptance: the L-20 journey re-runs green against the live local
  Worker, plus screenshots.
- **L-24 — Today UAT pass + feedback intake.** no track / human-in-loop. Produce
  a UAT bundle for Dylan: checklist of Today behaviors (log, view totals, goal
  ring, dark, XXXL), the screenshot set from L-20/L-21/L-23, and known
  limitations. Dylan's feedback becomes new `L-<n>` tickets before the next
  vertical slice (likely Recipe Detail → publish, which pairs with SAV-129 +
  SAV-72).

## MVP completion tickets (added 2026-07-17 late — full app map)

New tickets discovered by mapping every MVP page against what exists. Slices
follow the Today template (L-20..L-24): UX fix → wire live → UAT → feedback.

- **L-25 — Sign-in / onboarding screen (mock-first).** track:frontend. The app has
  NO auth UI at all; backend Apple auth (SAV-125) exists. Build the sign-in/
  onboarding surface with Sign in with Apple button, privacy-first copy, and a
  dev-mode entry path. Mock seam first, like all other screens.
- **L-26 — Live auth slice.** track:integration (gated: L-25, L-23). Wire session
  exchange: dev-token flow against local Worker first; real Sign in with Apple
  requires Dylan's Apple Developer entitlements — human gate, park until provided.
- **L-27 — Communities backend.** track:backend. Contract Phase 2+ communities
  endpoints (create/join/leave, feeds, community recipe sharing). Large; split
  into create/membership vs feed slices at dispatch time. Respect privacy
  invariants — community surfaces never leak private logs/goals.
- **L-28 — Follow/friends + activity backend.** track:backend. Contract endpoints
  for follow/unfollow, friends, `GET /v1/activity`. Pairs with SAV-133 profiles.
- **L-29 — Recipe images (R2 upload).** track:backend + integration. Contract
  `POST /v1/images/upload-url`. DEFERRED post-core-MVP unless Dylan pulls it
  forward; needs R2 bucket provisioning (human gate, like L-4).
- **L-30 — Vertical slice: Cookbook live.** track:integration (gated: SAV-131,
  L-23). Mine/Saved/Drafts from real endpoints, save/unsave round-trip, fork
  drafts persist server-side.
- **L-31 — Vertical slice: Recipe Detail + Editor + publish live.** track:integration
  (gated: SAV-129, SAV-72, L-30). Create → edit → publish → visible to another
  seeded user → fork — the whole recipe lifecycle against the local Worker.
- **L-32 — Vertical slice: Discover live.** track:integration (gated: L-3, L-5,
  L-31 — Discover needs published recipes to exist).
- **L-33 — Vertical slice: Profiles live.** track:integration (gated: SAV-133,
  L-6; L-28 for follow).
- **L-34 — Vertical slice: Communities live.** track:integration (gated: L-27,
  L-7). Last slice; largest unknown.

## Research / planning tickets (added 2026-07-17 late — the "not yet planned" list)

Verified gap: the design prototype (savoro-mvp/project/app) contains ONLY
today/cookbook/discover/profile/recipe screens. No onboarding, no sign-in, no
goal setup (just a settings row stub), no community screens. These tickets close
the planning holes before their build phases start. R-tickets produce documents
and decisions, not code; agent-runnable ones are good loop-downtime work.

- **R-1 — Food database strategy.** Agent-researchable. Decide the food-search
  data source for L-3: USDA/OFF subset sizing for D1, licensing, normalization,
  search quality. Old-branch seeds (`scripts/seed-usda.ts`, `seed-off.ts`) are
  reference-only. Output: recommendation doc + revised L-3 acceptance criteria.
- **R-2 — Discover cold-start strategy.** Product decision (Dylan) + agent prep.
  With zero users, what fills Discover? Editorial/seeded recipes, quantity,
  authorship presentation. Blocks L-32 from being meaningful. Related:
  docs/ideas/video-discover-carousel.md stays parked.
- **R-3 — Communities MVP scope decision.** Dylan decision, agent-prepped brief.
  The prototype has NO community designs and the backend has nothing — this is
  the largest unplanned surface. Real options: (a) design + build full slice,
  (b) cut Communities from MVP and ship 4 tabs, (c) thin v1 (join + shared
  recipes only, no feeds). Decision gates L-7/L-27/L-34.
- **R-4 — Onboarding + goals UX design.** Design work + Dylan approval. Missing
  from the prototype entirely: first-run flow, Sign in with Apple, initial goal
  setup (calorie/macro targets), and any goal-EDITING surface (goals backend
  exists; no UI anywhere lets a user set or change a goal). Output: designed
  flow (mockup or spec) that L-25 builds against, plus a new goals-UI ticket.
- **R-5 — Release readiness checklist.** Agent-researchable. TestFlight path:
  bundle ID, signing, privacy manifest/nutrition-label declarations for a
  nutrition app, encryption compliance, App Review considerations. Output:
  checklist doc with human-gate items flagged.

## Decisions + quality/release tickets (2026-07-17 night, Dylan's calls)

Decisions:
- **R-1 RESOLVED — USDA on our DB.** Dylan holds a USDA data permit. Strategy:
  import USDA (SR Legacy ~8k foods to start) into D1 as a long-lived on-prem
  cache so food search rarely needs external calls. The old branch already
  implements this for the dead stack (`scripts/seed-usda.ts`, `routes/food.ts`,
  tests) — port, don't research. See L-37.
- **R-3 RESOLVED — Communities skipped for now.** L-7/L-27/L-34 move to a
  DEFERRED state; the Community tab ships as a "coming soon" surface (see L-36).
- **R-2 and R-4 deferred by choice** (cold-start content and onboarding flow
  planned later; onboarding is still wanted, just not designed yet).

New tickets:
- **L-35 — UI consistency guardrails ("taste, mechanized").** track:frontend.
  Convert visual quality into checks: (a) audit/harden design-system primitives —
  one Pill, one Button, one Card with fixed heights, `lineLimit(1)` +
  `minimumScaleFactor` where wrap is forbidden, spacing only via tokens;
  (b) add layout regression tests (render rows → assert equal heights; render
  pills at long-string/XXXL extremes → assert single-line); (c) a lint/grep
  gate: no raw `.padding(<n>)`, no `Color(red:...)`, no ad-hoc font sizes
  outside the design system. Every later frontend ticket must build from
  primitives — height drift becomes impossible rather than reviewable.
- **L-36 — TestFlight readiness (must land tonight).** track:frontend.
  (a) Real app icon set incl. 1024pt marketing icon (provisional flat design is
  fine — upload FAILS without it); (b) Info.plist hygiene: version/build,
  `ITSAppUsesNonExemptEncryption=NO`; (c) Release configuration is fully
  self-contained MOCK mode (TestFlight can't reach a localhost Worker; live
  mode stays a debug-only toggle until the Worker is deployed via L-4);
  (d) Community tab renders honest "coming soon" copy; (e) verify
  `xcodebuild archive` succeeds for Release; (f) write
  `docs/testflight-checklist.md` — Dylan's exact morning steps.
- **L-37 — Port USDA foods to D1 (supersedes research half of L-3).**
  track:backend. Foods + servings tables per contract, port the SR Legacy
  importer to a D1-compatible seed path (local file → wrangler execute or
  batched API), then implement `GET /v1/foods/search` + `GET /v1/foods/:id`
  cache-first against on-prem data (external fallback later, only if needed).
  Old-branch code is the reference implementation.
