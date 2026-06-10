# Savoro Design System

> A modern nutrition platform where **logging and recipes are the same object.**
> _Your recipes are your food log._

Savoro is a nutrition-tracking product for lifters, meal preppers, and anyone who
wants to actually enjoy tracking. Its wedge is **trust + speed + shareability** —
not "the biggest database." Every meal you log can become a beautiful, shareable
recipe; every recipe auto-calculates macros and logs in one tap.

The brand is **warm, friendly, and quietly opinionated**: soft pink ("blush") on a
bed of warm sand neutrals, frosted-glass surfaces, and a non-shaming, adherence-neutral
voice. No streaks, no guilt, no dark patterns.

---

## Sources

This system was reverse-engineered from the Savoro codebase and brand research.
You may not have access to these, but they are recorded for anyone who does:

- **Marketing site (source of truth):** local codebase `savoro-web/` — a SvelteKit
  app (Tailwind v4) with the real token definitions (`src/routes/layout.css`),
  UI primitives (`src/lib/components/ui/`), and product-preview components
  (`src/lib/components/product-preview/`) that mock the app.
- **GitHub:** [`dylanreedx/savoro`](https://github.com/dylanreedx/savoro) — contains
  `savoro-web/` (mirrors the local site), an empty `savoro-web-2/` scaffold, and
  `deep-research-report-savoro.md` (the competitive/brand-naming research that
  produced the name "Savoro" and the trust/speed/shareability positioning).
  Explore the repo further to build higher-fidelity Savoro designs.

> **Font note:** Savoro's typeface is **Plus Jakarta Sans** (self-hosted variable
> woff2 in the product). This system loads it from the **Google Fonts CDN**
> (`tokens/fonts.css`) because the binaries can't be bundled here. It is the real
> brand font, not a substitute — but to go fully offline, drop the variable woff2
> into `assets/fonts/` and swap the `@import` for `@font-face` rules.

---

## Content fundamentals

How Savoro writes. The voice is **warm, plain-spoken, and confident without being
loud.** It takes clear stances but never lectures.

