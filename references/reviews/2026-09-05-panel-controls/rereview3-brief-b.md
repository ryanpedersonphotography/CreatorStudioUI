Round-3 review of a foundation spec in the repo at /Users/ryanpederson/NewDev/CreatorStudioUI:
/Users/ryanpederson/NewDev/CreatorStudioUI/references/specs/2026-09-05-panel-controls.md. Read the
record first: /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/disposition.md
(the "Round 2" table says what changed and why) and your predecessor's report
/Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/rereview-b.md.
Your brief is **what the round-2 fixes still leave missing, and what they newly cost a writer**. Do
not re-litigate what round 2 passed clean.

Hunt for, with citations into the spec:
- Wave 1 as now cut: is it the smallest hardenable foundation? Name anything that still belongs in
  wave 2, or anything moved to wave 2 that wave 1 cannot be proven without.
- The slide as a writer sees it: content stays mounted while a panel slides shut and the edge
  appears when it ends; the way back is briefly absent during a 200ms slide; focus waits for the
  slide; a second toggle click mid-slide; a shortcut spammed; the top shelf collapsing with the
  toolbar (and its own toggle) still mounted during the slide.
- The post-hoc "blocked" no-room state: what a writer sees on the first failed attempt, whether
  "widen the window" is the right remedy for every region, and when the state clears.
- The 18 baselines and the `{ view, steps, screenshot? }` step vocabulary: can every named view be
  expressed with the five step kinds listed; is anything still asserted only by a picture; is a
  decidable transcript check named for every behaviour the spec promises?
- The strip order and the `Expand top shelf` control coexisting with three compact toggles at
  32px; the rail's chevron as the `glyph` of a `PanelToggle` whose pressed state means "shown".
- The "Sentences that change, by wave" list against `AGENTS.md`, `apps/studio/src/app/*.tsx|ts`
  comments and `references/friction-notes.md`: anything missed?
- Seams: `REGION_ORDER`, the binding's three new fields, the descriptor, the contract rows: a trap
  for a fourth variant, a sixth region, or an opinionated skin?
- Anything a reader must still guess: a name, a size, a default, a file.

Rules: read-only. Do not edit anything, do not start any server, do not run `pnpm visual`,
`pnpm verify`, or `ladle`. `gh api` only with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and what a user or the next wave would hit; then `## Clean passes` naming what you
specifically checked and how; then `## Verdict` in two sentences. A bare "looks good" is a failed
review.
