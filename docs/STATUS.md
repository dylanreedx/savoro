# Savoro — Status Board

> One-page answer to "where are we?" Updated by the orchestrator after every
> loop iteration (see `docs/loop-protocol.md`). Last updated: **2026-07-17**
> (post-audit, pre-loop). Backlog detail lives in `docs/backlog-local.md`.

## Health at a glance

| Area | State | One-liner |
|---|---|---|
| Backend API (`apps/api`) | 🟢 solid core, 🟠 gaps | Phase 1 + recipe slice done, 66/66 tests. No publish lifecycle (SAV-129); 1 live-proven auth hole (L-1); goal-range bug (L-12). |
| iOS app (`SavoroIOS`) | 🟡 rich mock | Today/Log/Cookbook/Detail/Editor + fork flow complete on mocks, 204/204 tests. Discover/Community/Profile are stubs. |
| iOS UX quality | 🔴 fails basics | Dark mode illegible (L-15); Accessibility XXXL breaks major screens (L-16); jargon/IDs in visible copy (L-17). |
| Integration (app ↔ API) | 🔴 not started | Zero screens call the real API; live client exists but has no call sites (L-8). |
| Deploy/infra | 🔴 not wired | D1 `database_id` is a placeholder (L-4); deps have a high-severity advisory (L-13). |
| Tickets/planning | 🟡 local-only | Linear blocked; `docs/backlog-local.md` is the live backlog, git log is the Done board. |

**Bottom line:** the product core is well-built and tested, but nothing is
publishable, nothing talks to the real backend, and dark mode / large type are
unusable. Fix wave first, then progress wave, then first live integration slice.

## Strategy (revised 2026-07-17 evening)

**Scaffolding first, then one page at a time, fully.** Agents have no eyes, so
before more feature work we build the rendering/verification harness (XCUITest
journeys + snapshot matrix) that every future ticket must feed. Then we take the
**Today** page through the full ladder — UX → live functionality → UAT →
feedback — as the template for every page after it. Backend fix work runs in
parallel since it shares no files with the frontend track.

## Run queue (overnight loop)

Status values: `queued` → `in-progress` → `review` → `landed` / `blocked`.
Max one active ticket per track; lands are serialized on `main`.

| # | Ticket | Track | Status | Evidence (commit / run) |
|---|---|---|---|---|
| 1 | L-20 — XCUITest scaffolding + smoke journey w/ screenshot artifacts | frontend | **landed** | `c688e00`, 204 unit + 1 UI journey green; 15 step screenshots visually reviewed |
| 2 | SAV-129 + L-1 — publish lifecycle, close public-draft logging hole, real `publishedAt` | backend | **landed** | `705510f`, 74/74 tests |
| 3 | L-21 — snapshot harness: {light,dark}×{standard,XXXL} matrix ("agent eyes") | frontend | **landed** | `9e74efc`, 36 references across 9 screens; 213 unit/snapshot + 1 UI green |
| 4 | L-12 — goal date-range integrity (no `endDate < startDate`) | backend | **landed** | `f36349b`, 78/78 tests |
| 5 | L-15 — dark-mode fix (Today + app chrome first), proven via L-21 snapshots | frontend | **landed** | `b1d97e3`; 18 dark refs re-recorded, light refs byte-identical; dark Today visually verified legible + warm |
| 6 | L-14 — log-create response matches contract (`{entry, dayLog}` only) | backend | **landed** | `e86cd9b`, 78/78 tests |
| 7 | L-16 — XXXL/Dynamic Type reflow (Today + chrome first), proven via snapshots | frontend | **landed** | `9e42776`; 18 XXXL refs re-recorded, standard refs byte-identical; Cookbook XXXL visually verified stacked/unclipped |
| 8 | L-17 — remove jargon/raw IDs/banned words from visible copy | frontend | **landed** | `7b91e72`; badge now "Saved as logged · Private to your day", hardened copy test; 214 + 1 UI green |
| 9 | L-23 — vertical slice: Today live against local Worker (auth, day log, goals, log create) | integration | **landed** | `825a827`; live UI journey green (real D1 data: 0→520 cal, frozen `rcv_dev_bowl_v1`), Release stays mock, zero apps/api changes |
| 10 | L-24 — Today UAT bundle for Dylan (checklist + screenshots + limitations) | human-in-loop | queued — gated on #9 | |
| 11 | SAV-131 — cookbook save/unsave + mine/saved/drafts endpoints | backend | **landed** | `d6c910f`, 84/84 tests (1 rework round: contract drift on `mine` fixed) |
| 12 | **L-36 — TestFlight readiness (icon, plist, mock-mode Release, archive check, morning checklist) — MUST land tonight** | frontend | **landed** | `b851a2f`, 204/204 + Release archive OK; checklist at SavoroIOS/TestFlightChecklist.md |
| 13 | L-35 — UI consistency guardrails (primitives, layout regression tests, token lint) | frontend | **landed** | `a3f1803`; 224 + 1 UI green, 36 refs re-recorded (intended primitive consolidation), Today visually verified |

