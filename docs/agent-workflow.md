# Agent Workflow

Rules for every agent working on Savoro. Read this, your Linear issue, and the docs
it references before touching code. When this doc and an issue conflict, comment on
the issue and stop.

## Ticket assignment — agents never pick their own work

- Your issue ID arrives in your launch prompt. **If you were launched without a
  specific SAV issue ID, stop and ask — do not browse the backlog and choose.**
- Every issue carries a track label: `track:frontend`, `track:backend`, or
  `track:integration`. You may only work an issue whose label matches your role.
  If your assigned issue's label doesn't match the track your prompt describes,
  comment on the issue and stop.
- Exception — explicit backlog-clearing runs only: if your prompt says to work a
  track's backlog (rather than naming an issue), you may only claim issues that are
  **Todo + unassigned + your track label**, and you claim by setting yourself as
  assignee and moving the issue to In Progress *before* touching code. Already
  assigned or In Progress means it's owned — skip it. One issue at a time, fully
  landed before claiming the next.

## Source of truth

- **Linear** (team Savorofit/SAV, project "Savoro MVP") decides *what* to build.
  Move your issue to In Progress when you start; Done only after verification passes.
  Comment your branch name, final commit hash, and verification evidence on the issue.
  Discovered follow-up work becomes a new SAV issue — never silent scope expansion.
- **`docs/api-contract.md`** decides *how frontend and backend talk*. It outranks any
  assumption, mock, or existing code. It changes only on `main`, in a dedicated
  `[Contract]` commit, with human approval — never on a track branch.
- **`docs/adr/0001-backend-architecture.md`** decides stack and invariants. The
  invariants (frozen snapshots, `recipe_version_id` on recipe logs, session-derived
  `userId`, privacy at the DTO layer) are blocking defects if violated.

## Tracks

| Track | Directory | May touch |
|---|---|---|
| Frontend | `SavoroIOS/` | only `SavoroIOS/` |
| Backend | `apps/api/` | only `apps/api/` |
| Integration | both | only via an `[Integration]` issue |

Never edit the other track's directory. Integration issues are the only place the
tracks meet, and they start only when the relevant frontend and backend issues are
both Done.

## Branching, worktrees, and history

**The repo root (`/Users/dylan/Documents/personal/savoro`) stays parked on `main`,
clean, always.** No agent edits files or switches branches there — it is only the
integration point where squash-merges land. Launch prompts must never say "work on
the current branch": branch names drift and get retired (this has already stranded
runs twice). Every run creates its own branch and worktree:

```bash
ROOT=/Users/dylan/Documents/personal/savoro
git -C "$ROOT" worktree add "$ROOT/../savoro-wt/sav-<id>" -b feat/sav-<id>-<slug> main
cd "$ROOT/../savoro-wt/sav-<id>"   # all work happens here
```

- One branch per Linear issue, off **latest `main`**, named `feat/sav-<id>-<slug>`
  (e.g. `feat/sav-122-date-validation`).
- Worktrees don't share dependencies or build caches: run `bun install` in
  `apps/api`, and expect Xcode to rebuild DerivedData. That's the price of isolation.
- Commit per green slice on your branch. When acceptance criteria pass, land it
  using the protocol below.
- Do not open PRs, deploy, or create external services unless the issue says so.
  Feature branches are never pushed; `main` is pushed as part of landing (below).

## Landing protocol — building is parallel, landing is serial

Multiple sessions and agents run at once; **`origin/main` is the only shared truth**.
A local `main` that is ahead of origin is invisible to every other session — two
sessions landing locally without pushing is exactly how work collides ("unexpected
changes got merged"). So landing always ends with a push, and git's push rejection
is the lock:

```bash
# 1. Sync: someone may have landed while you worked
git -C "$ROOT" switch main && git -C "$ROOT" pull --ff-only origin main

# 2. Rebase your branch onto current main (from your worktree)
git -C "$ROOT/../savoro-wt/sav-<id>" rebase main

# 3. If main moved since you branched, re-run your track's verification now

# 4. Land: squash-merge, commit with SAV id, push IMMEDIATELY
git -C "$ROOT" merge --squash feat/sav-<id>-<slug>
git -C "$ROOT" commit -m "SAV-<id>: <summary>"
git -C "$ROOT" push origin main

# 5. Clean up
git -C "$ROOT" worktree remove "$ROOT/../savoro-wt/sav-<id>"
git -C "$ROOT" branch -D feat/sav-<id>-<slug>
```

- **If the push is rejected (non-fast-forward), you raced and lost.** Recover
  mechanically: drop your squash commit with `git -C "$ROOT" reset --hard origin/main`
  (safe — your work still lives on the feature branch), then start again from step 1.
- **Never resolve divergence with `git merge --no-ff`.** A merge knot on `main` is
  always the wrong answer; rebase the feature branch instead.
- Disjoint directories make content conflicts impossible by construction; if the
  rebase conflicts anyway, stop and comment on the issue.
- This makes cross-session communication structural rather than conversational:
  Linear claims say who is doing what, `origin/main` says what has landed, and a
  push rejection says you must re-sync. No agent needs to know another agent exists.

## Frontend ↔ backend coordination

Frontend agents never read backend code; backend agents never read SwiftUI. Both code
against `docs/api-contract.md`:

- Frontend builds screens against the `APIClient` protocol with `MockAPIClient`
  returning contract-shaped data. The real API ignores client-sent `userId` and
  `snapshot` — don't depend on sending them.
- Backend implements exactly the contract's paths, auth header, error envelope, and
  DTO field names.
- **Missing endpoint or field?** Do not invent a shape. File a `[Contract]` SAV issue
  describing the screen's data needs, mark your issue Blocked, and stop. After the
  contract commit lands on `main`, both tracks pick it up by merging `main` into
  their branch (or starting fresh branches).
- Integration issues implement a `LiveAPIClient` conforming to the same protocol,
  run against `wrangler dev` (`bun run db:migrate:local`, `bun run db:seed:local`),
  and verify the feature end-to-end in the simulator.

## Verification before Done

- Backend: `cd apps/api && bun run test && bun run typecheck` — all green. For
  endpoint work, also boot `bun run dev` and curl the route.
- Frontend: `xcodebuild test -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 17'`
  — zero failures.
- TDD per slice: failing test → implement → green → commit. New behavior without a
  test does not merge.

## Secrets

No credentials in any file, ever — including seeds, docs, and commit messages
(deterministic fake dev tokens like `dev-alice-token` are fine). Local secrets live
in gitignored `.env` files; deploy secrets in Wrangler secrets. If you encounter a
real credential anywhere, flag it for rotation and don't propagate it.
