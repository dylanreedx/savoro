# Savoro iOS UI/UX Mapping

Source artifact: `.pi/agent-runs/ux-scout-20260610T021049Z-0095ea/final.md`

## Purpose

Map the current native SwiftUI MVP under `SavoroIOS/` against the Claude/prototype design reference, with emphasis on what is implemented, what is scaffold-only, what diverges visually/behaviorally, and what needs manual QA before claiming UX success.

## Sources inspected

Native:
- `SavoroIOS/Savoro/App/SavoroApp.swift`
- `SavoroIOS/Savoro/App/RootPlaceholderView.swift`
- `SavoroIOS/Savoro/Features/Today/TodayPlaceholderView.swift`
- `SavoroIOS/Savoro/Features/Logging/LoggingPlaceholderView.swift`
- `SavoroIOS/Savoro/Features/Logging/LogPickerPlaceholderView.swift`
- `SavoroIOS/Savoro/Features/RecipeDetail/RecipeDetailPlaceholderView.swift`
- `SavoroIOS/Savoro/Features/Cookbook/CookbookPlaceholderView.swift`
- `SavoroIOS/Savoro/Features/RecipeEditor/RecipeEditorPlaceholderView.swift`
- `SavoroIOS/Savoro/Features/{Discover,Community,Profile}/*PlaceholderView.swift`
- `SavoroIOS/Savoro/DesignSystem/*`

Prototype/design:
- `savoro-mvp/project/app/App.jsx`
- `savoro-mvp/project/app/screens-today.jsx`
- `savoro-mvp/project/app/sheets.jsx`
- `savoro-mvp/project/app/screens-recipe.jsx`
- `savoro-mvp/project/app/screens-cookbook.jsx`
- `savoro-mvp/project/app/screens-discover.jsx`
- `savoro-mvp/project/app/screens-profile.jsx`
- `savoro-mvp/project/app/kit.jsx`
- `savoro-mvp/project/Savoro.html`
- `Savoro MVP/Savoro.html`
- `savoro-mvp/project/_ds/**`

## Product loop summary

Prototype loop: discover/save recipe → view recipe detail → log privately or fork/remix → cookbook/profile/community surfaces show recipe context only.

Native status: shell plus several functional mock flows exist, especially Today, logging, recipe detail, cookbook, and editor. Discover, Community, and Profile are still placeholders. Many native flows are intentionally more scaffold/copy-heavy than the prototype and need visual QA.

## Screen inventory / matrix

