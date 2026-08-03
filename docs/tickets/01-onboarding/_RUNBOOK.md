# 01-onboarding — operating and supervision contract

## Program boundary

This program owns account creation, onboarding, goal-less mode, and Checkpoint A. It does not touch
USDA import, catalog logging implementation, the recipe editor, Cookbook, or social surfaces —
those belong to later programs. `docs/api-contract.md` is edited only through the P0.8 supervised
gate. The outer loop machinery (`docs/loop-protocol.md`, `docs/agent-workflow.md`, `.pi/agents/`)
still governs dispatch, worktrees, and landing; this runbook narrows it for one queue.

Read in order:

1. `_DESIGN.md`
2. `_RUNBOOK.md`
3. `_QUEUE.md`
4. `_LEDGER.md`
5. the selected packet

Exactly one ticket is implemented per iteration and per landed commit.

## Preconditions before any loop start

- Root repo is parked on `main`, clean and synced with `origin/main`. The unexplained `.claude/`
  deletions and `.claude/settings.json` reset observed on 2026-08-02 must be resolved by Dylan
  before the first dispatch; a dirty root is a hard stop, not permission to absorb changes.
- Workers run in per-ticket worktrees (`docs/agent-workflow.md`); the orchestrator is the only
  thing that touches `main`, serially, squash-merge, push immediately.
- Baseline suites are green from a clean checkout:
  `cd apps/api && bun run test && bun run typecheck` (124 tests at authoring time) and
  `cd SavoroIOS && xcodebuild test -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 17'`
  (242 unit/snapshot at authoring time). Counts are re-derived from runner output; after P0.2 lands,
  `docs/STATUS.md` numbers may be trusted again but never replace the runner.
- No other Savoro agent or loop is editing tracked files in this checkout.
- `docs/tickets/01-onboarding/STOP` is absent.

## Locked implementation rules

- Both auth methods issue the same opaque session; no per-method downstream branching.
- No password reset/verification surfaces at MVP; lockout recovery is P1.4 tooling only.
- Username page is part of signup for BOTH auth methods; identity fields nullable only
  mid-onboarding; no raw id in any visible string (existing L-17 regression tests must stay green).
- Goals contract unchanged: calories-first UX derives an editable P/C/F split client-side and
  submits all four values; nil goals propagate as nil, never as `.zero`.
- Intent is client-side routing only — no persistence, no new endpoint.
- `seed/local-dev.sql` never runs remotely. Preview credentials are generated, printed once, and
  never committed.
- Release configuration carries the preview base URL but never a token; sessions come only from
  Keychain after real sign-in.
- ADR invariants hold: frozen snapshots, `recipeVersionId` pinning, session-derived `userId`, DTO
  privacy projection, fork provenance.
- Banned copy is a landing blocker: adherence, compliance, failure, failed, over limit, guilt,
  cheat, bad food, raw IDs, `mock`, `scaffold`, backend jargon.
- New UI composes L-35 design-system primitives; snapshot evidence covers every named state in
  {light,dark} × {standard,XXXL}.
- Snapshot references are re-recorded only by the ticket that owns them;
  `SavoroIOS/Scripts/record-snapshots.sh` pins the expected count — grow it deliberately, never
  silently.
- **Git identity: never add Co-Authored-By or any AI-attribution trailer; never author or amend a
  commit under any identity other than Dylan's; never modify global git config.**

## Ticket selection

The orchestrator selects the first `_QUEUE.md` row whose dependencies are all `done` and whose
ledger state is `pending`, then dispatches exactly that packet to one worker.

- `done` requires both the ledger state and a matching commit on `main`.
- `blocked` is never retried automatically; it requires an orchestrator or Dylan decision.
- If the first eligible row is `supervised`, the loop stops and reports; it does not skip ahead.
- Workers cannot select tickets or edit queue, ledger, packets, or loop machinery.

## Per-ticket workflow

1. The orchestrator dispatches one eligible autonomous ticket to a worker in a fresh worktree.
2. The worker implements ONLY the packet's fenced files, adds/updates the tests the packet names,
   runs the focused checks, and reports: changed files, commands + exit codes, acceptance-criteria
   status, QA evidence paths, risks. Workers never stage, commit, push, or edit the ledger.
3. The orchestrator independently re-runs the track's suites in the worktree, reads the diff, reads
   the snapshot/journey evidence (agents have no eyes — rendered images are the eyes), runs the
   banned-copy grep, and checks scope: every changed line traces to the packet.
