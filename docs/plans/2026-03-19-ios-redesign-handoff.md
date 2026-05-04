# Savoro iOS Redesign — Handoff

## Goal

Rebuild Savoro as a native Swift/SwiftUI app with a **minimal white-pink glass elegant professional** aesthetic. Chat-first AI interaction with gen-UI. Instant daily macro visibility. The app should feel fast, beautiful, and earn its home screen spot.

## Key Design Decisions (from Dylan)

1. **Chat-first, not form-first** — The primary interaction is talking to an AI agent. "Hey I ate 200g of this" + attach a barcode photo. Way easier than filling out forms everywhere.

2. **Gen UI in chat** — The agent has a large repo of UI components to choose from. It responds with rich interactive cards (recipe builders, macro summaries, barcode results, portion selectors). Think MCP-powered tool use where each tool renders a specific component.

3. **Instant daily snapshot** — Despite being chat-first, you MUST see your day at a glance the moment you open the app. How much protein do I still need? How many calories have I eaten? This is non-negotiable — visible instantly, not buried behind a conversation.

4. **Forms still exist** — Chat is primary but structured inputs (goal setting, recipe editing) can use forms/inputs where they make sense. The agent can surface these interactively.

5. **Social that isn't social media** — Shared "Kitchens" for couples/roommates, recipe sharing via links with provenance ("From Sarah"), no posts/feeds/likes/comments.

6. **Native Swift** — Not React Native. Real SwiftUI materials, native spring animations, 120fps. The glass/animation quality demands it.

## What to Explore & Improve

- **The balance between Today snapshot and Chat** — How do these coexist? Is Today a view above the chat? A separate tab? A card that collapses as you scroll into conversation? Find the right spatial relationship.
- **Gen UI component library** — What specific components does the agent need? Recipe builder, food logger, barcode result, portion picker, macro summary, meal suggestion, grocery list item? Define the full set.
- **MCP tool ↔ UI mapping** — Each agent tool should map to a rendered component. Design both the tool schema and the UI it produces.
- **Barcode + photo flow in chat** — How does attaching a barcode photo feel? Camera inline? Attachment button? Does the agent auto-detect it's a barcode?
- **Recipe building via conversation** — "I made a chicken bowl with rice, broccoli, and teriyaki" → agent asks clarifying questions → builds the recipe card interactively → saves to cookbook. Design this flow.
- **The 2-second log** — Open app → see snapshot → tap favorite or type quick message → logged. Protect this speed at all costs.
- **Shared Kitchen UX** — How does logging "for the kitchen" work in a chat-first model? Do you say "log dinner for both of us"?
- **Quiet consistency** — No streaks or gamification. Just a dot grid calendar showing days you logged. Beautiful and subtle.

---

## Stitch Design Prompt v1

### The Philosophy

Savoro is a food app where **your recipes are your food log**. You don't track food and manage recipes separately — they're the same thing. When you cook your chicken shawarma bowl, logging it IS opening the recipe. Your recipe collection grows from how you actually eat, not from bookmarking things you'll never make.

The app should feel like **a beautiful kitchen notebook that happens to be intelligent**. Not a calorie counter. Not a social network. A personal tool that's quiet, fast, and earns its place on your home screen.

### Design Language

**Palette:**
- Canvas: `#FAFAF9` warm off-white — never pure white, never cold
- Glass surfaces: white at 60-70% opacity over ultra-thin material blur
- Accent: `#FB7185` rose — used like a chef's copper accent, sparingly, meaningfully
- Text: `#1C1917` / `#78716C` — stone-warm, never gray-blue
- Macro palette: Protein `#93C5FD`, Carbs `#FDE68A`, Fat `#C4B5FD` — soft, never neon
- Borders: hairline white at 30% opacity — felt, not seen
- Ambient glow: radial rose gradient at 3-5% opacity behind key cards — warmth without decoration

**Typography:** Plus Jakarta Sans. Large, confident headings (28-34pt bold). Comfortable body (16pt medium). Generous line height. Let the text breathe.

**Surfaces:** Every card is frosted glass. No hard drop shadows anywhere. Instead, a soft 0.5px white top-border and barely-there ambient shadow underneath. Corners: 20pt standard, 28pt hero cards. Cards should feel like they're resting on light.

