# Overnight Loop Protocol (orchestrator playbook)

How a top-level Claude (Fable 5) session runs the autonomous build loop for
Savoro. Complements — never overrides — `docs/agent-workflow.md` (worktrees,
landing protocol, track boundaries, invariants) and `docs/backlog-local.md`
(what to build). `docs/STATUS.md` is the single digestible state surface.

## Architecture

```
Fable 5 top session (this repo, root parked on main)
│   EVENT-DRIVEN: workers run as background tasks, so the session is re-invoked
│   the instant any worker process exits — review/land/dispatch happens then.
│   A ~20-min ScheduleWakeup heartbeat is the fallback only, catching workers
│   that are alive-but-stuck (it checks output mtimes and kills/redispatches).
│   Owns STATUS.md and all lands. When queue + stretch queue are drained or
│   everything is human-gated: write final report, clean up, STOP the loop —
│   never idle-wake until morning.
│
├─ dispatches implementation to pi workers (one per track, max 2 concurrent):
│     pi --provider openai-codex --model gpt-5.6-sol -p \
│        --append-system-prompt "$ROOT/.pi/agents/implementer.md" \
│        "<ticket task text>"      # run from the ticket worktree, in background
│     (role files in .pi/agents/ are pinned: workers/reviewers gpt-5.6-sol,
│      scouts gpt-5.6-terra)
│
└─ ALL task-layer work is gpt-5.6 via pi — Dylan's call (2026-07-17): no Fable
   subagents. Deep reviews go to pi reviewers (.pi/agents/*-reviewer.md) on
   gpt-5.6-sol when a diff warrants it. The single Fable orchestrator session
   still gates every land itself: runs the tests, reads the diff, reads the
   visual evidence, and is the only thing that touches main.
```

## Per-wake procedure

1. **Health check.** List active background pi runs and worktrees. A worker
   whose output/log hasn't changed in >20 min is stalled: read its log, decide
   kill-and-redispatch (fresh prompt, note what it got stuck on) or wait one
   more cycle. Never two redispatches without a prompt change.
2. **Harvest.** For each worker that finished: in its worktree run the track's
   tests (`bun run test && bun run typecheck` in `apps/api`; `xcodebuild test
   -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 17'` in
   `SavoroIOS`), then review the diff:
   - correctness vs the ticket's acceptance notes in `docs/backlog-local.md`
   - ADR invariants (frozen snapshots, `recipeVersionId`, session userId,
     DTO privacy, fork provenance)
   - banned-copy grep on user-facing strings: adherence, compliance, failure,
     failed, over limit, guilt, cheat, bad food; no raw IDs/mock/scaffold
     jargon in visible copy
   - no contract drift (`docs/api-contract.md` changes are human-only)
   - scope: only the ticket, only its track directory
   - once L-20/L-21 land: LOOK at the evidence — Read the journey screenshots
     and snapshot diff PNGs for every frontend/integration ticket; a diff that
     can't be visually justified is a blocker. Agents have no eyes; this step
     is the eyes.
   - **Visual quality bar** (frontend/integration tickets; each item is a
     named blocker, checked against the screenshots one by one, not vibes):
     1. no text wrapping inside buttons, pills, or badges — single line,
        scaled or truncated by design;
     2. sibling elements in a row/rail have identical heights and alignment;
     3. no truncated or clipped copy at standard OR XXXL type sizes;
     4. spacing/colors/fonts come from design-system tokens (mechanically
        enforced once L-35 lands — flag any raw value in the diff);
     5. tap targets ≥ 44pt; interactive elements visually distinct;
     6. every state shown in evidence: normal, empty, loading, error, dark,
        XXXL. Missing evidence = not reviewable = rework, not benefit of
        the doubt.
3. **Rework or land.** Blockers → send one consolidated rework prompt to a
   fresh pi worker in the same worktree (max 2 rework rounds; then mark
   `blocked` in STATUS.md with reasons and move on). Clean → land exactly per
   `docs/agent-workflow.md`: sync main, rebase, rerun full tests if main
   moved, squash-merge to root main with `SAV-<id>:` or `L-<n>:` prefix, push,
   remove worktree and branch. Lands are strictly serial.
4. **Update STATUS.md** (queue row status + evidence commit, Last run report)
   and commit it to main as `docs: loop status update` (docs-only commit).
5. **Dispatch.** For each idle track, take the top eligible `queued` ticket
   (respect gates), create the worktree
   (`git worktree add ../savoro-wt/<id> -b feat/<id>-<slug> main`), write a
   self-contained task prompt (ticket text + acceptance criteria + track
   boundary + relevant file paths + "failing test first"), launch the pi
   worker in the background, mark `in-progress`.
6. **Re-arm the heartbeat** (~20 min fallback). Worker completions wake the
   session on their own; the heartbeat exists only to catch silent stalls. If
   everything is blocked or the queue (incl. stretch) is empty, write a final
   report to STATUS.md, clean up, and stop the loop instead of re-arming.

## Hard rules (verbatim from repo policy — the loop never bends these)

- Root repo stays parked on `main`, clean; all work in `../savoro-wt/*`.
- One ticket per worker; track boundaries absolute (frontend `SavoroIOS/`,
  backend `apps/api/`, integration both only on an integration ticket).
- Never touch Linear (blocked). Never edit `docs/api-contract.md`. Never add
  credentials. Discovered work → new `L-<n>` entry in `docs/backlog-local.md`,
  not scope expansion.
- Privacy invariants and non-shaming copy are blocking defects, not style.
- If a push is rejected or anything looks unrecoverable (conflicted rebase,
  broken main): stop dispatching, park the loop, leave a full report in
  STATUS.md for Dylan rather than improvising.

## Stop conditions

- Queue empty or all remaining tickets gated/blocked.
- Two consecutive wakes with zero progress on every active ticket.
- main broken after a land and one revert attempt.
- Any sign of credential exposure or contract drift.

On stop: finalize STATUS.md (Last run report = what landed, what's blocked,
exact test counts, recommended morning actions), ensure root is clean and
parked on main, kill leftover pi processes, remove clean worktrees.
