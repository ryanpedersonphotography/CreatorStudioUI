You are reviewing a foundation spec that later waves will build from, in the repo at
/Users/ryanpederson/NewDev/CreatorStudioUI. Read
/Users/ryanpederson/NewDev/CreatorStudioUI/references/specs/2026-09-05-panel-controls.md first, then
/Users/ryanpederson/NewDev/CreatorStudioUI/AGENTS.md (north star, core experiences, conventions)
and the menubar wave it models itself on (`packages/menubar/README.md`,
`references/reviews/2026-09-04-menubar/`). Your brief is **what is missing**: gaps in product,
accessibility, testing, and in the spec's own promise of a foundation that later opinionated
versions extend "without stripping much out". You are not the author.

The owner's rulings, which the spec must serve and you must not overturn: variants for different
situations; a compositional kit; the variant changeable from the menu; the plainest variant as the
default; foundation first, hardened, then bells and whistles added compositionally, each with tests
that turn red on a subtle visual, animation, or behaviour regression.

Hunt for, with citations into the spec:
- A behaviour a writer would hit that the spec does not decide: keyboard access when a panel is
  hidden or peeking; what happens on window resize while hidden; the very first paint (does a
  hidden panel flash?); what a screen reader hears when a panel hides; the rail's content for a
  shelf versus a sidebar; dragging a hidden panel's edge.
- Testing that would miss a subtle regression: is every named check actually decidable, is the
  motion contract observable, are there states (hover, pressed, focus, disabled, dark) with no
  baseline or assertion, is there a change that would pass every listed test and still look wrong?
- The extension story: is anything in wave 1 shaped so that wave 2 or an opinionated version must
  edit rather than add? Is the variant map, the preference value, the CSS contract, or the menu
  shape a trap? What would a card-beside-the-text panel need that the seams do not give?
- Accessibility: names, roles, focus order, contrast, reduced motion, tooltips versus names,
  the pointer-only peek.
- Order: is the foundation wave the smallest thing that can be hardened, or is something in it
  that belongs later (or something later that must be in it)?
- Anything a reader must guess: a name, a size, a default, a file.

Rules: read-only. Do not edit anything, do not start any server, do not run `pnpm visual`,
`pnpm verify`, or `ladle`. `gh api` only with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and what a user or the next wave would hit; then `## Clean passes` naming what you
specifically checked and how; then `## Verdict` in two sentences. A bare "looks good" is a failed
review.