L-18 is superseded by #1/#3 (mock tier) and #9 (live tier).

**Stretch queue** (if the main queue drains before morning, keep going — feature
work continues; only UAT-gated items park):

| # | Ticket | Track | Status |
|---|---|---|---|
| S1 | L-3 — discover/search endpoints (gate met; foods half deferred to L-37) | backend | **landed** — `9d3fbe3`, 91/91 tests |
| S2b | SAV-133 — profiles/usernames (follow/friends stays L-28) | backend | **landed** — `7ea855f`, 98/98 tests |
| S3 | L-2 — logs management endpoints | backend | **landed** — `3f431dd`, 107/107 tests |
| S7b | L-28 — follow/friends + activity | backend | **landed** — `583b602`, 117/117 tests |
| S8b | L-37 — USDA foods: schema/endpoints/importer (code complete; real data import deferred to Dylan — no overnight downloads) | backend | **landed** — `804cd84`, 124/124 tests. **Backend track parked: stretch queue drained.** |
| S2 | SAV-133 — profiles/usernames endpoints | backend | queued |
| S3 | L-2 — logs management endpoints | backend | queued |
| S4 | SAV-72 — editor save/publish UX (mock-first) | frontend | queued |
| S5 | L-25 — sign-in/onboarding screen (mock-first) | frontend | queued |
| S6 | L-5 — Discover tab UI (mock-first, standard rails) | frontend | queued |
| S7 | L-28 — follow/friends + activity backend | backend | queued |
| S8 | L-37 — port USDA foods to D1 + foods search endpoints (replaces research half of L-3) | backend | queued |

Note: #10 (Today UAT) parks only the *integration* ladder until Dylan responds;
backend/frontend tracks keep working the stretch queue.

## Roadmap — every page, mapped (as of 2026-07-17)

Slices follow the Today template: UX → live wiring → UAT → feedback.

| Page / surface | UI now | Backend now | Path to done |
|---|---|---|---|
| Today + log sheets | 🟡 rich mock | 🟢 done | **Slice 1 tonight** (L-23→L-24) |
| Recipe Detail / Editor / publish | 🟡 rich mock | 🟠 publish missing | SAV-129 (tonight) + SAV-72 → **Slice 2** (L-31) |
| Cookbook | 🟡 rich mock | 🔴 SAV-131 | SAV-131 (tonight) → **Slice 3** (L-30) |
| Food search in picker | 🟡 mock | 🔴 L-3 | L-3 → joins Slice 1 follow-up |
| Discover | 🔴 stub | 🔴 L-3 | L-5 + L-3 → **Slice 4** (L-32) |
| Sign-in / onboarding | 🔴 doesn't exist | 🟢 Apple auth done | L-25 → L-26 (real Apple needs Dylan's dev account) |
| Profiles (own + public) | 🔴 stub | 🔴 SAV-133, L-28 | L-6 + SAV-133 → **Slice 5** (L-33) |
| Communities (home/detail/share) | 🔴 stub | 🔴 nothing (L-27) | L-7 + L-27 → **Slice 6** (L-34) |
| Recipe images | 🔴 none | 🔴 L-29 | deferred post-core-MVP |

