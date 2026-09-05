You are re-reviewing a revised foundation spec in the repo at /Users/ryanpederson/NewDev/CreatorStudioUI:
/Users/ryanpederson/NewDev/CreatorStudioUI/references/specs/2026-09-05-panel-controls.md. Round 1
found gaps in keyboard and screen-reader behaviour, the wave-1 scope, the strip, resize, states
without baselines, the visual-harness seam, and the extension seams; the author revised. Your brief
is **what is still missing or newly inconsistent**. Read the round-1 record first:
/Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/disposition.md
and /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/review-b.md,
then /Users/ryanpederson/NewDev/CreatorStudioUI/AGENTS.md.

The owner's rulings stand: variants for different situations; a compositional kit; the variant
changeable from the menu; the plainest variant as the default (the spec now makes it the default
in wave 2, with wave 1 keeping today's rails: judge whether that respects the ruling or dodges it);
foundation first, hardened, then additions each with tests that turn red on a subtle regression.

Hunt for, with citations into the spec:
- Wave 1 as now written: is it the smallest hardenable foundation, or has it grown (the strip with
  four compact toggles in 32px, the live region, the disabled rule, the mid-slide frames)? Name
  anything that should move to wave 2 or must come forward.
- A writer's experience that is still undecided: the strip at 32px holding a title and four
  toggles; what the live region says for the top shelf; the disabled toggle on a narrow window when
  the panel is already shown; Escape in the peek when focus is inside; a shelf rail's icon meaning.
- Testing that would still miss a subtle regression: is each named check decidable from the
  transcript of a run; can the `{ view, steps }` descriptor express every named composite view; are
  the 14 studio baselines the right 14; is anything asserted only by a baseline a human must read?
- Documents the spec now contradicts: `AGENTS.md` (the "nothing vanishes" rule, the stage), the
  shell's header comment in `apps/studio/src/app/studio-cockpit.tsx`, `studio-rails.tsx`'s naming
  rationale, `studio-commands.ts`'s key list. Does the spec say which sentences change?
- The seams: is the variant map, the preference value, the descriptor, or the contract a trap for
  the opinionated version? What would a fourth variant or a sixth region need that is not there?
- Anything a reader must guess: a name, a size, a default, a file.

Rules: read-only. Do not edit anything, do not start any server, do not run `pnpm visual`,
`pnpm verify`, or `ladle`. `gh api` only with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and what a user or the next wave would hit; then `## Clean passes` naming what you
specifically checked and how; then `## Verdict` in two sentences. A bare "looks good" is a failed
review.
