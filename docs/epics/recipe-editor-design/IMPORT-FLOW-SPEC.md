# RC-2 — Video import flow UX specification

**Status:** Design proposal for Dylan's gate

**Implements:** RC-8 Share Extension, RC-9 New recipe from video, RC-10 paste-a-link fallback

**References:** `../recipe-creation.md`, `CRITICAL-REVIEW.md`, `editor.png`, `REDUCTION-SPEC.md`, `../../ideas/video-first-recipe-creation.md`

This document specifies the public-platform URL journey. A shared local video file may use the same Share Extension card, but its in-app attach and playback path belongs to RC-11. It must not be sent through the public-link or caption-drafting endpoints.

## 1. Fixed product and legal boundaries

1. **Share is the flagship door.** The Share Extension asks for one decision: create a recipe in Savoro. It does not become a miniature editor.
2. **Paste is quiet and secondary.** It sits below “Start from scratch” as a plain text affordance.
3. **The app resolves the authoritative source.** Extension metadata is provisional. The app resolves the URL through the public oEmbed pipeline, then requests a draft from caption/description/title text.
4. **Platform media is never re-hosted.** TikTok, Instagram, and YouTube media renders only through official oEmbed markup in a `WKWebView`. Savoro may show a public oEmbed thumbnail while that embed loads.
5. **Drafting is text-tier only.** No audio, transcript, frame, or visual analysis is implied or performed. Product copy calls this “the video’s text” or “the caption,” never “watching” the video.
6. **Credit stays attached.** The official embed is followed immediately by creator/platform attribution and an original-link action. The review banner never separates the video from its credit.
7. **A draft is a suggestion, not an authority.** Every machine-prefilled field starts with a visible review marker. Saving a draft remains available while markers are present.
8. **No late replacement.** The editor opens after the draft resolves, or after the user chooses to continue from the timeout state. A later response must never overwrite user input.

### Flow contract

```text
Share URL ──► Extension confirm ──► Resolve public oEmbed ──► Draft from text
                                                        │
Paste URL ──► Paste sheet ───────────────────────────────┘
                                                        │
                            ┌───────────────────────────┴──────────────┐
                            ▼                                          ▼
                   Full/partial draft                            Thin/no text
                            │                                          │
                            └────────► Prefilled guided editor ◄───────┘
                                                   │
                                           Save / publish flow
```

State names for implementation:

```text
confirming
→ resolvingLink
→ draftingText
→ ready(full | partial | thin)

resolvingLink → linkIssue(unsupported | unavailable)
draftingText → draftDelay
oEmbed with no caption → ready(noCaption), without a draft request
```

## 2. Shared visual language

Every surface uses the editor reference rather than platform styling:

- Warm cream page ground; ink primary text; muted ink secondary text.
- Blush is the informative accent for loading and draft-review states. It is not used as an alarm color.
- Full-width cards use the editor’s chunky rounded shape (about 20 pt), one consistent inset (16 pt), and the same vertical gap rhythm as `editor.png`.
- Large, friendly screen titles and small uppercase eyebrow labels match the editor.
- The imported editor keeps the soft/solid sticky bottom pairing: **Save draft** and **Save & publish**.
- Platform brand colors appear only inside official provider content. Savoro-owned platform icons remain quiet ink/muted ink.
- Dark mode maps through adaptive surface, text, border, and blush tokens; do not hard-code cream, white, or pink.
- Loading uses a soft shimmer or spinner. With Reduce Motion, use a static placeholder plus spinner.
- Issue states use calm cards and ordinary sentence case—no red wash, warning triangle, or oversized status art.

### Tappable-control counting convention

Numbered items in wireframes are tappable. An official embed counts as **one interactive region**, even though provider-owned controls render inside it. Native text editing menus and an iOS host-provided Share Extension close affordance are not Savoro page controls; both are called out separately where present. No screen below exceeds 12 Savoro-owned controls.

## 3. Share Extension confirm card (RC-8)

### 3.1 Immediate state

The extension presents its shell as soon as the shared item provider returns a URL representation. It does not wait for network metadata.

