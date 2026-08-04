# 01-onboarding — execution ledger

## heartbeat

last-touch 2026-08-04T12:37:44Z · ticket P0.3-preland-script.md · attempt 3 · pid — · status blocked

## states

`pending` · `in-progress` · `done` · `blocked`

Ledger notes for `done` rows must record: commands run with exit codes, derived test counts
(before → after), evidence paths (snapshots, journey screenshots, curl transcripts), the negative
witness where the packet names one, and honest limits. The orchestrator alone edits this file.

| Ticket | State | Commit | Updated | Note |
|---|---|---|---|---|
| `P0.1-program-guard.md` | done | this commit | 2026-08-03T15:11:56Z | Commands: `bash -n scripts/check-onboarding-program.sh` (0); `bash scripts/check-onboarding-program.sh` (0, `onboarding program guard: 50 rows checked, 50 packets checked`); `cd apps/api && bun run test && bun run typecheck` (0, `Tests 124 passed (124)`, typecheck clean; backend 124→124). Five isolated scratch-copy witnesses each exited 1: deleted row — `VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/deleted-queue-row/_QUEUE.md: expected 50 data rows, found 49 (queue row count)`; duplicate filename — `VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/duplicate-ticket-filename/_QUEUE.md row 16: duplicate ticket filename 'P0.3-preland-script.md' (also row 15)`; invalid state — <code>VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/invalid-ledger-state/_LEDGER.md row 18 ticket 'P0.2-status-ledger-reconciliation.md': invalid state 'paused'; expected pending&#124;in-progress&#124;done&#124;blocked</code>; missing packet — `VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/missing-packet-file/_QUEUE.md row 14 ticket 'P0.2-status-ledger-reconciliation.md': packet file does not exist: /tmp/savoro-program-guard-supervisor-witnesses/missing-packet-file/P0.2-status-ledger-reconciliation.md`; forged supervised row — `VIOLATION: /tmp/savoro-program-guard-supervisor-witnesses/forged-supervised-row/_QUEUE.md: supervised-set expected exactly 5 rows [P0.8 P1.2 P7.3 P8.4 P8.5], found 4`. Independent review approved. Evidence: `/Users/dylan/.pi/onboarding-runs/savoro/run-20260803T104715/tasks/iteration-001-P0.1-program-guard.md/{program-guard.log,backend-checks.log,supervisor-negative-witnesses.log,review-final-2.md}`. Honest limit: ShellCheck was unavailable to the worker. |
| `P0.2-status-ledger-reconciliation.md` | done | this commit | 2026-08-03T20:07:50Z | commands=cd apps/api && bun run test && bun run typecheck exit 0; cd SavoroIOS && xcodebuild test -scheme Savoro -destination 'platform=iOS Simulator,name=iPhone 17' exit 0; git diff --stat docs/STATUS.md exit 0; git diff --check -- docs/STATUS.md exit 0; counts=backend 131→124 with runner lines " Test Files  16 passed (16)" and "      Tests  124 passed (124)"; iOS 224→242 with runner line " Executed 242 tests, with 0 failures (0 unexpected) in 40.206 (40.277) seconds"; evidence=/tmp/savoro-p0.2-repair-api-20260803T160228.log;/tmp/savoro-p0.2-repair-ios-20260803T160239.log;/tmp/savoro-p0.2-repair-diff-20260803T160534.log;/tmp/savoro-p0.2-repair-scope-20260803T160629.log;/Users/dylan/Library/Developer/Xcode/DerivedData/Savoro-fedejesuzlduqtbfhzbagovacdzf/Logs/Test/Test-Savoro-2026.08.03_16-02-43--0400.xcresult; negative-witness=not required by packet; limits=scope log confirms every hunk is limited to the named surfaces, tracked diff contains only docs/STATUS.md, pre-existing .codex/ untouched Harness completion: focused worker checks (openai-codex/gpt-5.6-luna), independent opposite-model review (openai-codex/gpt-5.6-sol), and final track checks exited 0. Evidence root: /Users/dylan/.pi/onboarding-runs/savoro/run-20260803T155455/tasks/iteration-001-P0.2-status-ledger-reconciliation.md. |
| `P0.3-preland-script.md` | blocked | — | 2026-08-04T12:37:44Z | Blocked by Dylan ruling after the compiler-parser redline exhausted three independently reviewed attempts without a safe candidate. The final candidate passed its focused fixtures and reported API 124/iOS 242, but review proved remaining false-negative paths through blanket request-path switch exemptions, indirect enum `rawValue` flow, and parameter-label/`metadata` inference; its ledger evidence also omitted required stage/overall PASS and scratch-discard ordering. Two architecture audits concluded the current packet requires arbitrary transitive presentation proof beyond a feasible syntax linter; accepting the candidate would preserve known holes. Preserved evidence: `/Users/dylan/.pi/onboarding-runs/savoro/run-20260803T222010/tasks/iteration-001-P0.3-preland-script.md/{review-final-1.md,review-final-2.md,review-final-3.md,candidate-3.diff,supervisor-preserved-preland-tree.tar.gz,supervisor-preserved-sha256.txt}`; candidate diff SHA-256 `77f671f604e7e54a84f972478663c091b5691da5ec68001b095b205935647f80`; tree archive SHA-256 `7ca22ef940015ef41d467f1e0e9d025c93d26fc5f3b7c23d5edefd0702cecab1`; architecture audit `/Users/dylan/Documents/personal/savoro/.pi/agent-runs/luna-program-auditor-20260804T044620Z-177ffa/final.md`. Approved continuation is limited to independent P0.4–P0.7, followed by the supervised P0.8 stop; broader enforcement must define explicit UI-copy sinks/technical wrappers, migration baseline, and complementary runtime accessibility/snapshot evidence. No P0.3 implementation was landed and no acceptance gate was weakened. |
| `P0.4-contract-first-run-account-state.md` | pending | — | — | — |
| `P0.5-contract-email-password-auth.md` | pending | — | — | — |
| `P0.6-contract-catalog-nutrient-map.md` | pending | — | — | — |
| `P0.7-onboarding-design-pack.md` | pending | — | — | — |
| `P0.8-contract-design-approval.md` | pending | — | — | — |
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
