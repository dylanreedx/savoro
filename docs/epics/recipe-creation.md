# Epic v2: Recipe Creation — video-preferred, guided, one flow to done

Supersedes the build batches of `recipe-editor.md` (its Batch D lessons and
landed tickets carry forward). Model decided by Dylan 2026-07-18:

- **Video is optional but preferred.** A backing video (TikTok / Reels /
  YouTube / own upload) is the happy path; scratch recipes are first-class.
- **Share-to-Savoro is the flagship entry.** iOS Share Extension: share a
  video from TikTok/IG/Photos → Savoro opens mid-creation with a drafted
  recipe. Paste-a-link is the quiet in-app fallback.
- **Creating is correcting.** An LLM drafts title/ingredients/steps from the
  video caption; the editor is a guided *review* surface. Manual-from-scratch
  uses the same guided editor.
- **Guided, not free-text, not row-forms.** Dylan vetoed both extremes.
  Smart single inputs build a visible list; buttons where they earn their
  place; the RE-D4 parser survives as the ENGINE behind inputs/paste/import,
  never as the visible UX.
- **Legal line:** platform videos render via official oEmbed embeds with
  creator attribution + link-out. We never re-host platform video. Draft
  generation uses captions/descriptions only (the Mela/Pestle-proven tier).
- Hunter/claim mechanic (ProductHunt model) and the Discover video carousel
  are ACKNOWLEDGED, SEPARATE epics — nothing here builds them, everything
  here stays compatible with them (attribution/provenance fields).

## Standing rules for every ticket (the "don't disappoint" contract)

1. One ticket = one worker = one self-contained prompt quoting this spec.
2. Frontend tickets land with snapshot evidence; the reviewer LOOKS at it
   against the design references (docs/epics/recipe-editor-design/) — tests
   green without matching the design is a rework.
3. **Interactive budget:** default create view ≤ 12 tappable controls,
   enforced by the existing budget regression test (updated per RC-1's
   approved design). Sheets can be richer; the page stays calm.
4. No banned language; no jargon; product voice throughout.
5. ⛔ marks a Dylan gate: the loop hard-stops there, presents evidence, and
   dispatches nothing further until his verdict.
6. Phases dispatch strictly in order; no cross-phase parallelism except
   where marked ∥-safe.

---

## Phase A — Design & decisions

- **RC-1 — Guided editor v3: interaction prototypes.** frontend.
  Build 2 (max 3) switchable SwiftUI prototype variants of the guided model,
  as snapshot-rendered screens (visual fidelity over wiring):
  (a) **Composer model**: one smart input pinned under the ingredient list —
  type "2 cups flour", it parses to a rendered row (engine: RE-D4 parser);
  rows tap-to-edit in the single detail sheet; steps identical with a step
  composer that auto-advances.
  (b) **Sheet-build model**: a big friendly "+ Add ingredients" opens a
  focused full-screen sheet where entries are added rapid-fire; the page
  itself shows only the rendered list.
  Each variant: ingredients + steps sections, empty AND 8-item states, all
  4 snapshot modes. Acceptance: budget test passes for each; snapshots
  recorded for side-by-side. **⛔ Dylan picks the model (or redirects).**
- **RC-2 — Import flow design spec.** frontend (docs deliverable).
  Wireframe-level spec for: share-extension confirm screen → "New recipe
  from this video" screen (embed card, attribution row, "drafted from the
  video — check everything" banner) → guided editor prefilled → publish.
  Includes the thin-caption state: a light draft must read as a head start
  ("We pulled what we could — captions were light"), never a failure.
  Deliverable into docs/epics/recipe-editor-design/. **⛔ Dylan approves.**
- **RC-3 — ⛔ LLM drafting decision (Dylan).** Provider + model + monthly
  cost ceiling for caption→draft structuring; secret lives in Worker env
  (never the app, never the repo). Blocks RC-6.
- **RC-4 — ⛔ Contract change (Dylan approves the diff).** Draft the
  [Contract] commit adding: recipe video source fields (platform, url,
  embedUrl, thumbnailUrl), attribution (creatorHandle, creatorUrl),
  origin (created | imported), plus /v1/import/link and /v1/import/draft
  endpoint specs. Present diff to Dylan; lands only with his approval, as a
  dedicated [Contract] commit on main per workflow rules. Blocks Phase B.

## Phase B — Backend import pipeline (after RC-4) — ∥-safe with Phase D

- **RC-5 — oEmbed resolver endpoint.** backend. POST /v1/import/link
  {url} → {platform, embedUrl, thumbnailUrl, creatorHandle, creatorUrl,
  caption, title?}. TikTok/Instagram/YouTube oEmbed + public metadata ONLY
  (no scraping; document the legal line in code). Error taxonomy:
  unsupported_platform, unreachable, private_content, malformed_url. Cache
  by URL (D1, TTL); per-user rate limit. Auth required. Tests: each
  platform shape (fixture-based, no live network in tests), cache hit,
  every error, privacy (no caller data leaks).