| Screen/flow | Native file(s) | Implemented native behavior | Prototype/design reference | Main gaps/divergences | Privacy/shaming risk | Manual QA needed | Related backlog |
|---|---|---|---|---|---|---|---|
| App shell / 5-tab IA | `App/SavoroApp.swift`, `App/RootPlaceholderView.swift` | Native `TabView` with Today, Cookbook, Discover, Community, Profile; per-tab `NavigationStack`; centralized sheet/toast routes. | `app/App.jsx` fixed iOS stage, custom `TabBar`, slide layers, sheet/toast host. | Native keeps 5-tab IA but lacks custom tab styling/transitions/device-frame polish. Need verify tab bar/sticky bar overlap. | Low; shell copy guards private logs. | Launch/fullscreen, safe areas, tab labels, sheet detents, toast placement, Dynamic Type. | `SAV-11`, `SAV-28` |
| Today dashboard | `Features/Today/TodayPlaceholderView.swift` | Greeting, privacy card, calorie ring, macro progress, quick actions, recent log-again rail, meal sections. | `screens-today.jsx` variants with compact header, quick actions, meal timeline, recent rail. | Native is more privacy/scaffold copy-heavy; lacks prototype header trailing actions and visual meal timeline styling. | Mild tone review: “A little past your target today.” | Ring/bar sizing, rails, bottom scroll vs tab bar, VoiceOver private goal data. | `SAV-13`, `SAV-27`, `SAV-28` |
| Logging / Log Recipe sheet | `Features/Logging/LoggingPlaceholderView.swift`, `App/RootPlaceholderView.swift` | Recipe identity, servings +/- 0.5, meal segmented control, prev/next date, macro preview, privacy card, async mock confirm updates Today/toast. | `sheets.jsx` compact bottom sheet with thumbnail, serving presets, meal segmented, Today row, “Adds to today”, lock copy. | Native adds provenance/version/mock notices; lacks serving preset pills and compact thumbnail-first density. | Low; private/in-memory/no-backend copy is strong. | Sheet height, dismiss during submit, toast after dismiss, Dynamic Type button wrapping. | `SAV-14`, `SAV-27`, `SAV-28` |
| Log picker/search sheet | `Features/Logging/LogPickerPlaceholderView.swift`, `App/RootPlaceholderView.swift` | Search local Recent/Saved/Mine; no-results/error states; recipe selection opens Log Recipe; food selection toasts scaffold. | `sheets.jsx` simple “Log a recipe” sheet and cookbook recipe rows. | Native broader than prototype with foods/sections/source chips; need decide MVP scope. | Low; marks private/no backend. | Empty/error states, close behavior, meal handoff, row VoiceOver/tap targets. | `SAV-15`, `SAV-27`, `SAV-28` |
| Recipe detail | `Features/RecipeDetail/RecipeDetailPlaceholderView.swift` | Public/private states, hero, creator/trust row, serving macros, ingredients/instructions, recipe social context, sticky Save/Fork/Log/Share/Edit actions. | `screens-recipe.jsx` premium hero, transparent nav, sticky compact Save/Fork/primary Log bar, macro card, social context. | Native covers content but action bar is text-heavy, no transparent nav parity, route debug card visible, sticky bar may overlap safe areas. | Good; public social context avoids private logs. | Sticky safe area, tab hidden on push, long titles, macro wrapping, action VoiceOver order. | `SAV-16`, `SAV-20`, `SAV-24`, `SAV-27`, `SAV-28` |
| Cookbook library | `Features/Cookbook/CookbookPlaceholderView.swift` | Mine/Saved/Drafts segments, create CTA/toolbar plus, search/filter, notice card, 2-col grid, local saved store, opens detail/editor. | `screens-cookbook.jsx` segments, create card, count/collections, visual food cards with gradients/badges. | Native lacks food-gradient card visual richness and count/collections header; adds scaffold notices and filters. | Low; separates drafts/private/public details. | 2-col grid on small phones, Dynamic Type, toolbar plus discoverability, empty/no-results. | `SAV-17`, `SAV-27`, `SAV-28` |
| Recipe editor | `Features/RecipeEditor/RecipeEditorPlaceholderView.swift` | Local-only form: photo placeholder, basics, ingredient rows/free text/mock foods, macro preview, instruction add/remove/reorder, validation preview; no save/publish yet. | `screens-cookbook.jsx` editor with photo slot, title, serving stepper, live macro preview, ingredient search/add, instruction textareas, sticky Save draft / Save & publish, publish sheet. | Biggest built-feature gap: no sticky save/publish bar, no draft save route, no publish sheet, no inline ingredient search UI, less compact layout. | Low; copy explicitly local/no upload/no save. Missing save may confuse users. | Keyboard avoidance, text fields at large text, future sticky save bar, validation tone, reorder VoiceOver. | `SAV-18`, `SAV-19`, `SAV-27`, `SAV-28`; next child `SAV-72` |
| Discover placeholder | `Features/Discover/DiscoverPlaceholderView.swift` | Static placeholder with title/subtitle/foundation notes; no feed/search/cards. | `screens-discover.jsx` search, filter chips, rails/grid/feed variants, featured hero, communities rail, friends feed, community detail. | Placeholder only; recipe discovery loop is absent natively. | Low; placeholder guards private logs/goals/adherence. | Placeholder fit; later feed card privacy/search/empty/error. | `SAV-21`, `SAV-23`, `SAV-27`, `SAV-28` |
| Community placeholder | `Features/Community/CommunityPlaceholderView.swift`, route placeholder for community detail | Static Community tab; route placeholder for community detail. | `screens-discover.jsx` has community cards/detail; prototype `App.jsx` mainly routes community through Discover, while native has dedicated tab. | Need product decision for dedicated MVP Community tab content. No joined communities/invitations/activity yet. | Low; placeholder avoids food logs/calorie totals/goals/streaks. | Future public/community privacy; placeholder copy; 5-tab presence. | `SAV-22`, `SAV-23`, `SAV-28` |
| Profile placeholder | `Features/Profile/ProfilePlaceholderView.swift`, route placeholder for public profile | Static own-profile placeholder; public profile route placeholder. | `screens-profile.jsx` own profile, recipe/collection stats, public recipes/collections, settings, Daily goals private row, public profile with follow/message. | Placeholder only; no settings/profile/public profile parity. | Native safe. Future must preserve own vs public separation. | Own vs public data separation, settings rows, stats VoiceOver, follow/share toasts. | `SAV-25`, `SAV-26`, `SAV-28` |

## Design system parity gaps

Native has primitives in:
- `DesignSystem/SavoroPrimitives.swift`
- `DesignSystem/SavoroColor.swift`
- `DesignSystem/SavoroDesignSystemGallery.swift`

Prototype primitives in `app/kit.jsx` include custom pressables, icon buttons, avatars, chips, segmented controls, section titles, trust badges, recipe rows/cards, custom screen/detail containers, tab bar, sheet/toast host.

Key parity gaps:
- Prototype is warmer, more food/image/gradient-forward.
- Native is more scaffold/copy-heavy.
- Prototype relies heavily on compact iOS bars and sticky bottom action bars.
- Native standard `TabView`/`NavigationStack` is acceptable MVP foundation but needs safe-area/overlap QA.

## Manual validation checklist

- Launch/fullscreen: app fills device, no black margins, no clipped safe areas.
- 5 tabs: Today, Cookbook, Discover, Community, Profile order/icons/labels.
- Scroll + tab bar: last content reachable on Today/Cookbook; sticky recipe action bar does not collide with tab/home indicator.
- Sheets: Log Picker → Recipe → Confirm; dismiss behavior; sheet heights; toast after dismissal.
- Sticky bars: Recipe detail actions usable with Dynamic Type and VoiceOver.
- Dynamic Type: Large and Accessibility sizes for cards, grids, segmented controls, macro stats, action buttons.
- VoiceOver: tab labels, row/button hints, combined cards, recipe detail actions, editor reorder controls.
- Privacy: Discover/Community/Profile/public recipe surfaces never show daily logs, goals, adherence/progress, body metrics, or food-log payloads.
- Tone: review “over target/over plan” style copy; avoid adherence/compliance/failure language.
- Visual parity: compare food-first card density, gradients, compact headers/actions, bottom bars, prototype sheet layout.

## Main takeaways

1. Native MVP has solid mock foundations for Today, logging, recipe detail, cookbook, and editor.
2. The largest built-feature gap is `RecipeEditor`: save/publish UX is intentionally missing and maps directly to `SAV-72`/`SAV-19`.
3. The largest whole-product gaps are Discover, Community, and Profile, which are placeholders despite being key MVP tabs.
4. Visual parity is not proven by tests. Manual simulator review is required before claiming UX quality.
5. Privacy guardrails are currently strong, but future public/social/community DTOs must remain recipe-only and never expose private logs/goals/body metrics.
