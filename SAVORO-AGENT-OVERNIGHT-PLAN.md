# Savoro Agent Overnight Plan

_Last updated: 2026-06-06_

## Goal

Use the existing Linear parent issues as the source of work, then let agents spend real time expanding, sequencing, and validating the implementation plan.

The current 20 Linear issues are intentionally **parent tickets / milestones**, not final implementation slices. Agents should walk through them in order, break them down, identify architecture decisions, and create or recommend child work.

## Source of truth

Primary:

- Linear project: **Savoro MVP**
- Parent issues: `SAV-9` through `SAV-28`

Supporting docs/artifacts:

- `SAVORO-MVP-ARCHITECTURE.md`
- `SAVORO-IOS-MOCKUP-BRIEF.md`
- `SAVORO-MVP-BOOTSTRAP-TICKETS.md`
- `savoro-mvp/README.md`
- `savoro-mvp/project/Savoro.html`
- `savoro-mvp/project/app/*.jsx`
- `savoro-mvp/project/_ds/**`

## High-level rule

Do not treat the 20 current issues as directly implementable unless they are small enough after review.

Agents should first turn each parent issue into:

- implementation subtasks
- API/data requirements
- architecture decisions
- acceptance criteria
- QA evidence requirements
- blockers/open questions

## Agent roles

Project-local agents live in `.pi/agents/`.

Planning/scouting:

- `ux-scout` — UX/design-to-code analysis
- `code-scout` — code/architecture exploration
- `qa-scout` — QA/oracle design
- `triage-lead` — consolidates scouts into ticket/subtask plan

Implementation/review:

- `implementer` — implements one scoped ticket only
- `qa-reviewer` — validates QA evidence and false-positive risks
- `code-reviewer` — reviews code/diff correctness
- `ux-reviewer` — reviews user-facing behavior evidence

## Work order

### Phase 1 — Expand and sequence all parent issues

Agents should walk through **all parent tickets** in this order:

1. `SAV-9` Bootstrap native SwiftUI app scaffold
2. `SAV-10` Bootstrap Savoro design system
3. `SAV-11` App shell and 5-tab navigation
4. `SAV-12` Core API models and privacy-safe domain contracts
5. `SAV-13` Today dashboard
6. `SAV-14` Log recipe bottom sheet
7. `SAV-15` Log picker/search sheet
8. `SAV-16` Recipe detail screen
9. `SAV-17` Cookbook library
10. `SAV-18` Recipe editor MVP
11. `SAV-19` Publish/save visibility sheet
12. `SAV-20` Fork/remix flow
13. `SAV-21` Discover feed/search
14. `SAV-22` Community home tab
15. `SAV-23` Community detail/feed
16. `SAV-24` Share recipe sheet
17. `SAV-25` Own Profile
18. `SAV-26` Public Profile and follow/friend actions
19. `SAV-27` Loading, error, empty states pass
20. `SAV-28` MVP privacy and regression QA harness

For each issue, scouts should produce detail. The master session or triage-lead can then create child Linear issues or add comments.

### Phase 2 — Implement foundation only

After Phase 1 produces a coherent breakdown, implementation should start with foundation tickets only:

1. `SAV-9`
2. `SAV-10`
3. `SAV-11`
4. `SAV-12`

Do not jump to screen implementation until scaffold/design system/navigation/models are stable.

### Phase 3 — Implement feature batches

After foundation review:

- Batch A: Today + logging
  - `SAV-13`
  - `SAV-14`
  - `SAV-15`

- Batch B: Recipes + Cookbook
  - `SAV-16`
  - `SAV-17`
  - `SAV-18`
  - `SAV-19`
  - `SAV-20`

- Batch C: Discover + Community + Social
  - `SAV-21`
  - `SAV-22`
  - `SAV-23`
  - `SAV-24`
  - `SAV-25`
  - `SAV-26`

- Batch D: QA/polish
  - `SAV-27`
  - `SAV-28`

## Parent issue expansion template

For every parent Linear issue, agents should produce this structure:

