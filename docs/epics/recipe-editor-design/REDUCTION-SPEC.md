# RE-D2 — Editor reduction spec (the anti-convolution contract)

Reference: `editor.png` (Claude Design prototype, the visual source of truth),
`RecipeEditor-source.jsx.txt` (full component structure), `today-frame.png`
(design language: card rhythm, chips, spacing). The prototype proves the
point: a create page can carry full power while SHOWING almost nothing.

## Opening state (what a new recipe shows — nothing else)

1. Nav: back chevron, "New recipe" large title. No progress bars, no badges.
2. **Photo drop zone** — large, soft, dashed, "Add a photo (optional)".
3. **Title field** — one line, eyebrow label TITLE, example placeholder
   ("e.g. Spicy Tofu Rice Bowl").
4. **Servings row** — single line: label + − / count / + stepper. Yield is a
   small text affordance inside this row, not a separate required field.
5. **Live macro strip** — blush pill card: "LIVE · PER SERVING", calorie
   headline, P/C/F dots, one stacked bar. Appears ONLY once an ingredient
   with nutrition exists; hidden before that. No caveat paragraphs — a
   single small "partial" dot state when data is incomplete (detail on tap).
6. **Ingredients** — section title + rows (name, sub-line "100 g · 165 cal");
   one "+ Add ingredient" affordance.
7. **Steps** — same pattern, below ingredients: title + rows + one add
   affordance. Collapsed to just the add button when empty.
8. **Sticky bottom bar** — "Save draft" (soft) and "Save & publish" (solid
   ink). Nothing else docked.

## Sentenced elements (current implementation → verdict)

| Current element | Verdict |
|---|---|
| Description multiline box up front | → progressive: "Add description" text button under title; expands on tap |
| Separate required Servings + Yield fields with "required" labels | → merge into servings row; yield optional inline; kill "required" labeling (validation happens at publish gate) |
| Partial-macro caveat paragraphs (×3 variants) | → DELETE; replaced by strip's small partial indicator + tap-for-detail |
| Per-row "nutrition details are incomplete because…" notes | → DELETE; tiny per-row dot instead |
| "Add foods from suggestions or type free-text…" instructional paragraph | → DELETE; the UI teaches by shape |
| Ingredient suggestion chips block always visible | → inside the add-ingredient sheet only |
| "Add free-text ingredient" as second big button | → one add affordance; free-text is a path inside the sheet |
| Visibility/community-share controls in main scroll | → publish sheet only (RE-37) |
| Remix source/version explainer paragraphs | → one-line attribution banner (RE-42), detail on tap |
| Draft-status copy blocks ("local only", "nothing was posted…") | → single quiet footnote line max, or into the save toast |

## Non-negotiables carried from the design language

- Card rhythm identical to `today-frame.png`: one gap token, one inset token.
- Warm cream ground, ink text, blush accents; dark mode via the adaptive
  tokens (L-15) mapped to the prototype's dark treatment.
- Type: large friendly title, small uppercase eyebrows for field labels.
- Bottom bar: soft + solid pairing exactly as the reference.
- Zero engineering words anywhere. Zero walls of explanatory text: if a
  sentence explains the UI, the UI is wrong.

## Acceptance for RE-D3

Side-by-side: RE-D3's light-standard snapshot vs `editor.png` — same
structure, same hierarchy, same calm. All 4 snapshot modes recorded. Every
current editor capability still reachable (nothing lost, everything folded).
Dylan approves or vetoes on the snapshots before Batch 1 proceeds.