- **Voice:** second person, conversational. Speaks _to_ the user ("Your recipes are
  your food log", "Cook once. Log forever.") and uses "we" for the company's stances
  ("We don't punish missed days", "Your data stays yours"). Never corporate-formal.
- **Stance-driven:** headlines are often opinions or promises, not features —
  _"Not another calorie counter."_, _"No shame, no streaks."_, _"AI that helps,
  never judges."_ Principles are framed as principles, not bullet specs.
- **Casing:** Sentence case everywhere — headings, buttons, nav. The only uppercase
  is the tracked **SECTION LABEL** eyebrow (e.g. `PRODUCT PREVIEW`). The wordmark is
  always lowercase: `savoro.`
- **Punchy structure:** short two-part headlines with a line break for rhythm
  ("Cook once. / Log forever.", "One object, / two superpowers"). Lead paragraphs
  are one or two relaxed sentences; never walls of text.
- **Reassurance over hype:** CTAs and microcopy reduce anxiety —
  "No credit card required", "Free tier available", "You're on the list. We'll be in
  touch.", "We'll never sell it." Trust language ("USDA verified", "traceable to a
  source") appears wherever data is shown.
- **Numbers are concrete:** real macros and serving sizes ("165 cal", "100g cooked",
  "31g protein"), never vague claims.
- **Emoji:** essentially never in prose. The **one** sanctioned use is small food
  glyphs on quick-log chips (☕ 🥚 🍌 🍗 🍚). Don't sprinkle emoji into copy.
- **Vibe words:** fluid, fast, beautiful, trusted, yours, respect, joy in the mundane.

Example copy, verbatim from the product:
> "Savoro unifies meal logging and recipe management into one fluid experience —
> built for lifters, meal preppers, and anyone who wants to actually enjoy tracking."
> — _"Logging food is a daily act. It should feel satisfying, even beautiful."_

---

## Visual foundations

**The feeling:** a calm, sunlit kitchen. Warm off-white paper, soft pink accents,
frosted glass floating over diffuse pastel light. Nothing harsh, nothing neon.

### Color
- **Sand** (warm grey/stone) is the entire canvas: `sand-50` page background,
  `sand-100` alternating section bands, `sand-900` body text and the inverse/dark
  CTA section. This warm neutral — not pure grey — is what makes Savoro feel cozy.
- **Blush** is the signature accent — soft pink, _never_ hot or magenta ("pink, but
  not too pink"). It's the logo dot, the calorie ring, the carbs macro, focus rings,
  and CTAs on dark. Used as a highlight, not a flood.
- **Sage** (muted green) means positive/verified/success and is the protein macro.
- **Lavender** is a rare cool accent, mostly in recipe-header gradients.
- All color is authored in **oklch** for smooth, perceptually even scales.
- **Macro language is fixed and sacred:** protein = sage, carbs = blush, fat = sand,
  calories = blush. Never reassign these.

### Type
- **Plus Jakarta Sans**, one family, everything. Friendly geometric humanist sans.
- Display/hero: **800 (extrabold)**, tight tracking (`-0.02em`), tight leading (1.08),
  36–60px. Section headings: 700, 30–36px. Body: 400, 16–18px, relaxed 1.65 leading,
  set in muted `sand-500`. Eyebrow labels: 600, 12px, UPPERCASE, `0.2em` tracking.
- Numbers (macros, calories, counts) always use **tabular figures**.

### Surfaces, depth & corners
- **Glass is the defining material:** translucent white (`55%`/`70%`) + 16–20px
  backdrop-blur + 1px translucent white border + an inner top highlight
  (`inset 0 1px 0 white/0.15`) + a soft diffuse shadow. Nav, cards, dialogs, inputs,
  product panels are all glass.
- **Corners are generous and soft:** chip `0.625rem`, card `1rem`, glass `1.25rem`,
  and **pill (`9999px`) for every button, badge, chip, and input.**
- **Shadows are low-contrast and diffuse** — colored 4–8% black, large blur, no hard
  edges. `glass` → `glass-lg` → `float` (the big 20px/60px lift under hero panels).
  Never use tight, dark drop shadows.

### Backgrounds
- Solid warm sand. Sections alternate `sand-50` and `sand-100`. The final CTA flips
  to dark `sand-900`.
- **Ambient blobs:** large, very soft, heavily blurred (80–100px) blush/sage/lavender
  circles at low opacity behind heroes — the only "decoration." No photos, no
  illustrations, no patterns, no noise/grain.
- Recipe cards use a **soft pastel gradient** as the dish-image placeholder (e.g.
  `blush-200 → blush-100 → sage-100`) with a faint radial white highlight. These
  gradients are always low-saturation and warm.

### Motion
- Gentle and physical, never flashy. Easing is **cubic-out**
  (`cubic-bezier(0.215, 0.61, 0.355, 1)`); durations 150/200/300ms, entrances ~600ms.
- Entrances **fade + rise** ~20px on scroll-into-view. Rings and bars **grow from
  empty** on mount.
- **Hover:** cards lift `-4px` and brighten/strengthen their shadow; ghost buttons
  pick up a sand wash. **Press:** everything tappable **scales to 0.97** (never a
  color flash). No bounce, no spin, no infinite loops on content.

### Layout
- Centered, max-width **1152px** (`max-w-6xl`); prose blocks cap at `~896px`.
- Sticky frosted-glass nav at top. Sections are tall and breathy (96–128px vertical
  padding). Two-column hero (copy + floating product card, slightly rotated `1deg`).

---

## Iconography

- **Inline stroke SVGs, Heroicons-style.** Savoro has no icon font and ships no icon
  asset files — every icon is hand-drawn inline SVG in the markup, with a consistent
  **~1.5 stroke width**, `round` caps/joins, on a 16/20/24 viewBox, colored via
  `currentColor` (usually `sand-500/600`). Examples in the product: shield-check
  (trust), lightning (speed), share-nodes, search, plus, checkmark, sparkles (AI),
  arrow-right.
- **To add icons,** match that style. The closest CDN match is
  **[Lucide](https://lucide.dev)** or **[Heroicons](https://heroicons.com)** (outline,
  1.5px) — use either and keep the stroke weight consistent. _(Flagged: no first-party
  icon set exists in the source; Lucide/Heroicons is a substitution.)_
- **No raster icons, no emoji in UI** — except the sanctioned small **food emoji** on
  quick-log chips (☕ 🥚 🍌 🍗 🍚 🥛 🥜 🐟).
- **Logo:** the wordmark `savoro` + a **blush dot** (a period in prose lockups, a small
  circle in the nav lockup). The dot is the brand signature — keep it blush, never
  recolor it. There is no separate glyph mark beyond the dot. _(The repo's `favicon.svg`
  is just the default SvelteKit logo — not a Savoro asset — so it was intentionally not
  imported.)_
- Social icons in the footer are inline brand SVGs (Instagram, X/Twitter, TikTok).

---

## What's in this system — index

**Global entry:** `styles.css` — the only file consumers link. It `@import`s:

| File | Contents |
|---|---|
| `tokens/fonts.css` | Plus Jakarta Sans (`@import` from Google Fonts CDN) |
| `tokens/colors.css` | Sand / Blush / Sage / Lavender scales, glass, semantic aliases, macro palette |
| `tokens/typography.css` | Family, weights, type scale, leading, tracking, semantic roles |
| `tokens/spacing.css` | Spacing scale, radii, shadows, blur, motion + `.savoro-glass` utilities |
| `tokens/base.css` | Document defaults, selection color, reduced-motion |

**Components** (`window.SavoroDesignSystem_198dc0.<Name>` once the bundle is loaded):

- `components/core/` — **Button**, **Badge**, **GlassCard**, **Logo**, **SectionLabel**
- `components/forms/` — **Input**
- `components/nutrition/` — **MacroBar**, **CalorieRing**, **FoodCard**, **RecipeCard**, **QuickLogChip**

**UI kit** (`ui_kits/savoro/`) — an interactive recreation of the Savoro marketing
site + app dashboard (Home, Recipes, Dashboard), composed from cosmetic primitives.
Open `ui_kits/savoro/index.html`.

**Guidelines** (`guidelines/`) — the foundation specimen cards shown in the Design
System tab (Colors, Type, Spacing, Brand).

**SKILL.md** — makes this folder usable as a downloadable Claude Agent Skill.

---

## Using it

- **Tokens:** prefer the semantic aliases (`--text-strong`, `--surface-card`,
  `--accent`, `--macro-protein`) over raw scale values where one exists.
- **Components:** in card/screen HTML, link `styles.css`, then
  `<script src=".../_ds_bundle.js">`, then read components off
  `window.SavoroDesignSystem_198dc0`. Don't `<script src>` the `.jsx` directly.
- **Building Savoro designs:** lead with warm sand, float content on glass, keep the
  blush accent sparing, set type tight-and-bold for display / relaxed-and-muted for
  body, and write copy that's warm, concrete, and never shaming.
