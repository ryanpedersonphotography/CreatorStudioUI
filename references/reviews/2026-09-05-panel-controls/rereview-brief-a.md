You are re-reviewing a revised foundation spec in the repo at /Users/ryanpederson/NewDev/CreatorStudioUI:
/Users/ryanpederson/NewDev/CreatorStudioUI/references/specs/2026-09-05-panel-controls.md. Round 1
found the slide, the clip, the motion assertion, the collapse sizing, the focus handoff and the
tokens unbuildable as written; the author revised. Your brief is **correctness of the revision**:
verify every mechanism the spec now states against the installed sources, and hunt for anything the
revision broke or left unbuildable. Read the round-1 record first:
/Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/disposition.md
and /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/review-a.md.

Verify against the sources, with file:line citations:
- `node_modules/react-resizable-panels` (installed version): does `Panel` spread rest props onto the
  outer sized element so `data-sliding` and `data-collapse` can land there? Does a transition on
  `flex-grow` of that element animate a programmatic collapse? Does anything cancel or reset the
  inline style mid-transition? Is `visibility`/`inert` on the inner element free of the library's
  inline styles? Can `usePanelToggle` (`packages/shell/src/lib/use-panel-toggle.ts`) reach every
  panel of a group to arm them all?
- `packages/shell/src/lib/cockpit.tsx`: the orientation context and the single-source
  `collapsedSize`; what `pinnedPanel` callers in `apps/studio` must change.
- The disarm rule (transitionend/transitioncancel or 5× duration after `getAnimations()` is empty)
  against a Playwright test that pauses the transition: does it hold, and what happens under
  reduced motion when the duration is 0 (no transition events fire)?
- `@nx/enforce-module-boundaries` in the installed `@nx/eslint-plugin`: does
  `onlyDependOnLibsWithTags: []` forbid every workspace import, or does it mean "no constraint"?
  Cite the plugin source.
- Ark UI Tooltip (read-only: `npm view @ark-ui/react`, or fetch the published types from unpkg):
  open on hover and focus, `openDelay`, `closeOnEscape`, portal.
- Ladle (installed `@ladle/react`): does a story's `meta` reach `dist/ladle/meta.json` so
  `stories.visual.mts` can read a hover/focus target from it? Cite where the manifest is written.
- `tools/src/verify/menubar.mjs` probe: what the new `color`-on-SVG mode needs.
- The tokens spec tying `--cs-size-rail`/`strip` to `sizes.ts`: buildable under the token lint?

Rules: read-only. Do not edit anything, do not start any server, do not run `pnpm visual`,
`pnpm verify`, or `ladle`. `gh api` only with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and what breaks; then `## Clean passes` naming what you specifically checked and how;
then `## Verdict` in two sentences. A bare "looks good" is a failed review.
