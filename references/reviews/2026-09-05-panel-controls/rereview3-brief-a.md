Round-3 review of a foundation spec in the repo at /Users/ryanpederson/NewDev/CreatorStudioUI:
/Users/ryanpederson/NewDev/CreatorStudioUI/references/specs/2026-09-05-panel-controls.md. Read the
record first: /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/disposition.md
(the "Round 2" table says what changed and why) and your predecessor's report
/Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/rereview-a.md.
Your brief is **correctness of the round-2 fixes only**: re-verify the changed mechanisms against
the installed sources, and say whether each fix holds or opens a new hole. Do not re-litigate what
round 2 passed clean.

Changed mechanisms to verify, with file:line citations:
- The grown binding (`CockpitPanelBinding` gains `collapsed`, `sliding`, `onSlideEnd`; the toggle
  returns `sliding`) against `packages/shell/src/lib/use-panel-toggle.ts` and `cockpit.tsx`: can
  `collapse()`/`expand()` set `sliding` only when they acted, and does the mount reconcile
  (`use-panel-toggle.ts:111`) really bypass them?
- Arming in a `useLayoutEffect` of the same commit as the library's `flex-grow` change: does the
  library commit its layout through React state so both land in one commit from a click handler?
  Does a CSS transition start when only the after-change style carries `transition-property`? Is
  the `Group`'s `elementRef` real in `react-resizable-panels@4.12.3` (the dist file is under
  `node_modules/.pnpm/react-resizable-panels@4.12.3*/node_modules/react-resizable-panels/dist/`)?
- `:scope > [data-panel]` from the group element: are panels direct children of the group element?
- The disarm rule: `transitionend`/`transitioncancel` bubbling to the group; `getAnimations()` on
  a paused transition; a `pointerdown` at capture on `[data-resize-handle]` (does the library's
  handle carry that attribute?).
- The preset's swap `collapsed && !sliding ? edge : content` and `useFocusHandoff` keyed on
  `[collapsed, sliding]` acting when `!sliding`: trace `cockpit.mjs`'s focus assertions
  (`tools/src/verify/cockpit.mjs` around lines 380-400) and the handoff in
  `apps/studio/src/app/studio-cockpit.tsx:170-215`. Does anything observe `collapsed` before the
  swap and misbehave (the rail's `Expand` button count at `cockpit.mjs:145`, the storage writes)?
- `inert` + `data-collapsed` on the outer element for `hidden`/`peek` once `!sliding`.
- The motion assertion's integers (two per toggle) against the library's distribution
  (`dist:767-784`, pivot at `:952`) for each of the four regions, including the top shelf in the
  root group `[top, body]` and the context shelf in the centre group `[main, context]`.
- `aria-disabled` + Ark Tooltip: does Zag's trigger open for an `aria-disabled` button?
- The contract's five new rows and the bridge under `tools/src/lint/check-tokens.mjs`.
- The harness reading `--cs-motion-slide` from the page and the `fill` computed-style check on an
  SVG `<rect>` (what does `getComputedStyle(rect).fill` return for `currentColor` and `none`?).

Rules: read-only. Do not edit anything, do not start any server, do not run `pnpm visual`,
`pnpm verify`, or `ladle`. `gh api` only with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and what breaks; then `## Clean passes` naming what you specifically checked and how;
then `## Verdict` in two sentences. A bare "looks good" is a failed review.