4. Rework budget: at most 2 rounds, then the ticket goes `blocked` with evidence preserved.
5. On acceptance the orchestrator squash-merges to `main` with a `P<phase>.<n>:` prefixed message,
   pushes, and updates exactly one `_LEDGER.md` row: state, commit hash, UTC timestamp, and a note
   recording commands run, derived test counts, evidence paths, and the negative witness where the
   packet requires one.
6. Any malformed result, out-of-fence edit, failed re-run, or exhausted rework budget stops the
   loop with work preserved for inspection.

## Verification rules

Required commands per track, unless the packet is deliberately narrower:

```bash
# backend
cd apps/api && bun run test && bun run typecheck
# frontend / integration
cd SavoroIOS && xcodebuild test -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 17'
# endpoint tickets additionally
cd apps/api && bun run dev   # then curl the new route(s); record request + response
```

After P0.3 lands, `scripts/preland.sh` wraps both suites plus the banned-copy grep and emits derived
test counts; the orchestrator runs it before every land.

### Never weaken a gate

- no deleting or skipping suites, snapshot modes, or journey steps to pass;
- no lowering pinned counts or floors; the snapshot record script's expected count grows only in
  the owning ticket;
- no growing the copy-lint allowlist;
- no replacing a live-path assertion (URLProtocol, local Worker, deployed preview) with a mock that
  cannot fail the production seam;
- no swallowing decode or auth errors to keep a stream green;
- negative witnesses named by a packet are mandatory: reintroduce the failure against the final
  code, record the exact red assertion, restore, rerun green, and cite it in the ledger note.

## Loop control

The harness is `scripts/onboarding-loop.sh`, driven through its lifecycle wrapper — use it, not
ad-hoc `nohup` commands:

```bash
./scripts/onboarding-loopctl.sh preflight   # dry-run the preconditions, start nothing
./scripts/onboarding-loopctl.sh arm         # removes this program's STOP file
./scripts/onboarding-loopctl.sh start
./scripts/onboarding-loopctl.sh status
./scripts/onboarding-loopctl.sh logs [--follow]
./scripts/onboarding-loopctl.sh stop        # STOP armed; loop exits between tickets
```

Roles: the supervising session (pi, `gpt-5.6-sol` at xhigh) runs loopctl, watches `status`,
handles stops, and owns pushes. Workers default to `gpt-5.6-luna` at max thinking
(`PI_WORKER_MODELS`/`PI_WORKER_THINKING`); each candidate gets one read-only review by the
opposite model at xhigh (`PI_REVIEW_THINKING`) with at most 2 repair passes. The harness itself
selects the ticket, validates the file fence (with `docs/api-contract.md` hard-denied regardless
of fence), runs the final track checks (`scripts/preland.sh` once P0.3 lands, per-track suites
until then, plus `scripts/check-onboarding-program.sh` once P0.1 lands), updates exactly one
ledger row, and commits locally as `P<x>.<n>: <slug>` — no attribution trailers, no push
(`PUSH_AFTER_COMMIT=1` to change that; default is the supervisor pushes).

Runtime artifacts live outside source control under `~/.pi/onboarding-runs/savoro/run-<stamp>/`
(status.json, events.log, per-ticket task dirs with worker/review sessions, diffs, and check
logs); the control PID and latest-run pointer live under `~/.pi/onboarding-loop-control/savoro/`.
The loop stops — never improvises — on: supervised row first-eligible, dirty tree, worker
commit, out-of-fence edit, malformed worker result, reviewer failure, rework budget exhausted,
final-check failure, STOP file, or queue drained.

## Supervised row procedure

At P0.8, P1.2, P7.3, P8.4, and P8.5:

1. Keep the loop stopped.
2. Present the packet's named deliverables to Dylan (contract diffs, design pack, provisioning
   commands, snapshot sets, build).
3. Record explicit approval, redlines (which become new tickets), or a block — in the ledger row.
4. Only after approval: land the supervised commit(s), update the ledger, restart the loop.

## Stop conditions

- queue drained;
- supervised ticket first-eligible;
- dependency chain blocked;
- worker failure, malformed result, or out-of-fence edit;
- rework budget exhausted (2 rounds);
- baseline suite failure on `main`;
- dirty root repo or unexpected external working-tree changes;
- explicit `STOP` file in this directory;
- Dylan says stop — which halts ALL background automation first, then everything else.