**Motion:**
- Spring-based everything (damping: 20, stiffness: 150)
- Cards enter with scale(0.97) → scale(1.0) + opacity fade, staggered 50ms apart
- Taps: quick micro-bounce scale(0.98) with haptic
- Screen transitions: shared element transitions where possible — a recipe card in a list morphs into the detail view
- Pull gestures have rubber-band physics
- Nothing is instant. Nothing takes more than 300ms. Everything has momentum.

### App Structure — Three Tabs

#### Tab 1: Today (Home)

The screen you see 10x a day. Scannable in under 2 seconds.

1. **Time-aware header** — "Good morning, Dylan" with date. Barely-visible ambient gradient shifts warm/cool with time of day.

2. **The Macro Glow** — Three horizontal translucent glass pills showing each macro with thin fill lines. Protein blue tint, carbs amber, fat violet. Single calorie number centered below: "1,550 of 2,200". Fills animate smoothly. Balanced = subtle unified shimmer. Something off = that macro's pill gently pulses.

3. **Meal timeline** — Vertical timeline. Time labels left ("8:20a", "12:45p"), glass cards right with meal name + calories. Recipe thumbnail as tiny circle if known recipe. **Swipe right to re-log** — card glows rose, "Logged again" inline. No modal.

4. **Contextual ghost prompt** — Floating glass input bar at bottom. Ghost text changes with time/patterns. 7am: "Overnight oats again?" Tap to open Log Sheet.

**The Log Sheet** (half-sheet, spring animation):
- Single multiline text field. Type naturally: "chicken shawarma bowl with extra rice"
- AI resolves real-time — preview card appears below input
- Quick actions: Camera, Barcode, Voice
- Favorites row — horizontal scroll of most-logged items as chips
- Matches YOUR recipe? Shows "From your cookbook"

#### Tab 2: Cookbook

Personal recipe collection built from how you eat.

- Search bar — glass pill, searches your recipes AND discoverable ones
- **Masonry grid of glass cards** — recipe name, macro line, "cooked 12x" counter, provenance ("From Sarah"). Typographic by default, no photos unless added.
- **Long press to expand in-place** — card lifts and grows to show ingredients, "Cook & Log" button, share. Not a modal. Spring physics.
- **Cook & Log** — one tap logs the meal. Hold for cook-along checklist.
- **Discover section** — horizontal cards from followed people. Subtle gradient border (rose to violet) to differentiate.

#### Tab 3: Kitchen

Shared cooking space for couples/roommates/families. Not a social network.

- **Kitchen header** — name + overlapping member avatars
- **This Week** — horizontal day-strip with planned meals as stacked cards per day
- **Shared Cookbook** — masonry grid with contributor avatars
- **Grocery List** — auto-compiled from planned meals, grouped by category, checkable, real-time shared
- **Activity** — quiet minimal list. "Sarah added Miso Salmon · 2h ago". No likes, no comments. Like git log, not Instagram.

**Sharing:** Recipe links open beautiful card previews in iMessage/WhatsApp. Non-Savoro users see web preview. Savoro users tap "Save to Cookbook" with provenance chain.

#### Profile/Goals (sheet from top-right avatar, not a tab)

- Editable daily targets inline
- **Quiet consistency** — calendar dot grid, rose dot per logged day. No streaks, no flames.
- Weekly sparkline charts per macro
- Settings

### Unique Patterns

1. **Pull-to-log** — pull down on Today, log sheet rises to meet your thumb
2. **Swipe vocabulary** — right = re-log/cook, left = delete. Consistent everywhere.
3. **2-second log** — open → pull → tap favorite → done
4. **Ambient macro awareness** — macro pills subtly tint the screen's background glow
5. **Recipe cards as universal unit** — logged meal = card, recipe = card, shared item = card. One model.
6. **No empty states** — ghost cards guide you. Never feels empty.
7. **Haptic language** — light tap for selections, medium for confirmations, tick for swipe thresholds

### Visual References

- Apple Health (clean data, system integration)
- Arc Browser (glass, spatial UI, spring physics)
- Linear (speed, efficiency, no decoration)
- Aesop website (warm minimalism, typographic confidence, luxury restraint)

---

## Dylan's Notes on v1

> The chat-first AI approach is the core — not a Today screen with a log sheet. The agent IS the input. Gen UI means the agent renders rich interactive components inline in conversation. Barcode scanning happens as a chat attachment ("I ate 200g of this" + photo). Recipe building is conversational. Forms exist but are surfaced BY the agent when appropriate, not as standalone screens.

> The Today snapshot (macros, calories remaining) must be instantly visible — but it needs to coexist with the chat-first model. Explore how these two things share space.
