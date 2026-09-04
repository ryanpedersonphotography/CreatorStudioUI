# Brief A — correctness of the rail and strip states

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`. Read-only:
no edits, no git commands that change anything, no servers on port 5181. A dev server runs on
http://localhost:5180 for probes. The library is react-resizable-panels 4.12.3 at
`packages/shell/node_modules/react-resizable-panels/dist/react-resizable-panels.{js,d.ts}`; that source
is the ground truth, not its README.

## What changed

`git diff HEAD~1` (one commit) adds a compact state to every edge of the studio cockpit: the nav and
inspector sidebars collapse to a 48px rail instead of to nothing, the context shelf and the top shelf
collapse to a 32px strip, and each compact state shows content that carries its own expand control.
Files: `packages/tokens/src/lib/sizes.ts` (`rail`, `strip`), `packages/shell/src/lib/cockpit.tsx`
(`pinnedPanel(size, collapsedSize)`), `packages/shell/src/lib/use-panel-toggle.ts` (renamed to
collapsed/collapse/expand), `apps/studio/src/app/studio-cockpit.tsx` (slots), `studio-rails.tsx`,
`studio-toolbar.tsx`, `app.tsx`, specs, `tools/src/verify/cockpit.mjs` (41 assertions).

## What "wrong" looks like — hunt for these, cite file:line or a command and its output

1. `collapsedSize` is now a pixel length on panels whose stored layout is a percentage. Does
   `isCollapsed()` stay true for a rail after a window resize, after a reload at a different viewport,
   and after the `preserve-pixel-size` group behaviour has run? Trace the px→% conversion and the
   fuzzy compare the library uses. Probe it in the browser: collapse nav, reload at 1000px wide, read
   `#nav` width and the toolbar button's `aria-pressed`.
2. A pinned panel with `minSize === maxSize === 48px` and `collapsedSize = 32px`: can the library
   sit it at 32? Does `expand()` restore 48 exactly? Does the disabled separator still refuse a drag
   in both states?
3. Drag behaviour with a non-zero collapsed size: dragging nav below its minimum should land on 48,
   not 0 and not somewhere between; dragging a rail outward should expand. Keyboard on the separators
   (Enter, arrows) with a rail present.
4. `usePanelToggle` after the rename: any path where `collapsed` diverges from the panel, or where an
   expand from the rail's own button behaves differently from the toolbar's button.
5. Focus and accessibility: the toolbar lives in the top shelf and unmounts when the shelf collapses
   to a strip; the strip unmounts when it expands. Where does keyboard focus go after each? Are the
   expand buttons named and distinct from the toolbar toggles? Anything a screen reader would find
   wrong in the rail (the decorative initial, the glyphs)?
6. The harness: which of the 41 assertions could pass while the feature is broken? Anything relying
   on state from an earlier section that its message hides?
7. StrictMode double effects, and errors in the console under any of the above.

## Run

`pnpm nx run-many -t typecheck test lint --skip-nx-cache`; `node tools/src/verify/cockpit.mjs`
(dev server). Quote the result lines.

## Report

Findings first, most severe first, each with severity (MATERIAL / MINOR), the claim, the citation,
and the fix you recommend. Then a "checked and clean" list naming exactly what you checked and how.
A bare "looks good" is a failed review.
