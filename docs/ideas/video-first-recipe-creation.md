# Decided direction: video-preferred recipe creation (2026-07-18)

Dylan's decisions, captured from design session:
- Video optional but preferred; share-to-Savoro (iOS Share Extension) is the
  flagship entry; paste-a-link is the quiet fallback; scratch stays first-class.
- Creating is correcting: LLM drafts from video captions (oEmbed tier only —
  the legally-safe, Mela/Pestle-proven approach); editor is a guided review
  surface. Free-text-only UX vetoed; row-form explosion vetoed; guided
  composers with budgeted buttons.
- ProductHunt analogy noted for later: hunters post recipes they found;
  creators can claim. Solves cold start + creator acquisition. SEPARATE epic.
- Steps are the most tedious part; video-attached recipes may treat steps as
  optional (the video is the instruction fallback).

Execution plan: docs/epics/recipe-creation.md (RC-1..RC-25, gated phases).
