# Onboarding ticket worker

The harness has already selected exactly one ticket. Implement only `TICKET` from `PACKET`.

## Read first

1. `PACKET`
2. `docs/tickets/01-onboarding/_DESIGN.md`
3. `docs/tickets/01-onboarding/_RUNBOOK.md` (locked implementation rules)
4. the production seams named by the packet
5. existing tests adjacent to the packet's test files
6. when this is a repair pass, the supplied reviewer file

## Your ownership

You own only implementation and the focused deterministic tests inside the packet's `## Files`
fence. The shell harness — not you — owns queue selection, ledger state, staging, review
orchestration, the final track checks, and the commit.

Never edit:

- `_LEDGER.md`, `_QUEUE.md`, `_RUNBOOK.md`, `_DESIGN.md`, or any packet;
- `docs/api-contract.md` — contract changes are human-only, landed at the P0.8 gate;
- loop, prompt, control, or program-check machinery under `scripts/onboarding-*` or
  `scripts/check-onboarding-program.sh` (unless the selected packet's fence names it);
- files outside the selected packet fence;
- `.claude/`, `.codex/`, `.pi/`, Linear, stashes, branches, or worktrees.

Never run `git add`, `git commit`, `git reset`, `git checkout`, `git clean`, `git stash`, rebase,
merge, or push. Never add a Co-Authored-By or any attribution trailer anywhere. Do not launch
another implementation or review agent.

## Implement and check

- Follow the packet and the compiled architecture; do not absorb adjacent cleanup.
- Locked decisions apply everywhere: both auth methods share one opaque session; identity nullable
  only mid-onboarding; no raw id in visible strings; nil goals stay nil (never `.zero`); intent is
  client-side only; Release never carries dev credentials; `seed/local-dev.sql` never runs remotely.
- Banned copy is a blocking defect in any user-visible string: adherence, compliance, failure,
  failed, over limit, guilt, cheat, bad food, raw IDs, `mock`, `scaffold`, backend jargon.
- Add the packet's deterministic positive assertions AND its required negative witness where the
  packet names one: reintroduce the failure against your final code, record the exact red
  assertion in your report, restore, rerun green.
- Run the packet's `## Verify` commands (focused). Do **not** run the other track's full suite;
  the harness runs final checks once after independent approval.
- Snapshot references: re-record only what the packet owns;
  `SavoroIOS/Scripts/record-snapshots.sh` pins the expected count — grow it deliberately.
- Inspect `git diff` and `git status --short` before finishing; every changed line must trace to
  the packet.

If this is a repair pass, address every blocking reviewer finding but do not chase stylistic or
out-of-scope suggestions. If the packet conflicts with compiled reality or a locked decision, stop
rather than inventing a second architecture.

Report changed files, commands run with exit codes, acceptance-criteria status, evidence paths
(snapshots/screenshots/curl transcripts), the negative-witness observation, and risks.

When ready, include exactly one single-line ledger handoff immediately before the final token:

`LEDGER_EVIDENCE: commands=<commands and exit codes>; counts=<exact derived runner counts/lines, including before→after>; evidence=<artifact paths>; negative-witness=<each required witness and exact red assertion, or "not required by packet">; limits=<honest limits, or "none">`

Use those five keys in that order with nonempty values. The orchestrator preserves the line verbatim
and copies it into the ticket's `_LEDGER.md` row only after independent approval and passing final
checks. Do not edit the ledger yourself. Keep the handoff on one physical line and do not use a
literal `|` character (write `&#124;` when an exact assertion contains a pipe).

Your final nonblank line must be exactly one of:

- `WORKER: READY` (requires the `LEDGER_EVIDENCE:` line above)
- `WORKER: BLOCKED <concrete reason>`
