# Agent Workflow

Rules for every agent working on Savoro. Read this, your Linear issue, and the docs
it references before touching code. When this doc and an issue conflict, comment on
the issue and stop.

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

## Branching and history

- One branch per Linear issue, off **latest `main`**, named `feat/sav-<id>-<slug>`
  (e.g. `feat/sav-122-date-validation`).
- Work in your own git worktree (`git worktree add ../savoro-sav-<id> feat/sav-<id>-<slug>`)
  so parallel agents never share a working tree.
- Commit per green slice on your branch. When acceptance criteria pass, **squash-merge
  into `main`** with the SAV id in the commit subject
  (`git merge --squash`, subject like `SAV-122: reject impossible calendar dates`),
  then delete the branch and remove the worktree. Disjoint directories make conflicts
  impossible by construction; if you hit one anyway, stop and comment on the issue.
- Do not push to origin, open PRs, deploy, or create external services unless the
  issue says so.

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