```text
╭──────────── iOS Share Extension ────────────╮
│                                    Close*   │
│                                            │
│  ╭──────────────────────────────────────╮  │
│  │  SAVORO                              │  │
│  │                                      │  │
│  │  ╭──────────────╮                    │  │
│  │  │  source icon │  TikTok video      │  │
│  │  │  or instant  │  Shared from       │  │
│  │  │  thumbnail   │  TikTok            │  │
│  │  ╰──────────────╯                    │  │
│  │                                      │  │
│  │  [1  Create recipe in Savoro       ] │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
╰────────────────────────────────────────────╯
* System-provided when the host displays one.
```

**Tappable controls:** 1 Savoro control; at most 2 including the iOS host close affordance.

Immediate content:

- Savoro eyebrow/wordmark.
- A fixed thumbnail slot. Use a thumbnail only when the source app supplied one immediately; otherwise show a quiet platform glyph or generic play glyph.
- A stable fallback title based on the URL host: **TikTok video**, **Instagram Reel**, **YouTube video**, or **Shared video**.
- A muted source line: **Shared from TikTok**, **Shared from Instagram**, or **Shared from YouTube**. Do not show the full URL.
- The one in-card action: **Create recipe in Savoro**.

Behavior:

- The action becomes enabled as soon as the URL is extracted and the handoff payload is staged. It does not wait for title, thumbnail, or creator details.
- While URL extraction is still in progress, keep the action in place, disabled, with a small spinner at its leading edge. Do not add a second status button.
- Tapping the action writes the handoff item, changes the same button to **Opening Savoro…**, prevents a second tap, and deep-links into import mode.
- System dismissal remains outside the confirm card. There is no Savoro-owned secondary action, edit link, platform picker, or paste field here.

### 3.2 Best-effort metadata resolved

Only metadata supplied by the shared item or its link-preview representation is used in the extension. Authoritative oEmbed resolution still happens in the app.

```text
╭──────────── iOS Share Extension ────────────╮
│                                    Close*   │
│                                            │
│  ╭──────────────────────────────────────╮  │
│  │  SAVORO                              │  │
│  │                                      │  │
│  │  ╭──────────────╮  Crispy potato     │  │
│  │  │  supplied    │  stacks            │  │
│  │  │  thumbnail   │  @mayaeats · TikTok│  │
│  │  ╰──────────────╯                    │  │
│  │                                      │  │
│  │  [1  Create recipe in Savoro       ] │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
╰────────────────────────────────────────────╯
```

**Tappable controls:** unchanged—1 Savoro control; at most 2 with host close.

Resolved content replaces the fallback in place:

- Thumbnail, when supplied.
- Public title, maximum two visual lines with tail truncation.
- Creator handle plus platform on one muted line, when supplied.
- The card dimensions and action position do not jump as metadata arrives.
- Missing metadata leaves the immediate fallback intact. No empty label or placeholder dash is shown.

### RC-8 handoff boundary

The handoff must preserve the original shared URL plus provisional title/thumbnail/platform only. It must not treat those provisional values as verified attribution and must not package downloaded platform media. Shared local files are staged through the App Group for RC-11 and do not enter the URL flow below.

## 4. App handoff and loading (RC-9)

Import mode opens as a full-screen cover over the app. On a warm launch it covers the presenting surface. On a cold launch, cancel returns to Cookbook.

### 4.1 Resolving the original

```text
╭────────────────────────────────────────────╮
│ [1 ×]                         New recipe   │
│                                            │
│  ╭──────────────────────────────────────╮  │
│  │                                      │  │
│  │       soft thumbnail/skeleton        │  │
│  │                                      │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
│  ╭──────────── blush status card ───────╮  │
│  │  ◌  Bringing in the video…           │  │
│  │     Getting the original and creator │  │
│  │     details.                         │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
╰────────────────────────────────────────────╯
```

**Tappable controls:** 1 (**Cancel import**).

Behavior:

- Show the provisional thumbnail from the handoff when available; otherwise use a cream raised skeleton. Do not render a custom video player.
- Begin authoritative `/v1/import/link` resolution immediately.
- The leading × has accessibility label **Cancel import**. It remains fixed and available throughout both loading phases.
- Cancel aborts active requests, clears the staged import item, and dismisses without a prompt because the user has not edited anything. A warm launch restores the presenting screen; a cold launch lands on Cookbook.
- Do not show a percentage, step count, rotating tips, or an estimated time.

### 4.2 Drafting from the video’s text (the usual 1–3 seconds)