Human gates that no amount of agent hours can pass: Apple Developer entitlements
(L-26), Cloudflare D1/R2 provisioning (L-4/L-29), UAT feedback between slices,
Linear unblocking, contract changes.

**Planning holes — status after Dylan's 2026-07-17 decisions:**
R-1 ✅ resolved (USDA on our D1, permit held; port old-branch importer → L-37).
R-3 ✅ resolved (Communities skipped for now; tab ships "coming soon" via L-36).
R-2 deferred (cold-start content — decide before Slice 4). R-4 deferred but
required (onboarding/goals UX — no design exists and no goal-editing UI exists;
decide before L-25). R-5 folded into L-36's morning checklist.

Fillers (dispatch only if a track is idle and nothing above is eligible):
L-19 (reconcile stale planning docs), L-11 (dedupe prototype bundles — exact duplicates).

**Deliberately NOT in the overnight queue** (need Dylan or daytime attention):
- L-13 dep upgrades — coordinated Wrangler/Vitest/pool-workers bump can wedge the test rig; do it supervised.
- L-4 remote D1 provisioning — needs Cloudflare account actions/credentials.
- L-9 / L-10 — branch/dir deletion needs human sign-off.
- L-2, L-3, SAV-72, SAV-133, L-5/6/7 — next wave (Recipe Detail/publish slice and beyond); re-queue explicitly after Today UAT feedback.
- Anything touching `docs/api-contract.md` — contract changes require human approval, always.

## Last run report

**FOCUS LOOP — PARKED FOR DYLAN'S DESIGN VERDICT (2026-07-18 ~09:10).**
Create Recipe epic, Batch D + Batch 0 complete:
- RE-D1/RE-D2 (`f6134d9`): design references extracted from the Claude Design
  prototype (docs/epics/recipe-editor-design/) + the binding reduction spec.
- RE-D3 (`f6909fa`): the editor redesigned to the reference — opening state
  is photo / title / folded description / servings row / conditional live
  macro strip / ingredients / sticky Save-Publish bar; every sentenced
  element deleted or folded; capabilities preserved. One rework round
  (design gate caught missing bottom-bar scrim + malformed steppers).
- RE-1 (`33e20cf`): Today card rhythm normalized — 12pt insets, 16pt gaps,
  geometry regression test. Rebased over RE-D3, reverified.

**WAITING ON DYLAN:** review the new editor —
`SavoroIOS/SavoroTests/__Snapshots__/SnapshotTests/testRecipeEditorSnapshots.*.png`
vs `docs/epics/recipe-editor-design/editor.png` (or run the app). Approve →
Batch 1 (RE-3..RE-9) dispatches. Veto → say what's off; RE-D3 has one
rework round left before it re-plans. Nothing dispatches until then.

**PREVIOUS — OVERNIGHT LOOP COMPLETE (2026-07-18 ~04:00). Queues drained; every dispatched
ticket landed. 17 tickets in one night, zero left blocked.**

The night's ledger (all squash commits on main, each independently verified
before landing):

