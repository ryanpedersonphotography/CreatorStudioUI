You are reviewing a foundation spec that later waves will build from, in the repo at
/Users/ryanpederson/NewDev/CreatorStudioUI. Read
/Users/ryanpederson/NewDev/CreatorStudioUI/references/specs/2026-09-05-panel-controls.md first, then
the code it claims to reuse. Your brief is **correctness and buildability**: hunt for anything in
the spec that is wrong about the real code or the real libraries, or that an implementer could not
build as written. You are not the author.

Verify against the sources, not memory:
- `packages/shell/src/lib/cockpit.tsx` and `use-panel-toggle.ts`: does `collapse` as specified fit
  `Cockpit.Panel`, `pinnedPanel`, `cockpitSizes`, and how collapse is driven today?
- `node_modules/react-resizable-panels` (the installed version in package.json): how does it size a
  panel (inline style? which property?), can a CSS transition on that property animate a
  programmatic collapse, and does anything in the library fight a transition during drag? Cite the
  file and line in the installed source.
- `apps/studio/src/app/studio-cockpit.tsx` (`useFocusHandoff`), `studio-rails.tsx`,
  `studio-toolbar.tsx`, `studio-commands.ts`, `studio-menus.tsx`, `studio-regions.ts`,
  `use-theme.ts`, and `packages/contracts/src/lib/preferences.ts`: do the spec's studio changes
  match what is there (names, hooks, keys, the portal-aware focus check)?
- `packages/menubar` (its `package.json`, `README.md`, `menubar.css` contract block, the `Shortcut`
  type, and the root `eslint.config.mjs` `kind:portable` constraint): is "the same constraint and
  manifest spec as the menubar" buildable for a second package, and does copying `formatShortcut`
  keep both packages lint-clean?
- Ark UI: `npm view @ark-ui/react version peerDependencies` (read-only) and its Tooltip API. Does
  Ark's Tooltip support what the spec needs (open on hover and focus, delay, portal)? Is React 19
  a supported peer?
- Playwright (installed `@playwright/test`): can a screenshot be taken mid-transition with
  `animations: 'allow'` after pausing via `element.getAnimations()` and setting `currentTime`, and
  does `toHaveScreenshot`'s stabilisation loop interfere? Cite the installed source.
- `tools/src/verify/cockpit.mjs` and `menubar.mjs`: which existing assertions the spec would break
  (rail widths, expand-button focus targets, visible text names), and whether "existing assertions
  keep their count" can hold.
- `tools/src/lint/check-tokens.mjs`: does the proposed contract block pass the lint as the menubar's
  does?

Rules: read-only. Do not edit anything, do not start any server, do not run `pnpm visual`,
`pnpm verify`, or `ladle`. `gh api` only with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the file:line citation and what breaks; then `## Clean passes` naming what you specifically checked
and how; then `## Verdict` in two sentences. A bare "looks good" is a failed review.