```markdown
# Parent issue expansion: SAV-XX Title

## What this parent issue is trying to accomplish

## Source artifacts to inspect

## Architecture decisions needed

## Proposed child tickets

### Child 1 — Title
- Type: scaffold | design-system | model | API | screen | flow | QA | polish
- Parent: SAV-XX
- Dependencies:
- Scope:
- Files/modules likely involved:
- API/data contract, if any:
- Acceptance criteria:
- QA evidence:
- False-positive risks:

## API/data contracts

## Test/QA strategy

## Open questions/blockers

## Recommended implementation order
```

## Child ticket sizing guidance

A child ticket should be small enough that one implementation agent can complete it in one focused pass.

Good child-ticket size:

- one reusable component group
- one model/fixture group
- one screen section
- one flow sheet
- one API contract + fixture set
- one QA harness/oracle

Too large:

- “Build Today” as a single child ticket
- “Implement Discover” as a single child ticket
- “Create whole design system” as a single child ticket
- “Build backend” as a single child ticket

## Architecture decisions agents should explicitly analyze

Agents should not silently choose these without noting the tradeoff:

1. 4-tab prototype vs 5-tab MVP with Community tab.
2. SwiftUI project structure and feature/module boundaries.
3. Mock-first app vs backend-first app.
4. Exact model boundaries: Recipe, RecipeVersion, FoodLogEntry, Community, UserProfile.
5. Where frozen nutrition snapshots live.
6. How recipe visibility maps to UI and API.
7. Follow-only vs mutual friend model for MVP.
8. Whether community creation is included in MVP or seeded/admin-only.
9. Whether public web pages are part of this milestone or deferred.
10. How to represent provenance/trust without overcomplicating UI.

## API planning requirements

For every screen/flow, agents should define:

- endpoint name
- request shape
- response shape
- loading state
- error state
- empty state
- privacy/authorization concerns
- whether mock fixtures are enough for first implementation

Prefer practical response examples over abstract prose.

## QA planning requirements

Every child ticket should include at least one form of evidence:

- unit test
- decode/fixture test
- snapshot or screenshot
- screen recording
- manual visual checklist
- API payload/response capture
- privacy matrix test

Important: build success is not UX success.

## Overnight autonomy rules

Allowed:

- read files
- inspect design artifacts
- create planning artifacts
- add comments to Linear
- create child Linear issues when the parent breakdown is clear
- implement foundation tickets if they are scoped and unblocked
- run local checks/tests

Not allowed unless explicitly approved:

- commit
- push
- delete old project files
- rewrite unrelated files
- make irreversible product decisions silently
- expose secrets in files/logs/comments
- claim UX parity without visual/manual evidence

## Wake/stop conditions

Wake or stop if:

- a secret would need to be written to disk
- implementation requires a product decision from the open-question list
- agents disagree on a major architecture choice
- tests/checks fail and cannot be fixed after reasonable retry
- implementation scope starts expanding beyond the current ticket
- a parent issue needs more than ~10 child tickets and should become an epic

## Linear handling

Current Linear issues are parent issues.

Agents can either:

1. add a detailed planning comment to the parent issue, or
2. create child issues and reference the parent in the title/description.

Preferred child issue naming:

```text
[SAV-XX] Short child task title
```

Example:

```text
[SAV-10] Define SwiftUI color and typography tokens
[SAV-10] Build glass card and button primitives
[SAV-13] Build meal section list with empty states
```

## First overnight batch

Recommended first autonomous run:

1. `ux-scout`: expand `SAV-9`–`SAV-28` from design/user-flow perspective.
2. `code-scout`: expand `SAV-9`–`SAV-12` from SwiftUI architecture perspective.
3. `qa-scout`: define QA strategy for `SAV-9`–`SAV-28`.
4. `triage-lead`: consolidate into child-ticket plan and update Linear.
5. If and only if foundation plan is coherent:
   - `implementer`: implement `SAV-9` only.
   - reviewers inspect `SAV-9`.
   - if approved, move to `SAV-10`.

## Human review target by morning

By morning we want:

- all 20 parent issues expanded or at least commented
- child-ticket plan for the whole MVP
- foundation implementation started, ideally `SAV-9` and maybe `SAV-10`
- clear blockers/open questions
- no silent commits
- no broad uncontrolled implementation
