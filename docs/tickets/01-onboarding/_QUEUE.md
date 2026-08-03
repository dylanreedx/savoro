# 01-onboarding — dependency queue

Exactly 50 tickets. The loop selects the first row whose dependencies are all `done` in `_LEDGER.md`
and whose own state is `pending`. `blocked` is never retried automatically. When a supervised row
becomes first eligible, the loop stops and reports it; it must not skip ahead, because later
decisions depend on that review.

Tracks: B = backend (`apps/api`), F = frontend (`SavoroIOS`), I = integration, M = meta/loop.
Former `docs/epics/onboarding.md` IDs are cross-referenced inside each packet.

| # | Ticket | Track | Depends on | Execution |
|---:|---|---|---|---|
| 1 | `P0.1-program-guard.md` | M | — | autonomous |
| 2 | `P0.2-status-ledger-reconciliation.md` | M | P0.1 | autonomous |
| 3 | `P0.3-preland-script.md` | M | P0.2 | autonomous |
| 4 | `P0.4-contract-first-run-account-state.md` | B | P0.1 | autonomous |
| 5 | `P0.5-contract-email-password-auth.md` | B | P0.1 | autonomous |
| 6 | `P0.6-contract-catalog-nutrient-map.md` | B | P0.1 | autonomous |
| 7 | `P0.7-onboarding-design-pack.md` | F | P0.1 | autonomous |
| 8 | `P0.8-contract-design-approval.md` | M | P0.4, P0.5, P0.6, P0.7 | supervised |
| 9 | `P1.1-wrangler-env-split.md` | B | P0.3 | autonomous |
| 10 | `P1.2-cloudflare-provisioning.md` | B | P1.1 | supervised |
| 11 | `P1.3-preview-deploy-smoke.md` | B | P1.2 | autonomous |
| 12 | `P1.4-safe-seed-tooling.md` | B | P1.3 | autonomous |
| 13 | `P2.1-credentials-schema-migration.md` | B | P0.8 | autonomous |
| 14 | `P2.2-pbkdf2-password-module.md` | B | P2.1 | autonomous |
| 15 | `P2.3-signup-endpoint.md` | B | P2.2 | autonomous |
| 16 | `P2.4-login-endpoint.md` | B | P2.3 | autonomous |
| 17 | `P2.5-logout-revocation.md` | B | P2.4 | autonomous |
| 18 | `P2.6-session-expiry-enforcement.md` | B | P2.5 | autonomous |
| 19 | `P2.7-apple-verifier-jwks-proof.md` | B | P0.8 | autonomous |
| 20 | `P3.1-onboarding-state-fallback-removal.md` | B | P0.8 | autonomous |
| 21 | `P3.2-username-availability.md` | B | P3.1 | autonomous |
| 22 | `P3.3-onboarding-completion-semantics.md` | B | P3.2 | autonomous |
| 23 | `P3.4-dev-account-tooling.md` | B | P3.3, P2.4 | autonomous |
| 24 | `P4.1-sessionstore-keychain.md` | F | P0.8 | autonomous |
| 25 | `P4.2-apple-authorization-adapter.md` | F | P4.1 | autonomous |
| 26 | `P4.3-typed-auth-requests.md` | F | P4.1, P3.1 | autonomous |
| 27 | `P4.4-urlprotocol-client-hardening.md` | F | P4.3 | autonomous |
| 28 | `P4.5-root-state-machine.md` | F | P4.4, P4.2 | autonomous |
| 29 | `P4.6-release-safe-configuration.md` | F | P4.5 | autonomous |
| 30 | `P5.1-welcome-auth-screen.md` | F | P4.5, P0.8 | autonomous |
| 31 | `P5.2-email-credential-forms.md` | F | P5.1, P2.4 | autonomous |
| 32 | `P5.3-username-page.md` | F | P5.2, P3.2 | autonomous |
| 33 | `P5.4-profile-basics-page.md` | F | P5.3, P3.3 | autonomous |
| 34 | `P5.5-intent-page.md` | F | P5.4 | autonomous |
| 35 | `P5.6-targets-page.md` | F | P5.5 | autonomous |
| 36 | `P5.7-onboarding-resume.md` | I | P5.6, P3.3 | autonomous |
| 37 | `P5.8-expired-session-ux.md` | F | P5.7, P2.6 | autonomous |
| 38 | `P6.1-nil-goal-propagation.md` | F | P0.8 | autonomous |
| 39 | `P6.2-goalless-today.md` | F | P6.1, P0.8 | autonomous |
| 40 | `P6.3-profile-account-screen.md` | F | P6.2, P5.6 | autonomous |
| 41 | `P6.4-onboarding-copy-pass.md` | F | P5.8, P6.3 | autonomous |
| 42 | `P7.1-onboarding-xcuitest-journeys.md` | F | P6.4 | autonomous |
| 43 | `P7.2-live-journey-checkpoint-gating.md` | I | P7.1, P1.4, P3.4 | autonomous |
| 44 | `P7.3-onboarding-visual-review.md` | M | P7.2 | supervised |
| 45 | `P8.1-manual-food-logging-live.md` | I | P7.3 | autonomous |
| 46 | `P8.2-today-deployed-only.md` | I | P8.1, P4.6 | autonomous |
| 47 | `P8.3-degraded-states.md` | F | P8.2 | autonomous |
| 48 | `P8.4-physical-device-apple-check.md` | M | P8.3, P1.3 | supervised |
| 49 | `P8.5-checkpoint-a-upload-uat.md` | M | P8.4 | supervised |
| 50 | `P8.6-feedback-intake.md` | M | P8.5 | autonomous |