| Ticket | Commit | What it did |
|---|---|---|
| SAV-129 + L-1 | `705510f` | Publish/unpublish/archive lifecycle, publishedAt, auth hole closed |
| L-12 | `f36349b` | Goal ranges can no longer corrupt |
| L-14 | `e86cd9b` | Log-create contract parity |
| brand | `6b2bcdd`/`9fdfbec` | Final chef's-kiss mark, both variants |
| L-36 | `b851a2f` | TestFlight ready: icon, plist, Release archive verified, checklist |
| SAV-131 | `d6c910f` | Cookbook save/lists (1 rework: contract drift caught) |
| L-3 | `9d3fbe3` | Discover rails + search, SQL-level privacy |
| SAV-133 | `7ea855f` | Profiles + usernames, denylist tested |
| L-20 | `c688e00` | XCUITest journey, 15 screenshot steps |
| L-2 | `3f431dd` | Logs management, frozen-snapshot scaling proven |
| L-28 | `583b602` | Follow/friends + activity projection |
| L-37 | `804cd84` | Foods schema/endpoints/importer (data run deferred) |
| L-21 | `9e74efc` | Snapshot harness: 36-reference matrix |
| L-15 | `b1d97e3` | Dark mode fixed (was illegible), proof-contracted |
| L-16 | `9e42776` | Accessibility XXXL reflowed (was broken) |
| L-17 | `7b91e72` | Copy sweep: no jargon/raw IDs/banned words |
| L-23 | `825a827` | **Today live against the real backend** — first-ever app↔API connection |
| L-35 | `a3f1803` | UI guardrails: primitives, layout tests, token lint |

Backend: 66 → **131 tests** (124 + 7 foods) across 16 files, typecheck clean.
iOS: 204 → **224 unit/snapshot tests + 2 UI journeys** (1 live-gated).
Every audit blocker (auth hole, goal corruption, dark mode, XXXL, jargon) is
fixed with regression coverage. Root repo clean, parked on pushed main
`a3f1803`. All worktrees removed, simulators shut down, no stray processes.

**Dylan's morning:**
1. **TestFlight** (~30 min): follow `SavoroIOS/TestFlightChecklist.md` —
   Xcode sign-in → ASC app record (`com.savoro.Savoro`) → Archive →
   Distribute → internal tester. The build is self-contained mock mode.
2. **Optional — USDA data**: download SR Legacy CSVs and run the importer
   per `apps/api/README.md` (L-37 shipped the code; the data run is yours).
3. **Decisions when ready**: L-24 Today-UAT feedback (the live slice is
   ready to demo via Debug env vars), L-19/L-11 housekeeping (deletions —
   wanted your sign-off), next slice = Recipe Detail→publish (SAV-72 pairing),
   and R-2/R-4 (cold-start content, onboarding design) before Slices 4-6.

**Iteration 15 (2026-07-18 ~03:30). THE MILESTONE: L-23 landed (`825a827`) —
Savoro's app talked to its real backend for the first time.** Live UI journey
against a seeded local Worker: real GET day/goals, real POST log, Today went
0→520 cal from actual D1 rows with the frozen version reference intact
(`rcv_dev_bowl_v1`), screenshot-evidenced (live-01..05 in .ui-artifacts).
Environment selection is Debug-only + env-var gated with an explicit
allowsLiveConfiguration guard — Release/TestFlight remains fully
self-contained mock. Zero apps/api changes were needed: the contract held
across the wire untouched. Mock suite 220 green + snapshots byte-identical.
L-35 (UI consistency guardrails) dispatched — the last queued ticket.

**Iteration 14 (2026-07-18 ~02:40).** L-17 landed (`7b91e72`): the copy sweep.
Verified with eyes and greps — the Today badge now reads "Saved as logged ·
Private to your day" (was "From frozen mock log data"), no raw version IDs
reach visible strings, no banned terms in any string literal ("scaffold"
survives only as internal variable names), and the copy test now scans all
view string literals instead of a curated list. 16 references re-recorded
across 4 screens. THE ENTIRE ORIGINAL FIX WAVE IS NOW LANDED. Dispatched
L-23 — Today live against the local Worker — the night's headline
integration ticket, gates satisfied. L-35 queued behind it (serialized to
avoid SavoroIOS conflicts).

