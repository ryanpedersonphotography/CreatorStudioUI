# Brief C — re-review of the fix wave (diff only)

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`.
Read-only: do not edit files, do not run git commands that change anything, do not start servers on
port 5181. A dev server is already on http://localhost:5180 if you want to look at the page.

## What to review

The diff since the checkpoint commit `48423fe` (`git diff 48423fe` plus the untracked files in
`git status --short`). It applies the accepted findings of two earlier reviews:

- `references/reviews/2026-09-03-cockpit/reviewer-a-correctness.md` (findings A1–A9)
- `references/reviews/2026-09-03-cockpit/reviewer-b-gaps.md` (findings B1–B14)
- `references/reviews/2026-09-03-cockpit/disposition.md` says what was accepted, declined, or deferred.

## What "wrong" looks like — hunt for these

1. A finding marked *fixed* in disposition.md whose fix is not actually in the diff, or fixes a
   different thing than the finding described. Cite file:line for each fix you confirm or refute.
2. Regressions introduced by the fixes, in particular:
   - `packages/shell/src/lib/use-panel-toggle.ts`: `hide()`/`show()`/`toggle()` now return booleans
     and call `sync()` right after the imperative call. Find any path where `hidden` can diverge
     from the panel, or where `collapsedByUs` is left wrong after a call that did not act.
     Check against the library source in
     `packages/shell/node_modules/react-resizable-panels/dist/react-resizable-panels.js`
     (the group store `F` and `j()` around line 474; the handle around line 960–1010).
   - `tools/src/verify/cockpit.mjs`: 36 assertions. Any that are vacuous (cannot fail), any that
     depend on state left by an earlier section in a way the message hides, and whether section 8b
     (second browser context seeded from localStorage) proves what its message claims.
   - `packages/tokens/src/lib/sizes.ts` rename `mainMin`→`centerMinWidth`, `surfaceMin`→`mainMinHeight`:
     any stale reference anywhere (grep apps, packages, tools, AGENTS.md, references).
   - `packages/contracts/src/lib/layout-store.ts`: `layoutKey(projectId, group, panelIds?)`. Does its
     key shape match what the library writes (`react-resizable-panels.js` ~line 1806/1885, after the
     shell's prefix shim in `packages/shell/src/lib/cockpit.tsx`)?
   - `.ladle/config.mjs` globs and `.ladle/preview.css` `@source` lines: could a story be missed or
     doubled; could Tailwind miss classes used only in `apps/`?
   - `packages/shell/src/lib/cockpit.stories.tsx` `Nested`: the shelf is `pinnedPanel(...)` (disabled)
     and now carries `shelf.panelProps`. Reason from the library source whether `collapse()` on a
     disabled panel acts (reviewer A cited `overrideDisabledPanels` at ~line 657/677), and whether
     `expand()` will restore 48px given `minSize === maxSize`.
   - `apps/studio/src/app/studio-cockpit.tsx`: `preventDefault()` removed from the Enter handler.
     Confirm the reasoning in the comment against the library's keydown handler (~line 1117–1160).
3. Anything in the diff that goes beyond the accepted findings (scope creep), or docs that now
   overclaim (`AGENTS.md` Stage paragraph, comments in the changed files).

## What to run

- `pnpm nx run-many -t typecheck test lint --skip-nx-cache` and quote the result lines.
- `node tools/src/verify/cockpit.mjs` (dev server, port 5180) if you want first-hand harness output;
  quote the summary line.

## Report

Write findings first, most severe first, each with: severity (MATERIAL / MINOR), the claim, the
citation (file:line or command + output), and the fix you recommend. Then a "checked and clean"
list naming exactly what you checked and how. A bare "looks good" is a failed review.
