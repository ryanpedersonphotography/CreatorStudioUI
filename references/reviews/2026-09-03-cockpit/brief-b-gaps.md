# Reviewer B brief — what is missing, nominal, or inconsistent

You are an independent, adversarial reviewer. Read-only: do not edit, create, or delete any file. Fresh context: read the tree at its path, never a summary.

Repo: /Users/ryanpederson/NewDev/CreatorStudioUI. The change under review is everything in `git diff 59a7ed9` plus untracked files. The conventions the repo holds itself to are in /Users/ryanpederson/NewDev/CreatorStudioUI/AGENTS.md (read it first). Earlier review findings that this work claims to address are in /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-02-skeleton/.

The work was built to satisfy these ten items, verbatim:
1. Fix the dead separator selector. Replace data-[resize-handle-active] with data-separator variants for hover, active, focus, and disabled. It also closes the missing-focus-state review finding.
2. Keep Cockpit as the primitive, not a fixed five-slot AppShell.
3. Grow Cockpit in three steps: an orientation prop so groups nest, pass-through of the collapsible and pinned panel props, and a panelIds prop for conditional regions.
4. Port usePanelToggle nearly verbatim from the reference kit (callback ref, onResize, isCollapsed(), named restore size) and expose it through a cockpit context so a toolbar can hide and show regions.
5. Adopt the pinned-rail recipe for chrome: disabled + collapsible + equal min and max + preserve-pixel-size.
6. Build the five-region writer's cockpit as a preset in the app: top shelf, project nav, main surface, context shelf under main, inspector on the right.
7. Keep the LayoutStore port; the library persists, the port only says where. Add panelIds to the key the moment any region becomes conditional.
8. Bring in holdPixelSizes and useRepinPanels only when needed, not before.
9. Widen the proof: a browser harness that runs against the built bundle, not only the dev server.
10. Use the layout-lab prototypes as UX reference only.

The reference kit the items come from is at /Users/ryanpederson/Dev/Shell2/shell-widgets/packages/shell/rrp/src (AppShell.tsx, usePanelToggle.ts, ShellSeparator.tsx, shell.css) and its docs at /Users/ryanpederson/Dev/Shell2/shell-widgets/docs (footguns.md, building-your-app.md, mental-model.md). Read them to judge whether the port is faithful where it claims to be.

Hunt for what is MISSING, only nominally satisfied, or inconsistent:
- For each of the ten items: is it actually done, done in name only, or done in a way that contradicts the item? Cite file:line.
- AGENTS.md rules: every export from a package `index.ts` has a test and every component export a story; no raw values outside the token package; the gate list and paths in AGENTS.md match the scripts in /Users/ryanpederson/NewDev/CreatorStudioUI/package.json and the files on disk; the boundary rule that the shell never reveals which panel library is underneath (do any exported types leak library types by name or by structure in a way a consumer would have to know about?).
- The FiveRegions story in packages/shell duplicates the app preset: is that the right split, or should the preset live in the shell so the story and app share it?
- Accessibility: separator labels, focus visibility (the focus state is a background colour with `outline-none`; is that sufficient?), button semantics, keyboard reach for every toggle.
- The earlier skeleton findings this work says it closes (separator styling/focus, shell context and orientation and panelIds, removeItem/port) and the ones it leaves open: is the record accurate? What does a later session risk misreading?
- Anything a writer-facing product would need from this shell in the next milestone that the API shape now makes harder.

Output: a Markdown report to stdout with a title line, then numbered findings each marked MATERIAL or MINOR with file:line citations and a concrete fix, then a section `## Checked and clean` naming what you specifically verified and how. A bare "looks good" is a failed review.