**Iteration 13 (2026-07-18 ~01:45).** L-16 landed (`9e42776`): accessibility
reflow across all nine screens — segmented controls and filter rows stack
vertically at XXXL, capsules wrap, no clipping. Proof contract held: 18
*-accessibility-xxxl references re-recorded, standard references
byte-identical, 213 + 1 UI green independently; Cookbook XXXL visually
verified. Noted (pre-existing, not a regression): system nav-bar large titles
render faint in snapshot transition states — cosmetic, snapshot-only. L-17
(copy jargon sweep) dispatched with instructions to also harden the copy test
that previously missed rendered strings. Remaining after L-17: L-35, L-23
gate check.

**Iteration 12 (2026-07-18 ~00:50).** L-15 landed (`b1d97e3`): SavoroColor
semantic tokens are now dynamic (warm sand-900/950 dark ground, adapted brand
accents), hardcoded whites fixed. Proof contract held exactly — 18 dark
references re-recorded, ALL light references byte-identical, full suite green
independently. I visually verified the new dark Today: legible everywhere,
warm not black. Dark mode goes from unusable to genuinely good. L-16 (XXXL
reflow) dispatched with the same style of proof contract (re-record only
*-accessibility-xxxl refs; standard refs must stay byte-identical).

**Iteration 11.** L-37 landed (`804cd84`, backend 124/124): foods +
food_servings schema, GET /v1/foods/search and /v1/foods/:id with explicit
per-100g DTO semantics, ported no-download USDA importer
(apps/api/seed/import-usda.ts, usage in README) tested against a committed
fixture. **Backend track is parked — every backend ticket in the main and
stretch queues has landed.** Morning backend task for Dylan: download SR
Legacy CSVs and run the importer per README. Frontend continues: L-15
(dark mode) in flight, then L-16 → L-17 → L-35 → L-23 gate check.

**Iteration 10.** L-21 landed (`9e74efc`): the agent-eyes harness is real —
36 committed reference images (9 screens × light/dark × standard/XXXL, full
matrix, no trimming), diff artifacts on failure, 213 unit/snapshot + 1 UI
test green, independently verified. I visually confirmed the dark baseline
captures the exact L-15 bug (nav title and ring number invisible
white-on-cream). L-15 (adaptive dark palette) dispatched with a hard proof
contract: re-record dark references only; light references must stay
byte-identical. L-37 (USDA foods) still running on backend — the last
backend ticket of the night.

**Iteration 9 (2026-07-18 ~01:15).** L-28 landed (`583b602`, backend 117/117):
follow/unfollow, friend request lifecycle with canonical unordered friendship
storage, real `followState`, and an activity feed that is a read-time
projection of public+published recipes only (privacy denylist tested).
Dispatched L-37 (USDA foods) scoped code-complete-only: schema, endpoints,
ported importer, small committed fixture — the real SR Legacy import is
Dylan's daytime task (no overnight downloads). This is the LAST backend
stretch ticket; after it the backend track parks. L-21 (snapshot harness)
still running on frontend.

**Iteration 8 (2026-07-18 ~00:50).** Double land. **L-20** (`c688e00`): UI-test
target live, 15-step journey (tabs → log → fork → editor) green at 86s, 204
unit tests intact; I visually reviewed the step screenshots — journey verified,
and the photos document the pre-existing jargon ("From frozen mock log data",
raw version IDs) that L-17 will fix, now with evidence. **L-2** (`3f431dd`,
backend 107/107): recents + delete + patch with frozen-snapshot scaling derived
strictly from the entry's own stored values (raw-SQL mutation regression
proves no re-derivation). Dispatched: L-21 (snapshot harness) on frontend,
L-28 (follow/friends/activity) on backend. Remaining backend stretch after
L-28: only L-37 (USDA port — needs a data download; may defer to daytime).

