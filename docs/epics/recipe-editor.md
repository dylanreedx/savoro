# Epic: Create Recipe — one page, driven to done

The single focus page until Dylan says otherwise. Goal: the most polished,
beyond-user-friendly recipe creation experience we can build — extensive,
forgiving, fast, and warm. Everything here is scoped to the Recipe Editor
surface (plus its sheets) unless marked otherwise.

Ground truth today: `RecipeEditorPlaceholderView.swift` (~1.5k lines) has a
working mock editor — title/description/servings/yield, ingredient rows with
mock food search, instructions, macro preview, visibility/community-share
sheets, remix hydration. Backend is FULLY ready for this page: create/edit
(SAV-127), publish/unpublish/archive (SAV-129), fork (SAV-130), foods
search/detail (L-37 — endpoints live, real USDA data pending Dylan's import).
Design reference: `savoro-mvp/project/app/screens-recipe.jsx` + design system.

IDs are `RE-n`. Track is frontend unless marked (integration). Order within
each cluster ≈ build order. ~8 batches, each independently landable.

## Batch 0 — Dylan's named polish complaints (do first, small)

- **RE-1 — Today card spacing audit.** (Today page, but Dylan-named.) Uniform
  outer margins between stacked cards; uniform inner padding; kill the gaps
  from doubled margins and the cards with fat side padding. Add a layout
  regression test asserting consistent card insets. Snapshot re-record.
- **RE-2 — Editor spacing rhythm pass.** Same treatment inside the editor:
  every card/section uses identical inset + inter-card gap tokens via L-35
  primitives. No hand-rolled padding anywhere on this page (lint already
  guards new violations; migrate the legacy ones).

## Batch 1 — Editor shell & structure

- **RE-3 — Information architecture decision + skeleton.** Restructure into
  clear sections: Photo, Basics, Ingredients, Steps, Nutrition, Publish.
  Single scroll with sticky section header OR paged steps — prototype both in
  snapshots, pick one (default rec: single scroll + section jump bar).
- **RE-4 — Section completion model.** Each section knows complete/incomplete/
  attention; drives the jump bar, publish gate, and empty-state hints.
- **RE-5 — Draft autosave.** Every mutation persists locally (debounced);
  killing the app and reopening restores the exact draft, cursor-safe.
- **RE-6 — Dirty-state protection.** Swipe-down/back with unsaved changes →
  calm sheet: Keep editing / Save draft / Discard. No silent loss, ever.
- **RE-7 — Drafts resume flow.** Cookbook → Drafts shows editor drafts with
  progress hint ("6 ingredients · no steps yet"), tap resumes.
- **RE-8 — Keyboard management.** Toolbar with next/prev field + Done;
  focused field always visible above keyboard; number pads where numeric.
- **RE-9 — Editor performance guard.** 60-ingredient/30-step draft stays
  smooth; add a perf test with a big fixture.

## Batch 2 — Basics section

- **RE-10 — Title field v2.** Live validation (length, emptiness), rotating
  placeholder inspiration ("Weeknight lemon orzo…"), no jargon errors.
- **RE-11 — Description editor.** Growing multiline, soft character guide,
  optional tone hint copy.
- **RE-12 — Servings & yield controls.** Stepper + direct entry, 1–99 bounds,
  yield free-text with examples ("4 bowls", "12 cookies"); the pair reads as
  one row and reflows at XXXL.
- **RE-13 — Time inputs.** Prep + cook time wheels/chips (5-min grain),
  auto-computed total, skippable without guilt copy.
- **RE-14 — Tags & meal-type chips.** Cuisine/meal/dietary chip picker from a
  curated local list; max N with overflow count; searchable sheet.
- **RE-15 — Photo slot (local-first).** Camera/library picker, square+card
  crops, tasteful placeholder art when absent; upload deferred (R2/L-29) —
  stored locally, clearly labeled "on this device for now".

## Batch 3 — Ingredients (the heart of the page)

- **RE-16 — Ingredient row v2.** Quantity · unit · name layout on one line,
  wraps gracefully at XXXL; equal row heights (guardrail-tested).
- **RE-17 — Quantity parsing.** Accept "1 1/2", "1.5", "½", ranges ("2-3");
  normalize display to pretty fractions; parser unit-tested exhaustively.
- **RE-18 — Unit picker v2.** Common cooking units first, per-food serving
  units when a food is linked, metric/imperial toggle, remembered preference.
- **RE-19 — Food search sheet (live).** (integration) Debounced
  /v1/foods/search; recents + "add as plain text" escape hatch on every
  query; skeleton loading rows; calm empty/offline states. Works today
  against the fixture foods; shines after Dylan's USDA import.
- **RE-20 — Free-text ingredient + manual nutrition.** Plain-text rows are
  first-class; optional "add nutrition" inline form (per-serving macros).
- **RE-21 — Reorder & delete.** Drag handles, swipe-to-delete, 6-second undo
  toast; VoiceOver-operable reorder.
- **RE-22 — Ingredient section headers.** Optional groups ("For the sauce");
  create/rename/delete groups; drag between groups.
- **RE-23 — Paste-a-list import.** Paste a whole ingredient list → parsed
  into rows (quantity/unit/name best-effort, misparses editable); this is
  the single biggest "beyond friendly" unlock for real users.
- **RE-24 — Duplicate nudge.** Same food added twice → gentle merge
  suggestion chip, never blocking.
- **RE-25 — Live macro preview v2.** Per-ingredient contribution + running
  per-serving totals; the "partial data" state gets honest-but-warm copy and
  a per-row indicator instead of the current wall of caveats.
- **RE-26 — Scaling preview.** Changing servings shows scaled quantities
  inline (read-only preview toggle), so 4→6 servings is one tap to sanity-check.

## Batch 4 — Steps

- **RE-27 — Step editor v2.** Numbered cards, growing text, insert-between,
  reorder with drag, swipe-delete + undo.
- **RE-28 — Step phases.** Optional headers ("Prep", "On the stove") mirroring
  ingredient groups.
- **RE-29 — Duration chips.** Detect "10 min" in step text → tappable chip;
  (timer itself can be a later cooking-mode feature; chip is metadata now).
- **RE-30 — Ingredient references in steps.** Type "@" → pick from this
  recipe's ingredients; renders as a subtle chip; keeps steps and quantities
  in sync when ingredients change.
- **RE-31 — Paste-a-list for steps.** Paste numbered/paragraph instructions →
  split into step cards; misparses editable.

## Batch 5 — Nutrition section

- **RE-32 — Nutrition summary card v2.** Per-serving macro tiles + calorie
  headline; source explanation in one plain sentence; consistent with Today's
  visual language.
- **RE-33 — Manual override mode.** "Enter nutrition yourself" switch —
  overrides computed values, clearly labeled, reversible.
- **RE-34 — Completeness meter.** "Nutrition covers 6 of 8 ingredients" with
  per-row jump-to-fix; replaces the current caveat text blocks.

## Batch 6 — Publish flow (folds in SAV-72)

- **RE-35 — CTA hierarchy.** Persistent bottom bar: primary "Save draft" that
  becomes "Publish" when the gate passes; never two competing primaries.
- **RE-36 — Pre-publish checklist gate.** Publish tap with incomplete
  sections → friendly checklist sheet, each row jumps to the fix; no red
  shouting, no "failed" language.
- **RE-37 — Publish sheet v2 (SAV-72).** Private / Unlisted / Public in plain
  language with one-line consequences; default private; confirm shows what
  changes ("People can find this in Discover").
- **RE-38 — Live create/edit/publish wiring.** (integration) The editor
  drives real POST /v1/recipes, PATCH, POST /:id/publish behind the same
  Debug env gate as L-23; Release stays mock. Live UI journey: create →
  ingredient via foods search → steps → publish → visible via GET.
- **RE-39 — Post-publish moment.** Success state with the recipe card, "View
  recipe" and "Share" actions; calm delight, no confetti spam.
- **RE-40 — Edit-after-publish clarity.** Editing a published recipe explains
  versioning in human words ("Your update becomes the new version; past logs
  keep what they logged"); unpublish/archive actions live here too.
- **RE-41 — Community share step polish.** Existing mock share-to-community
  flow restyled to match publish sheet v2; wiring deferred until communities.

## Batch 7 — Remix, resilience & coverage

- **RE-42 — Remix editor header.** Attribution banner inside the editor
  ("Remix of Chicken Shawarma Bowl by Avery"), publish keeps attribution;
  copy distinct from ordinary drafts (exists — polish to v2 spec).
- **RE-43 — Remix change hints.** Subtle "changed from original" dots on
  edited fields (cheap diff against hydrated source values).
- **RE-44 — Failure resilience.** Publish/network failure → draft never
  lost, retry affordance, offline banner; kill-app-mid-publish test.
- **RE-45 — Haptics & micro-motion.** Add/remove row transitions, publish
  success haptic, section completion tick — restrained, respects
  reduce-motion.
- **RE-46 — Editor accessibility pass.** VoiceOver labels/order/actions for
  every control, XXXL walkthrough of all sections, 44pt targets audited
  (guardrail tests extended to editor specifics).
- **RE-47 — Editor snapshot matrix.** All editor sections in the 4-mode
  matrix (extends L-21 coverage to each section state: empty, partial,
  complete, error).
- **RE-48 — Create-recipe XCUITest journey.** Full happy path (new recipe →
  publish) + validation-gate path + remix path; screenshots per step feed
  every future review.
- **RE-49 — Copy pass with a single voice.** Every string on this page
  reviewed against the product voice (calm, non-shaming, zero jargon);
  copy test extended to new strings.
- **RE-50 — Dylan UAT of Create Recipe.** Human gate: TestFlight/simulator
  session against the finished page; feedback becomes RE-51+ before the
  next page begins.

## Execution notes for the loop

- Order: Batch 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. One ticket per worker, one
  batch roughly per loop session; RE-19/RE-38 are integration-tracked.
- Every ticket lands with: snapshot evidence (new/updated refs), guardrail
  tests where layout is involved, and zero banned-language regressions.
- RE-3's IA decision gates Batches 2+ — it lands first with Dylan able to
  veto the direction from its snapshots before the rest builds on it.
- Dependencies on Dylan: USDA import (makes RE-19 real), R2 decision
  (unblocks photo upload later), RE-50 UAT.