Once oEmbed resolves, replace the skeleton with the official embed and reveal verified attribution. Keep the user on the same screen while the caption draft resolves.

```text
╭────────────────────────────────────────────╮
│ [1 ×]                         New recipe   │
│                                            │
│  ╭──────────────────────────────────────╮  │
│  │ [2  ▶ official platform embed      ] │  │
│  ╰──────────────────────────────────────╯  │
│  [3 @mayaeats · TikTok] [4 View original↗]│
│                                            │
│  ╭──────────── blush status card ───────╮  │
│  │  ◌  Making a recipe head start…      │  │
│  │     Using the caption and public     │  │
│  │     video details for a first draft. │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
│  TITLE                                     │
│  ╭──────────────────────────────────────╮  │
│  │         soft single-line shimmer     │  │
│  ╰──────────────────────────────────────╯  │
│  INGREDIENTS                               │
│  ───────── soft text shimmer ──────────    │
│  ───────────── soft text shimmer ─────     │
│                                            │
╰────────────────────────────────────────────╯
```

**Tappable controls:** 4 (cancel, embed region, creator link, original link).

Behavior:

- Exact loading copy is shown above. Product UI never names the model or suggests that Savoro listened to or viewed the media.
- The embed may be played while drafting. It never autoplays.
- `@handle` opens `creatorUrl`; **View original** opens the source `url`. Use the platform app through its universal link when iOS allows it, otherwise the browser.
- If `creatorUrl` is absent, render the creator label as static text; the count drops to 3. If the handle is absent, show **Original creator · {Platform}**.
- Skeleton lines reserve the editor’s title/list rhythm; they are not editable and do not expose keyboard focus.
- On draft completion, morph this same scroll view into the imported editor. Keep the embed and attribution in place so there is no second push, blank flash, or scroll jump.
- Announce **Recipe draft ready** once to VoiceOver when editable fields appear.

## 5. New recipe from video screen (RC-9)

### 5.1 Full or partial draft

```text
╭────────────────────────────────────────────╮
│ [1 ‹]                         New recipe   │
│                                            │
│  New recipe                                │
│                                            │
│  ╭──────────────────────────────────────╮  │
│  │ [2  ▶ official platform embed      ] │  │
│  ╰──────────────────────────────────────╯  │
│  [3 @mayaeats · TikTok] [4 View original↗]│
│                                            │
│  ╭──────────── blush review card ───────╮  │
│  │  Drafted from the caption            │  │
│  │  We used the caption and public      │  │
│  │  video title for a head start. Give  │  │
│  │  each highlighted field a quick check.│ │
│  ╰──────────────────────────────────────╯  │
│                                            │
│  TITLE                 DRAFTED · CHECK     │
│  ╭──────────────────────────────────────╮  │
│  │ [5 Crispy garlic potato stacks     ] │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
│  DESCRIPTION          DRAFTED · CHECK     │
│  ╭──────────────────────────────────────╮  │
│  │ [6 Golden potato stacks with…      ] │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
│  SERVINGS                    [7 −] 4 [8 +]│
│                                            │
│  INGREDIENTS            DRAFTED · CHECK   │
│  4 medium potatoes                         │
│  2 tbsp olive oil                          │
│  3 cloves garlic                           │
│  [9 Review or add ingredients…           ]│
│                                            │
│  STEPS                  DRAFTED · CHECK   │
│  1  Slice the potatoes thinly.             │
│  2  Stack with oil and garlic.             │
│  [10 Review or add a step…                ]│
│                                            │
├──────────── sticky bottom bar ─────────────┤
│ [11 Save draft]       [12 Save & publish] │
╰────────────────────────────────────────────╯
```

**Tappable controls:** 12 maximum in the default imported-editor page.

Control-budget rules:

- The imported video replaces the normal photo-slot control; it does not sit beside a second photo picker.
- The opening page has one ingredient-section editor/composer and one step-section editor/composer. Prefilled rows are calm rendered content here; row-level fixes live in the RC-1-approved focused editor/sheet rather than adding controls to this page.
- Draft markers and the review banner are informative, not tappable.
- If there is no drafted description, control 6 is the existing quiet **Add description** affordance.
- Provider-owned controls inside the embed count as one region for Savoro’s page budget.

#### Embed player card

