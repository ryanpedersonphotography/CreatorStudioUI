# Reviewer A brief — correctness of the cockpit against the panel library

You are an independent, adversarial reviewer. Read-only: do not edit, create, or delete any file. Fresh context: you have not seen the author's summary; read the tree at its path.

Repo: /Users/ryanpederson/NewDev/CreatorStudioUI (Nx + pnpm; react-resizable-panels 4.12.3 installed at /Users/ryanpederson/NewDev/CreatorStudioUI/packages/shell/node_modules/react-resizable-panels, its `.d.ts` and `dist/react-resizable-panels.js` are the ground truth for library behaviour). The change under review is everything in `git diff 59a7ed9` plus untracked files; the last green commit is 59a7ed9.

Artifacts under review:
- /Users/ryanpederson/NewDev/CreatorStudioUI/packages/shell/src/lib/cockpit.tsx
- /Users/ryanpederson/NewDev/CreatorStudioUI/packages/shell/src/lib/use-panel-toggle.ts
- /Users/ryanpederson/NewDev/CreatorStudioUI/packages/shell/src/lib/cockpit-regions.tsx
- /Users/ryanpederson/NewDev/CreatorStudioUI/packages/shell/src/index.ts and the three `*.spec.tsx` beside them
- /Users/ryanpederson/NewDev/CreatorStudioUI/apps/studio/src/app/studio-cockpit.tsx and app.tsx
- /Users/ryanpederson/NewDev/CreatorStudioUI/packages/tokens/src/lib/sizes.ts
- /Users/ryanpederson/NewDev/CreatorStudioUI/tools/src/verify/cockpit.mjs (a Playwright harness; the dev server is already running on http://localhost:5180 and you may run `node tools/src/verify/cockpit.mjs` from the repo root)

Hunt for what is WRONG. Specifically check, against the library source, and cite file:line for every claim:
1. `useDefaultLayout` spread order and whether any handler is clobbered; the `panelIds` option and the resulting storage key format after the prefix-stripping shim (the test asserts `cs:layout:demo:root:nav:main`; is that what the library produces?).
2. `usePanelToggle`: does `hidden` self-correct on mount when a saved layout restores the panel collapsed (does `isCollapsed()` report true at that moment, does `onResize` fire)? Stale closures? StrictMode double effects? What happens when `restoreSize` is a percentage string like '20%' passed to `resize()`?
3. The pinned recipe (`pinnedPanel`): is `disabled` + `collapsible` + equal min/max + `preserve-pixel-size` actually inert to drag AND still hideable in 4.12.3? Is a collapsed disabled panel re-expandable via `resize()`?
4. Both sidebars use `preserve-pixel-size` with percent `defaultSize` and saved percent layouts: what happens on reload at a different viewport width? Does the group keep at least one relative panel in every nesting level?
5. DOM ids: three nested groups and seven panels on one page; any duplicate `id`? Any `:` in a DOM id?
6. The separator classes rely on Tailwind arbitrary variants `aria-[orientation=vertical]:` and `data-[separator=hover]:`; confirm the built CSS at apps/studio/dist/assets/*.css actually contains those selectors.
7. The harness: for each assertion, could it pass while the feature is broken? Are any waits racy? Does `--preview` mode actually serve the built bundle?
8. `Cockpit.Regions` context: identity stability, error on missing region, and whether a toolbar inside the pinned `top` panel can reach toggles created by the same component that renders it (ordering/hook rules).
9. Anything else that is a bug, a lie in a comment, or a test that does not test what its name says.

Output: a Markdown report to stdout with a title line, then numbered findings each marked MATERIAL or MINOR with file:line citations and a concrete fix, then a section `## Checked and clean` naming what you specifically verified and how (command + exit status, or file:line read). A bare "looks good" is a failed review.
