# Epic: Account & Onboarding — full stack to Checkpoint A

**SUPERSEDED (2026-08-02):** This prose epic is replaced by the ticket program at
`docs/tickets/01-onboarding/` — `_DESIGN.md` (locked direction), `_QUEUE.md` (50-ticket dependency
queue), `_RUNBOOK.md` (operating contract), `_LEDGER.md` (execution log), and one self-contained
packet per ticket. OB-n → P-ticket mappings are recorded in each packet's `Supersedes:` header.
This file remains as the decision record that seeded the program.

The focus epic after recipe-creation parking (2026-08-02, Dylan's call). Goal:
a real person installs from TestFlight, creates an account (Apple or
email/password), picks a username, completes a privacy-first setup, and lands
in a live Today they can log calories into — with Skip as a first-class path,
not a broken one. The epic ends at **Checkpoint A**: an uploaded, usable
TestFlight build.

Decisions baked in (recorded in the roadmap plan, 2026-08-02):
- **Checkpoint A ships first**; USDA/recipes continue after.
- **Username is collected during signup on its own page**, immediately after
  account creation, for BOTH auth methods (Apple gives no username either).
  The old "ask at first publish" gate is gone.
- **Targets are calories-first**: user enters calories, app proposes an
  editable protein/carb/fat split (`POST /v1/goals` unchanged). Skip is
  designed, not tolerated: nil-goal propagation, a goal-less Today, and a
  Profile goal editor.
- **Email/password at MVP has NO reset/verification** (deferred past the core
  gate) — lockout recovery is manual re-issue via seed tooling until then.

Ground truth: no auth UI, no onboarding, no goal UI exists anywhere in iOS
(`RootPlaceholderView` boots straight into 5 tabs). Backend has Apple auth
(`POST /v1/auth/apple`), goals (POST/GET, all four macros required > 0),
profiles (`GET /v1/me`, `PATCH /v1/me/profile`), and a raw-ID fallback in
three DTO mappers that must die. Release builds are hard-wired to mock.

IDs are `OB-n`. One track label each. Supersedes **L-25, L-26, R-4** (folded
in) and the D1/deploy half of **L-4** (OB-7/OB-8). This file is the focus
queue; `docs/backlog-local.md` points here.

## Batch C — Contracts (human gate: Dylan approves each diff as a dedicated commit)

- **OB-1 — [Contract] First-run current-user shape.** track:backend (draft
  only). Exact `docs/api-contract.md` diff: `GET /v1/me` gains an explicit
  `onboardingState`; identity fields nullable ONLY mid-onboarding; username
  required at onboarding completion; **no raw-id fallback anywhere** (kills
  `?? user.id` in `dto/profiles.ts`, `dto/recipes.ts`, `dto/social.ts`).
  Output: reviewable diff, no code.
- **OB-2 — [Contract] Email/password auth.** track:backend (draft only).
  `POST /v1/auth/signup`, `POST /v1/auth/login`, `POST /v1/auth/logout`
  (session revocation): request/response envelopes identical in shape to the
  Apple exchange; error taxonomy (409 duplicate email, 401 bad credentials,
  422 weak password); PBKDF2 params noted. Reset/verification explicitly
  listed as post-core-gate.
- **OB-3 — [Contract] Catalog food logging + extensible nutrient map.**
  track:backend (draft only). Drafted NOW so all three approvals batch, even
  though implementation is Checkpoint B work: catalog variant
  `{ foodId, servingId, quantity, date, mealType }`, server-frozen nutrition
  stored as a keyed nutrient map (four macros required) so micronutrients
  never force a frozen-log migration.

## Batch D — Design first (gates all onboarding UI; Dylan verdict on OB-4)

- **OB-4 — Onboarding flow design spec + wireframes.** Resolves R-4. Screens:
  welcome/auth (Apple button + email entry), credentials, username page
  (availability, suggestions, rules copy), profile basics (display name +
  private-by-default explainer), intent question ("Track what I eat" /
  "Build my recipe collection" / "Both"), calories-first targets with Skip.
  Every screen speced in normal/error/loading. **Dylan approves or redlines
  before any Batch F2 ticket builds.**
- **OB-5 — Goal-less Today design.** The designed "just logging" state: bare
  totals, no ring denominator, no progress copy, one calm add-targets
  affordance. This is the real first-run state — it gets design attention
  equal to the goal state.
- **OB-6 — Profile/account screen design.** Targets view/edit, account info,
  sign out. Minimal but real — replaces the 20-line stub's promises.

## Batch I — Preview infrastructure

- **OB-7 — Wrangler auth + preview D1 provisioning.** track:backend, human
  gate: Dylan signs Wrangler into the intended Cloudflare account. Create the
  isolated preview D1 (replaces the zero-UUID placeholder), run remote
  migrations. Supersedes the deploy half of L-4.
- **OB-8 — Preview Worker deploy + smoke.** track:backend. Deploy over HTTPS
  with `APPLE_BUNDLE_ID=com.savoro.Savoro`; verify `/health`, auth rejection,
  and migration state. Never apply `seed/local-dev.sql` remotely (known
  dev token).
- **OB-9 — Safe preview seed tooling.** track:backend. A remote-safe seed
  path: no fixed tokens, generates throwaway credentials, prints them once.
  Also the manual account-recovery path while reset doesn't exist.
- **OB-10 — Environment split + runbook.** track:backend. `wrangler.jsonc`
  env sections (local/preview), `docs/deploy-runbook.md` with the exact
  commands, and what must never be committed.

## Batch B1 — Backend auth (gated on OB-2 approval)

- **OB-11 — Credentials schema migration.** track:backend. `users` gains
  email (unique, case-normalized) + password hash/salt/params columns (exact
  shape per approved contract); migration + rollback notes.
- **OB-12 — PBKDF2 hashing module.** track:backend. WebCrypto PBKDF2,
  versioned params, constant-time verify; unit tests prove hash-at-rest
  (never plaintext) and reject-on-mismatch.
- **OB-13 — `POST /v1/auth/signup`.** track:backend. Email validation,
  409 duplicate, user + opaque session creation; response envelope matches
  the Apple exchange.
- **OB-14 — `POST /v1/auth/login`.** track:backend. 401 on wrong password
  (indistinguishable from unknown email), session issuance, tests for both
  failure modes.
- **OB-15 — `POST /v1/auth/logout` + session revocation.** track:backend.
  Revoked sessions 401 immediately; `revokedAt` finally enforced and tested.
- **OB-16 — Session expiry enforcement + tests.** track:backend.
  `expiresAt` honored in the bearer middleware (`findUserIdByToken` is the
  single chokepoint); expired-session regression tests — columns exist today
  with zero coverage.
- **OB-17 — Apple verifier proof via local JWKS fixture.** track:backend.
  Exercise the REAL `src/lib/apple.ts` (currently 0% — tests inject a fake
  verifier): locally signed JWT + served JWKS fixture; forged signature,
  wrong `aud`/`iss`, and expired token are all rejected.

## Batch B2 — Backend first-run profile (gated on OB-1 approval)

- **OB-18 — Implement `onboardingState` + kill the raw-ID fallback.**
  track:backend. `GET /v1/me` per approved contract; remove `?? user.id`
  from all three mappers; regression tests: identity nullable only
  mid-onboarding, raw ids never appear in any DTO string field.
- **OB-19 — Username availability check.** track:backend. Fast availability
  endpoint (or documented 422-probe flow — decide in OB-1) powering the
  username page; reuses the existing rules regex + denylist; tests for
  taken/invalid/denied.
- **OB-20 — Onboarding completion semantics.** track:backend.
  `PATCH /v1/me/profile` transitions `onboardingState`; server is the
  authority for resume-after-reinstall routing; tests for partial states
  (account created / username set / profile done).
- **OB-21 — Dev/test account tooling.** track:backend. Local + preview
  scripts to mint accounts in any onboarding state so iOS work and UI tests
  never hand-roll SQL.

## Batch F1 — iOS auth core

- **OB-22 — SessionStore + Keychain token store.** track:frontend. Store,
  restore-on-launch, clear-on-signout; unit tests with a fake Keychain.
- **OB-23 — Apple authorization adapter.** track:frontend.
  `ASAuthorizationController` behind a protocol with a DEBUG mock so
  simulators and tests run the full flow without entitlements.
- **OB-24 — Typed auth requests.** track:frontend. signup/login/logout/apple
  exchange + `GET /v1/me`; decodes the approved envelopes, including
  nullable mid-onboarding identity — no more non-optional `username`
  landmine in `UserProfile`.
- **OB-25 — APIClient hardening + URLProtocol tests.** track:frontend.
  Central 401 → signed-out handling; URLProtocol-stubbed tests for status
  branching, error envelopes, and decoding (first coverage of
  `URLSessionAPIClient.send` — today it has none).
- **OB-26 — Root state machine.** track:frontend. `SavoroApp` owns
  signedOut → onboarding(step) → authenticated; explicit, testable
  transitions; no tab bar until authenticated.
- **OB-27 — Release-safe live configuration.** track:frontend. Base URL
  persists through Release config without bundled credentials; retire the
  Debug-only env-var seam; the guard test flips from "Release must be mock"
  to "Release must never carry dev tokens".

## Batch F2 — Onboarding UI (gated on OB-4 verdict)

- **OB-28 — Welcome/auth screen.** track:frontend. Apple button + email
  path, privacy-first copy, loading/error states.
- **OB-29 — Email credential forms.** track:frontend. Signup + login,
  inline validation, calm error states (banned-copy rules apply — no
  "failed", no shouting).
- **OB-30 — Username page.** track:frontend. Dedicated page after account
  creation, BOTH auth methods; live availability, suggestions, rules copy.
- **OB-31 — Profile basics page.** track:frontend. Optional display name +
  private-by-default visibility explainer; submits via `PATCH /v1/me/profile`.
- **OB-32 — Intent page.** track:frontend. Three options; chooses landing
  tab and whether the targets step appears; client-side only, nothing
  persisted.
- **OB-33 — Targets page.** track:frontend. Calories-first entry, derived
  editable P/C/F split, prominent guilt-free Skip; submits all four via
  `POST /v1/goals` (contract untouched).
- **OB-34 — Onboarding resume.** track:integration. Interrupted onboarding
  resumes at the correct step after relaunch AND reinstall, driven by server
  `onboardingState`; completed onboarding never reappears.
- **OB-35 — Expired/revoked session UX.** track:frontend. Mid-session 401 →
  calm return to sign-in; no data loss, no crash, re-auth lands back in
  context.

## Batch F3 — Goal-less mode + Profile

- **OB-36 — Propagate nil goals.** track:frontend. Kill the
  `goal.goal?.dailyTargets ?? .zero` collapse; nil flows to the ring and
  macro rows so the existing nil-goal render branch actually runs; delete
  the "520 / 0 cal" failure mode; also fix the non-optional
  `SavoroCalorieRing.goal` and the hard-decode `Goal.dailyTargets` landmine.
- **OB-37 — Goal-less Today implementation.** track:frontend. Build OB-5's
  design: bare totals, add-targets affordance, honest copy; a goal-less
  user is never told anything about progress.
- **OB-38 — Profile account screen.** track:frontend. Build OB-6: view/edit
  targets (POST creates the superseding goal — the API has no PATCH by
  design), sign out, account info.
- **OB-39 — Onboarding copy pass.** track:frontend. Every new string in one
  voice (calm, non-judgmental, zero jargon); banned-copy lint extended to
  all new surfaces.

## Batch V — Validation hardening (lands inside the batches above; listed for traceability)

- **OB-40 — Onboarding snapshot matrix.** track:frontend. Every onboarding
  screen in {light, dark} × {standard, XXXL}, including error and loading
  states.
- **OB-41 — Goal-less Today snapshots.** track:frontend. The real first-run
  state joins the matrix — it currently has zero snapshot evidence.
- **OB-42 — Onboarding XCUITest journeys.** track:frontend. Email signup →
  username → skip targets → goal-less Today; login; mock-Apple path;
  screenshots per step.
- **OB-43 — Live journey un-gated at checkpoints.** track:integration. The
  local-Worker journey (today skipped by default) becomes REQUIRED at every
  checkpoint gate; a deployed-preview run is required before any upload.
- **OB-44 — STATUS.md ledger reconciliation.** no track. One-time fix:
  backend is 124 tests (not 131), iOS is 242 (not 224), stretch queue
  double-lists four tickets; add the rule that counts are re-derived from
  runner output, never read from the ledger.
- **OB-45 — Pre-land script.** no track. One script: API suite + typecheck,
  iOS suite, banned-copy grep, emits test counts. The orchestrator runs it
  before every land — the mechanical gates stop being prose.

## Batch A — Checkpoint A (milestone 4 + the gate)

- **OB-46 — Manual food logging form (live).** track:integration. Real form:
  name, macros, meal/date selection, submit to `POST /v1/logs/foods`;
  edit/delete via logs-management endpoints.
- **OB-47 — Today deployed-only.** track:integration. Remove static
  `liveTodaySections` and fixture-owned orchestration from runtime; Release
  reads only the deployed API; fixtures stay for previews/tests.
- **OB-48 — Calm degraded states.** track:frontend. Offline, expired-session,
  and empty states for Today + logging per the roadmap's state matrix.
- **OB-49 — Physical-device Apple check + Checkpoint A upload.** human gate.
  Dylan confirms Apple Developer capability, signs in on-device; archive,
  increment build, upload Checkpoint A.
- **OB-50 — Dylan UAT of Checkpoint A.** human gate. Install fresh, create
  both account types, complete AND skip setup, log food, relaunch, verify
  persistence. Feedback becomes OB-51+ before Checkpoint B work starts.

## Execution notes for the loop

- **Hard gates:** OB-1/OB-2 approval before Batches B1/B2; OB-4 verdict
  before Batch F2; OB-7 (Wrangler human gate) before OB-8..OB-10 and OB-43's
  deployed runs; OB-49/OB-50 are human gates that end the epic.
- **Parallel-safe from day one:** Batch C drafting, Batch D design, OB-22..
  OB-27 (iOS core against local Worker + mocks), OB-15..OB-17 (backend test
  debt), OB-44/OB-45 (loop mechanics).
- **Order within the rest:** I → B1 → B2 → F1 → F2 → F3 → A, with V items
  landing inside whichever ticket touches their surface — a ticket without
  its snapshot/journey evidence is rework, not a land (existing loop rule).
- Every frontend ticket builds from L-35 primitives and is held to OB-4's
  approved design the way RE tickets were held to RE-D3.
- Assumption flagged for Dylan: the username page applies to the **Apple
  path too** (Apple provides no username). Say the word if Apple users
  should get a generated username instead.