- Full content width, chunky rounded outer card, clipped to the provider’s official embed surface.
- YouTube uses its official 16:9 presentation. Portrait providers use the official aspect ratio, capped at 420 pt high so the attribution and review message remain reachable with one scroll gesture. Do not crop provider content.
- Show the public oEmbed thumbnail until `WKWebView` is ready. No autoplay and no custom playback controls over the provider embed.
- If the embed itself cannot render after oEmbed succeeded, the card says **Video preview unavailable. Open the original below.** The attribution link-out remains the recovery path; no extra card button is added.

#### Attribution row

- Immediately below the embed, before any Savoro draft content.
- Left: platform icon, creator handle, and platform name. Right: **View original ↗**.
- `@handle` links to `creatorUrl`; **View original** links to the shared source URL. External navigation never opens a copied or reconstructed media URL.
- Long handles use middle truncation on screen; VoiceOver reads the full handle and platform.
- Accessibility labels: **Open @mayaeats on TikTok** and **View original video on TikTok**.

#### Review banner: exact copy proposal

> **Drafted from the caption**
>
> We used the caption and public video title for a head start. Give each highlighted field a quick check.

Here, “caption” includes the public caption/description text returned by oEmbed. The banner must not claim analysis of sound or images.

#### Draft review marking

Apply review state only to non-empty machine-prefilled values:

| State | Label | Surface treatment | Transition |
|---|---|---|---|
| Needs review | `DRAFTED · CHECK` | Very soft blush fill or blush border; blush eyebrow label | Remains until the user deliberately activates and exits that field/section, or changes its value |
| User-confirmed | `CHECKED ✓` | Standard cream/card surface; quiet ink check label | Set on a committed edit, or after the user opens and closes the existing field/section editor even when the value is unchanged |
| Added by user | No status label | Standard editor treatment | Content entered into an initially empty field never receives a draft marker |

Additional behavior:

- VoiceOver focus by itself does not confirm a field; the user must activate it.
- For ingredients and steps, opening then closing the existing focused section editor confirms that section. Editing any item also confirms the section.
- Once every drafted field is checked, the blush banner condenses to a noninteractive, one-line cream card: **✓ Draft checked**.
- Review state is presentation state, not public provenance and not a new API contract field. Keep it with the local draft when local draft storage is available.
- **Save draft** is always available. Pending markers are cues, not a blocking modal. The later RC-21 publish checklist may offer jump-to-field help.
- Draft ingredients arrive unlinked. Do not show nutrition values until existing food-linking behavior supplies them; never add drafted nutrition values.

### 5.2 Thin-caption state

Use this state whenever the draft response has `confidence: thin`, including a mostly empty title/ingredients/steps result. It replaces the standard review banner; it is not stacked with it.

```text
╭────────────────────────────────────────────╮
│ [1 ‹]                         New recipe   │
│                                            │
│  New recipe                                │
│  ╭──────────────────────────────────────╮  │
│  │ [2  ▶ official platform embed      ] │  │
│  ╰──────────────────────────────────────╯  │
│  [3 @mayaeats · TikTok] [4 View original↗]│
│                                            │
│  ╭──────────── soft blush card ─────────╮  │
│  │  A little head start                 │  │
│  │  The caption only had a few recipe   │  │
│  │  details. We added what was there—   │  │
│  │  fill in the rest in your own words. │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
│  TITLE                 DRAFTED · CHECK     │
│  ╭──────────────────────────────────────╮  │
│  │ [5 Crispy potato stacks            ] │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
│  [6 Add description]                       │
│                                            │
│  SERVINGS                    [7 −] 2 [8 +]│
│                                            │
│  INGREDIENTS                                │
│  Add the ingredients you know.              │
│  [9 Add ingredients…                       ]│
│                                            │
│  STEPS                                      │
│  Add steps if they help—the video stays     │
│  with the recipe.                           │
│  [10 Add a step…                           ]│
│                                            │
├──────────── sticky bottom bar ─────────────┤
│ [11 Save draft]       [12 Save & publish] │
╰────────────────────────────────────────────╯
```

**Tappable controls:** 12 maximum; fewer when creator or optional field actions are absent.

Exact thin-state copy:

> **A little head start**
>
> The caption only had a few recipe details. We added what was there—fill in the rest in your own words.

Thin-state behavior:

- Preserve every useful returned value and mark only those populated fields `DRAFTED · CHECK`.
- Empty fields use the standard cream treatment and friendly placeholders, never blush skeletons or issue styling.
- Do not show a retry action merely because the draft is thin. The video plus any returned text is the intended starting point.
- Steps remain optional while the video is attached. The exact empty helper is: **Add steps if they help—the video stays with the recipe.**
- Do not use a score, confidence label, empty-state illustration, or technical explanation.

### 5.3 Video without a caption

This is a normal creation state, not a link issue. Once oEmbed reports no caption/description text, skip the draft request and open the editor directly.

```text
╭────────────────────────────────────────────╮
│ [1 ‹]                         New recipe   │
│  New recipe                                │
│                                            │
│  ╭──────────────────────────────────────╮  │
│  │ [2  ▶ official platform embed      ] │  │
│  ╰──────────────────────────────────────╯  │
│  [3 @mayaeats · TikTok] [4 View original↗]│
│                                            │
│  ╭──────────── soft blush card ─────────╮  │
│  │  Start with the video                │  │
│  │  There wasn’t a caption with recipe  │  │
│  │  details. Keep the video here while  │  │
│  │  you add the recipe in your own words.│ │
│  ╰──────────────────────────────────────╯  │
│                                            │
│  TITLE                                     │
│  ╭──────────────────────────────────────╮  │
│  │ [5 e.g. Spicy Tofu Rice Bowl       ] │  │
│  ╰──────────────────────────────────────╯  │
│  [6 Add description]                       │
│  SERVINGS                    [7 −] 2 [8 +]│
│  INGREDIENTS  [9 Add ingredients…]         │
│  STEPS        [10 Add a step…]             │
│                                            │
├──────────── sticky bottom bar ─────────────┤
│ [11 Save draft]       [12 Save & publish] │
╰────────────────────────────────────────────╯
```

**Tappable controls:** 12 maximum.

Exact no-caption copy:

> **Start with the video**
>
> There wasn’t a caption with recipe details. Keep the video here while you add the recipe in your own words.

If oEmbed supplies a useful public title and the app prefills it, mark that title `DRAFTED · CHECK`. Do not manufacture ingredients or steps from the title alone.

## 6. Paste-a-link fallback (RC-10)

### 6.1 Placement on the create entry point

Place the fallback directly below the primary scratch action. It is a plain text button with no card, icon, badge, filled background, or promotional explanation.

```text
╭────────────────────────────────────────────╮
│ [1 ×]                                      │
│                                            │
│  New recipe                                │
│  Start with an idea of your own, or bring  │
│  a video link.                             │
│                                            │
│  [2          Start from scratch          ] │
│                                            │
│              [3 Have a link?]              │
│                                            │
╰────────────────────────────────────────────╯
```

**Tappable controls:** 3 (dismiss, primary scratch action, quiet link action).

Placement rules:

- **Have a link?** sits 8–12 pt below **Start from scratch**, centered.
- Use a text-button weight and muted ink/blush text, not the solid primary style.
- Do not add “Import,” a platform list, or a Share Extension tutorial to this entry point.
- Scratch remains first-class. Tapping it opens the regular new-recipe editor unchanged.

### 6.2 Paste sheet

```text
╭────────────── rounded half-sheet ──────────╮
│ [1 ×]                                      │
│                                            │
│  Paste a video link                        │
│                                            │
│  ╭──────────────────────────────────────╮  │
│  │ [2 TikTok, Instagram, or YouTube link]│ │
│  ╰──────────────────────────────────────╯  │
│  Use a public video link.                  │
│                                            │
│  [3               Continue              ] │
│                                            │
╰────────────────────────────────────────────╯
```

**Tappable controls:** 3 (dismiss, URL field, Continue).

Behavior:

- Focus the URL field and show the URL keyboard when the sheet opens.
- Do not read the clipboard automatically and do not add a custom Paste button; the native edit menu is enough.
- **Continue** is disabled for empty input. On submit, trim surrounding whitespace and perform basic URL-shape validation only.
- Inline malformed-link copy: **That link doesn’t look quite right. Check it and try again.**
- A shape-valid URL enters the exact same `resolvingLink` coordinator and screens as a Share Extension handoff. RC-10 must not create a second resolver or editor variant.

## 7. Calm issue states