**Iteration 7 (2026-07-18 ~00:20).** SAV-133 landed (`7ea855f`, backend 98/98):
GET /v1/me, PATCH /v1/me/profile (username rules documented, uniqueness 422),
public profiles with tested privacy denylist and indistinguishable 404s,
profile recipes public+published only, and recipe DTOs now carry real
usernames (pre-onboarding fallback documented). L-2 (logs management)
dispatched with the frozen-snapshot invariant called out as blocking for the
PATCH path. L-20 healthy: journey screenshots appearing in .ui-artifacts
(launch + all tabs so far), ~28 min elapsed — long but plausible for UI-test
target creation plus simulator runs.

**Iteration 6 (2026-07-17 ~23:55).** L-3 landed (`9d3fbe3`, backend 91/91):
discover rails (recent real, featured/trending = documented deterministic
placeholder — no fake engagement data) + search with SQL-level
public+published filtering verified in the diff; profiles/communities return
contract-shaped empty sets pending their domains. SAV-133 (profiles/usernames)
dispatched. L-20 (XCUITest) still building on the frontend track — long
simulator cycles, process alive.

**Iteration 5 (2026-07-17 ~23:30).** SAV-131 landed (`d6c910f`, backend now
84/84) after one rework round — the review gate caught contract drift (`mine`
excluded archived; contract says any status) and a focused fix resolved it.
Notable landed semantics: idempotent save/unsave (both 204), no existence
leaks, hidden saves persist but filter out of `saved`, `mine`/`drafts` by
creation time, `saved` by save time, real `isSaved` in recipe detail. L-3
(discover rails + search, foods deferred to L-37) dispatched on the backend
track. L-20 (XCUITest) still running on frontend.

**Iteration 4 (2026-07-17 ~23:05).** **L-36 LANDED (`b851a2f`) — morning
TestFlight path is fully unblocked.** Gate evidence: independent 204/204 test
run, unsigned Release archive verified (bundle com.savoro.Savoro, 0.1.0 (1),
encryption-exempt, AppIcon present), icon asset visually confirmed to be the
brand mark, coming-soon copy on the three stub tabs with banned-term regression
tests. Dylan's morning steps: SavoroIOS/TestFlightChecklist.md. L-20
redispatched fresh from post-L-36 main (stale partial pbxproj work discarded
deliberately — rebasing uncommitted pbxproj edits across L-36's project changes
risked corruption). SAV-131 (cookbook) still running on the backend track.

**Iteration 3 (2026-07-17 ~23:30, loop restarted).** Architecture per Dylan:
gpt-5.6-only task layer, single Fable orchestrator (see loop-protocol.md).
Landed: L-14 (`e86cd9b`, 78/78) and the final brand mark (`6b2bcdd` —
chef's-kiss glyph SVG + 1024 icon, visually verified). Dispatched: L-36
(TestFlight readiness, must-land) and SAV-131 (cookbook). L-20's partial work
(UI-test target wiring, a11y IDs) preserved in its worktree; resumes after
L-36 to avoid pbxproj collisions. Heartbeat re-armed.

**Iteration 2 (2026-07-17 ~22:05).** L-12 landed as `f36349b`: goal creation now
computes true inclusive overlap, rejects (422) ranges overlapping a later goal
instead of splicing, closes only earlier-starting open goals; regression asserts
no row can have `endDate < startDate`. Suite 74→78, verified independently before
and after merge. L-14 (log contract parity) dispatched. L-20 (XCUITest) still
running on the frontend track.

**Iteration 1 (2026-07-17 ~21:50).** SAV-129+L-1 landed as `705510f`: publish/
unpublish/archive endpoints per contract, real `publishedAt` (migration 0006 with
backfill), public-draft logging hole closed with regression test, plus a bonus
correctness catch — editing a draft whose version was previously published now
creates a new version, preserving log/fork immutability through unpublish→edit.
Backend suite 66→74 tests, all green, typecheck clean; independently re-verified
before and after the squash-merge. L-12 (goal ranges) dispatched to a fresh
worktree. L-20 (XCUITest scaffolding) still running on the frontend track.
Logo generation is with Dylan (OpenAI billing cap blocks gpt-image-1; four
self-contained prompts delivered).
