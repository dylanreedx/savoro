# RE-D4 — Critical review of the redesigned editor (post-RE-D3)

Requested by Dylan: unbiased review + research. Verdict up front: **the RE-D3
redesign fixed the page's sections but kept the wrong interaction model.**
The convolution lives in the ROWS, not the sections — and the industry's
best-designed recipe editor proves a radically simpler model works.

## The count that settles it

The current editor contains **56 interactive/expanding elements**: every
ingredient row is a 3-field micro-form (qty / unit / name) plus a remove
button plus a partial-nutrition indicator; every step row carries an options
menu; plus macro-details, remix-details, visibility options, suggestion
buttons, and a pre-publish checklist. Folding the sections (RE-D3) reduced
what you SEE first, not what you must OPERATE.

## What the research says

- **Mela** (consistently reviewed as the best-designed recipe manager;
  "a masterclass in minimalist design"): ingredients are **one free-text
  area, one ingredient per line** — "Mela will parse the text you enter and
  automatically recognize the amount and unit for every ingredients entry."
  Group headers via `#`. Instructions are plain paragraphs that
  **auto-number**. No row forms, no steppers, no per-row buttons.
- **Paprika** (category workhorse): same pattern — multiline text sections.
- **Pestle / modern entrants**: manual typing is treated as the LAST resort —
  import from URL/social/scan is primary; when you do type, it's text-first.
- General form-UX guidance: structured inputs demand the user do the
  parsing; text-first inputs let software do it. For content that is
  naturally a list-of-lines (ingredients, steps), the text area wins on
  speed, paste-ability, and edit fluidity.

## The revised model — "text-first" (binding spec, supersedes the row model)

- **Ingredients section = one growing text editor.** One ingredient per
  line ("120 g greek yogurt"). Parse quantity/unit/name per line quietly.
  `#` line = group header. Parsed lines that match a known food get a small
  trailing nutrition dot; tapping a line opens ONE sheet (link food / fix
  qty / remove) — all per-row machinery lives there, on demand.
- **Steps section = one growing text editor.** Paragraphs auto-number in
  the preview; `#` = phase header. No step cards, no options menus.
- **Paste anything**: pasting a whole ingredient list or instruction block
  just works — it is typing. (RE-23/RE-31 dissolve into this model.)
- **Macro strip** unchanged: computed from parsed lines with linked
  nutrition; "partial" stays a single quiet indicator.
- Everything else from the RE-D3 opening state stands: photo, title,
  folded description, servings row, sticky Save/Publish bar.
- **Budget, enforced by test: at most 10 interactive elements on the
  default editor view** (back, photo, title, add-description, −/+,
  servings value, save, publish + the two text areas). A regression test
  counts buttons/menus in the default tree and fails above the budget.

## Why this is right for Savoro specifically

Savoro publishes recipes to a structured contract (ingredients array,
steps array) — but structure is the SERVER's need, not the user's job.
Parse on device, publish structured, and let the user write like they'd
text a friend. That is also the only model where "beyond user friendly"
survives a 25-ingredient paste from Notes.

Sources: MacStories Mela review, mela.recipes/help (parsing + markdown
quotes), Pestle App Store/MacStories coverage, pluckrecipes/recipeone 2026
comparisons.