- **RC-6 — Draft generation endpoint.** backend, gated on RC-3.
  POST /v1/import/draft {caption, title?} → {draft: {title?, description?,
  ingredients[], steps[], confidence: full|partial|thin}}. Worker calls the
  chosen LLM with a structured-output prompt; NEVER invents nutrition
  numbers; ingredients arrive unlinked. Timeouts + graceful degrade
  (confidence: thin, empty arrays ok). Tests: mock LLM seam, thin/rich
  caption fixtures, junk input, cost guard (max tokens).
- **RC-7 — Recipe create/publish carries video + attribution.** backend.
  Extend create/PATCH/DTOs per RC-4 contract; provenance shows
  "imported from {platform} @{handle}" in detail DTO; public surfaces
  include attribution + link-out URL. Invariants: attribution immutable
  after publish except by unpublish-edit; forks preserve original video
  attribution chain. Tests incl. DTO denylist as always.

## Phase C — Share extension & import UX (after RC-2; RC-9 needs RC-5)

- **RC-8 — Share Extension target.** frontend. New extension target
  accepting URLs + video files; App Group container handoff; deep link
  opens the main app in import mode. Extension UI is one confirm card
  (thumbnail if instant, title, "Create recipe in Savoro"). Memory-safe
  (extension limits), works from TikTok, Instagram, YouTube, Safari,
  Photos. XCUITest simulates the handoff via the deep link path.
- **RC-9 — "New recipe from video" screen.** integration. Import mode:
  embed player card (WKWebView, official embed only), attribution row
  (@handle, platform icon, link-out), draft-review banner per RC-2 design,
  then the guided editor prefilled from RC-6's draft. Thin-caption state
  per spec. Live UI journey against local Worker with fixture oEmbed/LLM
  seams; screenshots at each step.
- **RC-10 — Paste-a-link fallback.** frontend. Quiet secondary affordance
  on the create entry point ("Have a link?"), same pipeline as RC-9.
- **RC-11 — Own-video attach.** frontend. Record/pick from Photos; stored
  locally, labeled "on this device for now" (R2 upload is a later epic);
  plays in the editor and detail via local player.

## Phase D — Guided editor v3 build (after RC-1 pick) — ∥-safe with Phase B

- **RC-12 — Ingredients: build the chosen model.** frontend. Per RC-1
  verdict, full build: smart input → parsed rendered rows, single tap-row
  detail sheet (link food / fix qty / remove), reorder affordance, group
  headers as a UI action (not # syntax). Budget test updated + passing.
- **RC-13 — Steps: build the chosen model.** frontend. The acknowledged
  hard one: single active composer, auto-advance to next step, reorder,
  phase headers; steps optional when a video is attached (the video IS the
  instruction fallback — copy reflects that gently).
- **RC-14 — Paste interception.** frontend. Multi-line paste into either
  composer → "Add as N ingredients?" confirmation → parser engine splits;
  misparses editable per-row afterward.
- **RC-15 — Macro strip + linking in the guided model.** frontend. Strip
  appears once ≥1 linked ingredient; per-row quiet nutrition dot; partial
  state single indicator; math unchanged (already tested).
- **RC-16 — Autosave, dirty-state, resume.** frontend. Debounced local
  persistence of every mutation incl. import-mode fields; swipe-dismiss
  protection sheet; Cookbook Drafts resume with progress hint.
- **RC-17 — Keyboard & focus flow.** frontend. Composer keeps focus after
  each add; toolbar next/done; numeric pads where numeric; focused input
  never hidden by keyboard (tested at XXXL too).
- **RC-18 — Basics condensed.** frontend. Title validation + example
  placeholder, folded description, servings/yield row (already good), time
  chips, tag chips (curated local list), photo slot honoring an imported
  video thumbnail when present.

## Phase E — Publish & provenance surfaces

- **RC-19 — Publish flow for video recipes.** frontend. SAV-72 sheet +
  attribution preview ("Published with credit to @handle · links to the
  original"); scratch recipes unaffected.
- **RC-20 — Recipe detail shows video + attribution.** frontend. Embed
  card above the fold when video exists; attribution row; fork keeps
  original attribution visibly.
- **RC-21 — Pre-publish checklist gate.** frontend. Friendly jump-to-fix
  sheet; steps-optional rule when video attached; no shouting.
- **RC-22 — Live slice: the full import journey.** integration. Share/deep
  link → oEmbed (local Worker) → draft → edit → publish → visible in
  detail with embed, against seeded local stack. Live UI test + screenshots.

## Phase F — Quality & the gate that matters

- **RC-23 — Coverage matrix.** frontend. Snapshots for every new surface
  (4 modes each incl. import mode, thin-draft state, all three doors);
  XCUITest journeys: scratch, paste-link, deep-link import.
- **RC-24 — A11y + copy pass.** frontend. VoiceOver labels/order on
  composers and sheets; XXXL walkthrough; single-voice copy review; copy
  test extended.
- **RC-25 — ⛔ Dylan UAT.** Simulator/TestFlight session across all three
  doors. Feedback becomes RC-26+ before any other page is touched.

## Deliberately NOT in this epic

Hunter/claim mechanic; Discover video carousel (needs this epic's video
fields first); R2 video/image upload; transcript- or frame-tier generation;
comments/reactions. Each becomes its own epic when Dylan calls it.
