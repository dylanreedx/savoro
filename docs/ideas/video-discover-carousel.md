# Idea: Video-first discovery carousel

Status: **exploration / not scheduled** — captured 2026-07-01. Needs product + cost
decisions (below) before it becomes track work. Tracked as SAV backlog issue (untracked
label on purpose — do not let a track session claim it until the open questions resolve).

## Reference (what sparked it)

DoorDash's home feed has an **"Explore Local Favourites — the latest from local
restaurants"** section: a horizontally-scrolling carousel of large **video** cards.
Observed from three screenshots:

- Section header: bold title + one-line subtitle + a circular "see all" (→) button, top-right.
- Cards are large, media-first (roughly square/4:3), video autoplaying muted in place;
  the next card peeks at the right edge to signal horizontal scroll.
- Below each card's media: name (truncated, e.g. "Cheecho's San…"), a **save/heart** icon,
  a rating line ("4.5 ★ (50+) · 30 min"), and a supporting line ("$0 delivery fee over $15").
- Optional badge pill under a card, e.g. "⭐ Customer favourite ›".

The video is the hook — it's food footage that makes the card feel alive versus a static image.

## Savoro adaptation

Same *shape*, different *content*: cards are **recipes**, not restaurants, surfaced in the
**Discover** tab (the SAV-21 domain, alongside the existing `GET /v1/discover/recipes` rails).

Field mapping (DoorDash → Savoro):

| DoorDash card | Savoro card |
|---|---|
| Restaurant video | Recipe video (short cooking/plating clip) |
| Restaurant name | Recipe title |
| Heart / save | Save recipe (existing `POST /v1/recipes/:id/save`) |
| Rating ★ (count) | Recipe rating / likes (reactions are currently deferred — see contract) |
| "30 min" | Cook time (`RecipeVersion.cookTimeMinutes`) |
| "$0 delivery fee…" | Per-serving macros (e.g. "520 cal · 38g protein") |
| "Customer favourite" | "Community favourite" / editorial badge |

It becomes a new **rail variant** of Discover: `GET /v1/discover/recipes?rail=video`
returning recipe summaries that carry video media. Existing invariant holds — only
`visibility=public` + `status=published` recipes appear.

## The big open question: where do the videos come from?

The user's instinct: **source from social media, not merchant/creator uploads** (DoorDash's
model is store owners uploading). Options, each with real tradeoffs:

1. **Embed social clips (TikTok / Instagram Reels / YouTube Shorts).**
   - Pro: no video storage or egress cost (plays from the platform) — fits near-$0.
   - Con: platform ToS/embedding rules, unstable embed players, attribution requirements,
     autoplay-muted-in-carousel is often not supported by third-party embeds, offline/poster
     fallback needed. Legally the riskiest; must confirm each platform's embed license.
2. **Creator uploads (our creators attach a clip when publishing a recipe).**
   - Pro: full control, clean rights, native autoplay.
   - Con: video hosting cost (R2 storage + egress) directly fights the near-$0 target;
     needs transcoding, moderation, size caps.
3. **Auto-generated / no video (poster image + Ken Burns).**
   - Pro: cheapest, zero new infra.
   - Con: loses the whole point (the liveliness that makes the section work).

Provisional lean: **(1) embed social where license permits, with (3) as the always-safe
fallback poster**, and revisit (2) only if we accept a video-hosting line item. But this is
explicitly unresolved.

## Decisions to make before scheduling

1. **Video source & rights** — which platforms, under what embed license, with what
   attribution. This gates everything else.
2. **Cost reconciliation** — video hosting vs embedding vs poster-only, measured against the
   near-$0 architecture (ADR 0001). If we ever host, R2 egress and a transcode pipeline are
   new cost/infra we deliberately excluded.
3. **Playback UX** — autoplay-muted-loop vs tap-to-play; cellular-data behavior; poster/
   thumbnail fallback; how many cards preload.
4. **Data model** — recipes need optional video media: provider (`tiktok|instagram|youtube|
   hosted`), external ref or URL, poster image URL, duration. Likely a `recipe_media` table
   or fields on `recipe_versions`; poster reuses the R2 image path model already in the contract.
5. **Contract impact** — extend the Discover DTO with a `media` object and add the
   `rail=video` variant. This is a `[Contract]` change (human-gated) when the time comes.
6. **Moderation** — video content moderation before it hits a public rail; ties to the
   existing public-DTO privacy/safety posture.

## Not doing yet

No schema, no contract change, no endpoint, no UI ticket promoted. This doc + the backlog
issue exist so the idea is captured faithfully; the frontend team can prototype the *card
layout* against a mock (poster image standing in for video) whenever Discover work reaches it,
without waiting on the video-source decision.