All link issues appear in the app, not inside the Share Extension. Keep the navigation cancel available and preserve the warm editor shell.

### 7.1 Unsupported platform

```text
╭────────────────────────────────────────────╮
│ [1 ×]                         New recipe   │
│                                            │
│  ╭──────────── rounded cream card ──────╮  │
│  │  link icon                           │  │
│  │                                      │  │
│  │  This link isn’t ready for Savoro yet│  │
│  │  Try a public TikTok, Instagram Reel,│  │
│  │  or YouTube video.                   │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
├──────────── sticky bottom bar ─────────────┤
│ [2 Try another link] [3 Start from scratch]│
╰────────────────────────────────────────────╯
```

**Tappable controls:** 3.

Exact copy:

> **This link isn’t ready for Savoro yet**
>
> Try a public TikTok, Instagram Reel, or YouTube video.

Map `unsupported_platform` here. **Try another link** opens the paste sheet with its field selected. **Start from scratch** dismisses import mode and opens the regular editor with no video fields.

### 7.2 Private or unavailable link

```text
╭────────────────────────────────────────────╮
│ [1 ×]                         New recipe   │
│                                            │
│  ╭──────────── rounded cream card ──────╮  │
│  │  video-link icon                     │  │
│  │                                      │  │
│  │  We couldn’t open this video         │  │
│  │  It may be private, no longer        │  │
│  │  available, or the link may have     │  │
│  │  changed.                            │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
├──────────── sticky bottom bar ─────────────┤
│ [2 Try another link] [3 Start from scratch]│
╰────────────────────────────────────────────╯
```

**Tappable controls:** 3.

Exact copy:

> **We couldn’t open this video**
>
> It may be private, no longer available, or the link may have changed.

Map both `private_content` and non-network `unreachable` here. Do not keep a stale creator handle or thumbnail on this screen. Actions match the unsupported-platform state.

### 7.3 Draft request timeout

A timeout after oEmbed resolution keeps the verified video and attribution visible. It does not turn into a link issue.

```text
╭────────────────────────────────────────────╮
│ [1 ×]                         New recipe   │
│                                            │
│  ╭──────────────────────────────────────╮  │
│  │ [2  ▶ official platform embed      ] │  │
│  ╰──────────────────────────────────────╯  │
│  [3 @mayaeats · TikTok] [4 View original↗]│
│                                            │
│  ╭──────────── soft blush card ─────────╮  │
│  │  Your video is ready                 │  │
│  │  The recipe head start is taking     │  │
│  │  longer than usual. Try once more,   │  │
│  │  or start with the video.            │  │
│  ╰──────────────────────────────────────╯  │
│                                            │
├──────────── sticky bottom bar ─────────────┤
│ [5 Try once more]      [6 Start recipe]   │
╰────────────────────────────────────────────╯
```

**Tappable controls:** 6 maximum; 5 when `creatorUrl` is absent.

Exact copy:

> **Your video is ready**
>
> The recipe head start is taking longer than usual. Try once more, or start with the video.

Behavior:

- **Try once more** makes one new draft request and returns to the drafting state. It does not re-resolve oEmbed.
- **Start recipe** opens the empty guided editor with video and attribution preserved, using the **Start with the video** banner.
- Disable both bottom actions while the retry is active; keep cancel available.
- If the one retry also times out, return to this card with **Start recipe** as the only bottom action.
- Ignore any response from the timed-out request after the user starts editing.

## 8. Edge behavior

Long and non-English source text reuse the same editor rather than creating another branch:

```text
╭──────────── imported editor ───────────────╮
│ [1–4 back · embed · credit · original]     │
│                                            │
│  Drafted from the caption                  │
│                                            │
│  TITLE                 DRAFTED · CHECK     │
│  [5 full value; visual fit does not alter it]│
│  [6 description]   SERVINGS [7 −] 4 [8 +] │
│                                            │
│  INGREDIENTS                                │
│  · structured draft in the source language │
│  [9 Review or add ingredients…]            │
│                                            │
│  STEPS                                      │
│  · structured draft in the source language │
│  [10 Review or add a step…]                │
│                                            │
├──────────── sticky bottom bar ─────────────┤
│ [11 Save draft]       [12 Save & publish] │
╰────────────────────────────────────────────╯
```

