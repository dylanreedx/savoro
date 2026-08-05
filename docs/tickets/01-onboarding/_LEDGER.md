# 01-onboarding — execution ledger

## heartbeat

last-touch 2026-08-05T02:34:59Z · ticket P0.3-preland-script.md · attempt 4 · pid — · status pending

## states

`pending` · `in-progress` · `done` · `blocked`

Ledger notes for `done` rows must record: commands run with exit codes, derived test counts
(before → after), evidence paths (snapshots, journey screenshots, curl transcripts), the negative
witness where the packet names one, and honest limits. The orchestrator alone edits this file.

| Ticket | State | Commit | Updated | Note |
|---|---|---|---|---|
| `P0.1-program-guard.md` | done | this commit | 2026-08-03T15:11:56Z | Commands: `bash -n scripts/check-onboarding-program.sh` (0); `bash scripts/check-onboarding-program.sh` (0, `onboarding program guard: 50 rows checked, 50 packets checked`); `cd apps/api && bun run test && bun run typecheck` (0, `Tests 124 passed (124)`, typecheck clean; backend 124→124). Five isolated scratch-copy witnesses each exited 1: deleted row — `VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/deleted-queue-row/_QUEUE.md: expected 50 data rows, found 49 (queue row count)`; duplicate filename — `VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/duplicate-ticket-filename/_QUEUE.md row 16: duplicate ticket filename 'P0.3-preland-script.md' (also row 15)`; invalid state — <code>VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/invalid-ledger-state/_LEDGER.md row 18 ticket 'P0.2-status-ledger-reconciliation.md': invalid state 'paused'; expected pending&#124;in-progress&#124;done&#124;blocked</code>; missing packet — `VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/missing-packet-file/_QUEUE.md row 14 ticket 'P0.2-status-ledger-reconciliation.md': packet file does not exist: /tmp/savoro-program-guard-supervisor-witnesses/missing-packet-file/P0.2-status-ledger-reconciliation.md`; forged supervised row — `VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/forged-supervised-row/_QUEUE.md: supervised-set expected exactly 5 rows [P0.8 P1.2 P7.3 P8.4 P8.5], found 4`. Independent review approved. Evidence: `/Users/dylan/.pi/onboarding-runs/savoro/run-20260803T104715/tasks/iteration-001-P0.1-program-guard.md/{program-guard.log,backend-checks.log,supervisor-negative-witnesses.log,review-final-2.md}`. Honest limit: ShellCheck was unavailable to the worker. |
| `P0.2-status-ledger-reconciliation.md` | done | this commit | 2026-08-03T20:07:50Z | commands=cd apps/api && bun run test && bun run typecheck exit 0; cd SavoroIOS && xcodebuild test -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 17' exit 0; git diff --stat docs/STATUS.md exit 0; git diff --check -- docs/STATUS.md exit 0; counts=backend 131→124 with runner lines " Test Files  16 passed (16)" and "      Tests  124 passed (124)"; iOS 224→242 with runner line " Executed 242 tests, with 0 failures (0 unexpected) in 40.206 (40.277) seconds"; evidence=/tmp/savoro-p0.2-repair-api-20260803T160228.log;/tmp/savoro-p0.2-repair-ios-20260803T160239.log;/tmp/savoro-p0.2-repair-diff-20260803T160534.log;/tmp/savoro-p0.2-repair-scope-20260803T160629.log;/Users/dylan/Library/Developer/Xcode/DerivedData/Savoro-fedejesuzlduqtbfhzbagovacdzf/Logs/Test/Test-Savoro-2026.08.03_16-02-43--0400.xcresult; negative-witness=not required by packet; limits=scope log confirms every hunk is limited to the named surfaces, tracked diff contains only docs/STATUS.md, pre-existing .codex/ untouched Harness completion: focused worker checks (openai-codex/gpt-5.6-luna), independent opposite-model review (openai-codex/gpt-5.6-sol), and final track checks exited 0. Evidence root: /Users/dylan/.pi/onboarding-runs/savoro/run-20260803T155455/tasks/iteration-001-P0.2-status-ledger-reconciliation.md. |
| `P0.3-preland-script.md` | pending | — | 2026-08-05T02:34:59Z | Reopened explicitly by Dylan's P0.8 option-1 verdict after all three contracts and the design pack were approved. The packet now defines a bounded two-layer gate: compiler-visible source/technical boundaries, direct sink enforcement, exact no-growth migration baseline, representative rendered/accessibility scanning, and explicit non-claims about arbitrary whole-program dataflow. P6.4 owns visible-copy migration and baseline removal; P7.1 owns expanded runtime journey coverage. Prior rejected candidate evidence remains preserved at `/Users/dylan/.pi/onboarding-runs/savoro/run-20260803T222010/tasks/iteration-001-P0.3-preland-script.md/` (candidate diff SHA-256 `77f671f604e7e54a84f972478663c091b5691da5ec68001b095b205935647f80`, tree archive SHA-256 `7ca22ef940015ef41d467f1e0e9d025c93d26fc5f3b7c23d5edefd0702cecab1`) and is not accepted as implementation. Architecture blueprint: `/Users/dylan/Documents/personal/savoro/.pi/agent-runs/luna-program-auditor-20260805T022705Z-3ea282/final.md`. |
| `P0.4-contract-first-run-account-state.md` | done | this commit | 2026-08-04T12:48:16Z | commands=git apply --check final exit 0; negative-witness check exit 1; restored check exit 0; git status --short exit 0; counts=document-only no test runner; status lines before→after 1→2; evidence=docs/tickets/01-onboarding/drafts/contract-first-run.diff; negative-witness=exact red assertion "error: patch failed: docs/api-contract.md:268" and "error: docs/api-contract.md: patch does not apply"; limits=contract not landed by design and pre-existing .codex/hooks.json remains Harness completion: focused worker checks (openai-codex/gpt-5.6-luna), independent opposite-model review (openai-codex/gpt-5.6-sol), and final track checks exited 0. Evidence root: /Users/dylan/.pi/onboarding-runs/savoro/run-20260804T083845/tasks/iteration-001-P0.4-contract-first-run-account-state.md. |
| `P0.5-contract-email-password-auth.md` | done | this commit | 2026-08-04T12:55:33Z | commands=git apply --check exit 0; git diff --check exit 0; git apply --stat and --numstat exit 0; git status --short exit 0; counts=tracked changes 0→0; status lines 1→2 untracked; draft patch 76 insertions and 1 deletion; evidence=docs/tickets/01-onboarding/drafts/contract-email-password.diff; negative-witness=not required by packet; limits=contract remains a draft and runtime suites were not applicable Harness completion: focused worker checks (openai-codex/gpt-5.6-luna), independent opposite-model review (openai-codex/gpt-5.6-sol), and final track checks exited 0. Evidence root: /Users/dylan/.pi/onboarding-runs/savoro/run-20260804T083845/tasks/iteration-002-P0.5-contract-email-password-auth.md. |
| `P0.6-contract-catalog-nutrient-map.md` | done | this commit | 2026-08-04T13:06:28Z | commands=git apply --check docs/tickets/01-onboarding/drafts/contract-catalog-food.diff (exit 0); git status --short (exit 0); git diff --check && git diff --stat (exit 0); counts=api contract 318->364 lines if applied, draft artifact 0->73 lines, owned files 0->1; evidence=docs/tickets/01-onboarding/drafts/contract-catalog-food.diff; negative-witness=not required by packet; limits=backend and iOS suites not run because this packet is draft-only and the contract remains unapplied pending P0.8 Harness completion: focused worker checks (openai-codex/gpt-5.6-luna), independent opposite-model review (openai-codex/gpt-5.6-sol), and final track checks exited 0. Evidence root: /Users/dylan/.pi/onboarding-runs/savoro/run-20260804T083845/tasks/iteration-003-P0.6-contract-catalog-nutrient-map.md. |
| `P0.7-onboarding-design-pack.md` | done | this commit | 2026-08-04T13:43:43Z | commands=ls docs/tickets/01-onboarding/design/ (0); grep banned-copy pattern (0, 2 intentional self-check lines); git status --short --untracked-files=all (0); git diff --check (0); structural count check (0); counts=design files 0→1 for this ticket, current status 2 untracked paths with 1 ticket file and pre-existing .codex/hooks.json, spec 857 lines, screens 8, normal/loading/error headings 9/8/8, intent options 3; evidence=docs/tickets/01-onboarding/design/onboarding-design-spec.md; negative-witness=not required by packet; limits=ASCII-only artifact with no rendered UI or full-suite evidence, pre-existing .codex/hooks.json is outside the fence and untouched, candidate scope is only docs/tickets/01-onboarding/design/ Harness completion: focused worker checks (openai-codex/gpt-5.6-luna), independent opposite-model review (openai-codex/gpt-5.6-sol), and final track checks exited 0. Evidence root: /Users/dylan/.pi/onboarding-runs/savoro/run-20260804T083845/tasks/iteration-004-P0.7-onboarding-design-pack.md. |
| `P0.8-contract-design-approval.md` | done | this commit | 2026-08-05T02:25:30Z | Dylan explicitly selected gate option 1 in the supervising conversation: approve all three contract diffs verbatim, approve the onboarding design pack, and reopen P0.3 with the bounded two-layer redesign before downstream work. Per-deliverable verdicts: `contract-first-run.diff` APPROVED and landed alone as `86563bf02d245c681a677ebcef0bf086d4834748` (`[Contract] Define first-run account state`); `contract-email-password.diff` APPROVED and landed alone as `70631ab4e77cabbd9afd5c7993d0277fab1016f8` (`[Contract] Specify email password authentication`); `contract-catalog-food.diff` APPROVED and landed alone as `a4922c60d4ecfc3ca4a3f15d1b38cf28fdcc1082` (`[Contract] Add catalog food nutrient snapshots`); `design/onboarding-design-spec.md` APPROVED with no redlines. Commands/evidence: all three individual `git apply --check` commands exited 0 before landing; each applied patch passed `git apply --reverse --check`; a clean scratch tree applied all three sequentially and `cmp` matched the landed `docs/api-contract.md` exactly; `git diff --check c1fdcc0..a4922c6 -- docs/api-contract.md` exited 0; `bash scripts/check-onboarding-program.sh` exited 0 with `onboarding program guard: 50 rows checked, 50 packets checked`; contract commits were pushed to `origin/main`. Design evidence remains `docs/tickets/01-onboarding/design/onboarding-design-spec.md` and `/Users/dylan/.pi/onboarding-runs/savoro/run-20260804T083845/tasks/iteration-004-P0.7-onboarding-design-pack.md/` (iOS 242 plus UI 3 with 1 skipped, zero failures). Redline mapping: no contract/design redlines; P0.3 is to be redlined in place and reopened before restart with explicit UI-copy sinks, explicit technical wrappers/types, compiler-backed literal extraction with unknown-as-failure, a reviewed locked migration baseline, and complementary accessibility/snapshot scanning. |
| `P1.1-wrangler-env-split.md` | pending | — | — | — |
| `P1.2-cloudflare-provisioning.md` | pending | — | — | — |
| `P1.3-preview-deploy-smoke.md` | pending | — | — | — |
| `P1.4-safe-seed-tooling.md` | pending | — | — | — |
| `P2.1-credentials-schema-migration.md` | pending | — | — | — |
| `P2.2-pbkdf2-password-module.md` | pending | — | — | — |
| `P2.3-signup-endpoint.md` | pending | — | — | — |
| `P2.4-login-endpoint.md` | pending | — | — | — |
| `P2.5-logout-revocation.md` | pending | — | — | — |
| `P2.6-session-expiry-enforcement.md` | pending | — | — | — |
| `P2.7-apple-verifier-jwks-proof.md` | pending | — | — | — |
| `P3.1-onboarding-state-fallback-removal.md` | pending | — | — | — |
| `P3.2-username-availability.md` | pending | — | — | — |
| `P3.3-onboarding-completion-semantics.md` | pending | — | — | — |
| `P3.4-dev-account-tooling.md` | pending | — | — | — |
| `P4.1-sessionstore-keychain.md` | pending | — | — | — |
| `P4.2-apple-authorization-adapter.md` | pending | — | — | — |
| `P4.3-typed-auth-requests.md` | pending | — | — | — |
| `P4.4-urlprotocol-client-hardening.md` | pending | — | — | — |
| `P4.5-root-state-machine.md` | pending | — | — | — |
| `P4.6-release-safe-configuration.md` | pending | — | — | — |
| `P5.1-welcome-auth-screen.md` | pending | — | — | — |
| `P5.2-email-credential-forms.md` | pending | — | — | — |
| `P5.3-username-page.md` | pending | — | — | — |
| `P5.4-profile-basics-page.md` | pending | — | — | — |
| `P5.5-intent-page.md` | pending | — | — | — |
| `P5.6-targets-page.md` | pending | — | — | — |
| `P5.7-onboarding-resume.md` | pending | — | — | — |
| `P5.8-expired-session-ux.md` | pending | — | — | — |
| `P6.1-nil-goal-propagation.md` | pending | — | — | — |
| `P6.2-goalless-today.md` | pending | — | — | — |
| `P6.3-profile-account-screen.md` | pending | — | — | — |
| `P6.4-onboarding-copy-pass.md` | pending | — | — | — |
| `P7.1-onboarding-xcuitest-journeys.md` | pending | — | — | — |
| `P7.2-live-journey-checkpoint-gating.md` | pending | — | — | — |
| `P7.3-onboarding-visual-review.md` | pending | — | — | — |
| `P8.1-manual-food-logging-live.md` | pending | — | — | — |
| `P8.2-today-deployed-only.md` | pending | — | — | — |
| `P8.3-degraded-states.md` | pending | — | — | — |
| `P8.4-physical-device-apple-check.md` | pending | — | — | — |
| `P8.5-checkpoint-a-upload-uat.md` | pending | — | — | — |
| `P8.6-feedback-intake.md` | pending | — | — | — |