**Tappable controls:** the same 12-control maximum as §5; edge handling adds no actions, translation prompt, or caption viewer.

### Very long captions

- The raw caption is not shown on the editor page, so it cannot crowd the video, attribution, or fields.
- RC-6 owns model input limits. RC-9 renders the structured response it receives and never exposes token or truncation language.
- Long returned ingredient/step lists remain scrollable inside the approved focused section editor. The opening page keeps one section-level edit/composer control and does not add a button per imported row.
- Extension titles use two-line tail truncation; attribution handles use single-line middle truncation. Underlying values and accessibility labels remain complete.
- A long drafted title keeps its full value in the one-line title field and uses normal horizontal caret scrolling; do not alter stored text merely to fit the card.

### Non-English captions

- Multilingual drafting quality and translation controls are outside RC-2/RC-9.
- For this slice, preserve the language returned by the draft endpoint. Do not silently translate, add a language picker, or show a warning solely because the caption is not English.
- Savoro interface copy follows the app locale; imported recipe content follows the source/draft language.

### Videos without captions

- Treat blank caption/description text as `ready(noCaption)`, not a link issue.
- Skip the draft request, keep the official embed and attribution, and use the no-caption screen and exact copy in §5.3.
- Public source title may prefill the title with `DRAFTED · CHECK`; it must not be expanded into invented ingredients or steps.

### Missing or oversized attribution

- Missing creator handle falls back to **Original creator · {Platform}**.
- Missing `creatorUrl` makes the creator label static while **View original** remains available.
- Attribution always stays directly under the embed and is never folded into a menu.

## 9. Accessibility and interaction details

- Minimum touch target: 44 × 44 pt for Savoro controls.
- VoiceOver order follows the visual order: cancel/back, embed, creator, original link, review message, fields/sections, sticky actions.
- Loading status changes are polite announcements. Do not repeatedly announce shimmer changes.
- Review pills are included in field labels: for example, **Title, drafted, check** and **Title, checked**.
- The official embed receives a concise label before its provider controls: **Video from @mayaeats on TikTok**.
- At large Dynamic Type, cards grow vertically, attribution may wrap to two rows, and sticky actions remain at least 44 pt high. Copy is never clipped.
- Keyboard focus must not hide the active title/composer behind the sticky bottom bar.

## 10. RC-8/RC-9/RC-10 implementation ownership

| Ticket | Owns | Reuses / must not duplicate |
|---|---|---|
| RC-8 | Immediate/resolved Share Extension card, one-action handoff, staged payload, deep link | Does not resolve authoritative oEmbed or draft caption text in the extension |
| RC-9 | Import coordinator, both handoff loading phases, official embed, attribution, review/thin/no-caption states, three issue outcomes | Reuses the approved guided editor and the existing sticky save/publish bar |
| RC-10 | Quiet **Have a link?** placement, paste sheet, basic URL-shape validation | Routes into RC-9’s coordinator; no separate import screen or network path |

## 11. Required visual evidence for frontend tickets

Capture at minimum:

1. Share Extension immediate fallback and metadata-resolved card.
2. App `resolvingLink` and `draftingText` states.
3. Full/partial imported editor with at least two drafted section markers.
4. One field before and after its `DRAFTED · CHECK` → `CHECKED ✓` transition.
5. Thin-caption editor.
6. No-caption editor.
7. Create entry point and focused paste sheet.
8. Unsupported, unavailable, and draft-delay states.

For app surfaces, record the project’s four snapshot modes when the relevant ticket requires snapshots. Build/parse evidence alone does not establish visual match to `editor.png`.

## 12. Product-owner confirmations

These are not blockers for RC-8/RC-9/RC-10 if the recommended defaults above are accepted:

1. **Separate attribution destinations:** this spec makes `@handle` open the creator profile and **View original** open the source video. Confirm that both destinations should remain, rather than making the entire row one original-video link.
2. **Cold-launch cancel destination:** this spec lands on Cookbook after canceling an import that cold-launched the app. Confirm Cookbook rather than Today.
3. **Source-language behavior:** this spec preserves non-English recipe content without translation. A later localization decision can add translation as a separate feature.
4. **Shared local files:** this spec limits RC-8 to staging/handoff for local video files and leaves their in-app attach experience to RC-11. Confirm that sequencing for the Photos share path.
