# Cockpit review — disposition

**Artifact:** the cockpit slice built for the ten `/goal` items (shell primitive, toggle hook, regions
context, five-region studio preset, contracts `layoutKey`, tokens, harness, stories, docs).
**Gate:** two independent reviewers, both opus, fresh context, divergent briefs, reading the tree at
checkpoint `48423fe`; one opus re-review of the fix diff. Briefs and full reports sit beside this file.

| Reviewer | Brief | Report |
|---|---|---|
| A (opus) | `brief-a-correctness.md` — correctness against react-resizable-panels 4.12.3 | `reviewer-a-correctness.md` |
| B (opus) | `brief-b-gaps.md` — what is missing, ambiguous, or overclaimed | `reviewer-b-gaps.md` |
| C (opus) | `brief-c-rereview.md` — the fix diff since `48423fe` | `reviewer-c-rereview.md` |

## Reviewer A — findings and disposition

| # | Finding | Disposition |
|---|---|---|
| A1 | Typecheck red under a cold cache: spec called `onResize` with two args and a wrong field | **Fixed.** `use-panel-toggle.spec.tsx` `dragTo` now passes `({ asPercentage, inPixels }, 'nav', undefined)`. `pnpm nx run-many -t typecheck lint test --skip-nx-cache` → exit 0, 6 projects. |
| A2 | Below the sum of the body's minimums the toggles are silent no-ops | **Fixed in part.** `usePanelToggle` reads the group back after each imperative call; `hide()`/`show()`/`toggle()` return whether they acted and `hidden` stays truthful without an `onResize`. Two unit tests cover it (a "stuck" fake). The floor itself (nav 160 + centre 320 + inspector 200 px) is documented in the preset and in `references/friction-notes.md` and is **accepted risk** for a desktop studio; no `canToggle` pre-check, because the handle API cannot answer it before the call. |
| A3 | `panelIds` order silently decides whether a layout is ever restored | **Fixed (doc + test naming).** `cockpit.tsx` doc now requires render order and says why; the spec is renamed to claim only the read (jsdom commits no layout). The write side is proven by the library's own key builder and the harness's stored-key assertion. |
| A4 | `pinnedPanel`'s "hideable" claim had no witness; `top` toggle unreachable in the app | **Fixed (witness) + accepted risk (app).** The `Nested` story hides the pinned shelf from a button inside the nav panel. The app keeps `top` wired with no control on purpose (the product spec says hideable, no button); a control must live outside the shelf. |
| A5 | Sidebars restore as a share of the window, not pixels, on a reopen at another size | **Fixed (truthful claims).** Preset comment and harness header now say a stored layout is a share; harness 8b reopens the stored layout in a second context at 1000px and asserts the share. Pixel-restoring persistence would change the port (item 7 keeps it) — **not in scope**. |
| A6 | `--preview` does not build; summary line overclaims | **Fixed.** Usage line says it serves an existing `dist/`; the summary prints the bundle's build time. |
| A7 | `preventDefault()` cannot stop the library's Enter; the feature works because `main` is not collapsible | **Fixed.** Call removed; the comment states the real guard. |
| A8 | `mainMin`/`surfaceMin` are applied across different axes | **Fixed.** Renamed `centerMinWidth` / `mainMinHeight`, each commented with its axis. |
| A9 | Two spec assertions read stronger than they are | **Fixed.** Comments state exactly what each proves; the browser harness holds the round-trip. |

## Reviewer B — findings and disposition

| # | Finding | Disposition |
|---|---|---|
| B1 | `show()` after `hide()` used `resize(restoreSize)`, losing the exact size | **Fixed.** `collapsedByUs` ref; `expand()` after a hide, `resize()` after a drag. Unit tests + harness ("show brings back the dragged height exactly — 280 → 280"). |
| B2 | `top` region has a toggle but no control | **Doc only.** See A4. |
| B3 | Toolbar buttons named "Toggle …" with no pressed state | **Fixed.** `studio-toolbar.tsx`: visible names, `aria-pressed`. Harness clicks by visible name. |
| B4 | No visible keyboard focus on separators | **Fixed.** `focus-visible` outline ring from `--cs-focus-ring` (2px); harness measures `outlineStyle`/`outlineWidth` under focus and under hover. |
| B5 | `layoutKey` cannot name a conditional-set key; harness key test too strict | **Fixed.** `layoutKey(projectId, group, panelIds?)` in contracts with tests; harness accepts `key(group)` or a `key(group):` prefix. |
| B6 | DOM ids not namespaced per cockpit | **Declined.** The library's `id` is both DOM id and persistence key; namespacing would change stored layouts and `panelIds`. Caller obligation documented. Revisit if two cockpits share a page. |
| B7 | Top shelf edge: no separator, drag proof vacuous; imperative-hide unproven | **Fixed (edge) + accepted risk (app).** `<Cockpit.Separator disabled>` draws the edge; harness drags it and asserts `data-separator=disabled` and zero movement. Imperative hide of a pinned panel is witnessed in the `Nested` story, not in the app (see A4). |
| B8 | Ladle sees only `packages/`; the preset is not storied; `FiveRegions` duplicates it | **Fixed.** Globs anchored one level deep (a `**` before `src` followed workspace symlinks and doubled every story); `apps/studio/src/app/studio-cockpit.stories.tsx` stories the real preset; `FiveRegions` cut for a minimal `Nested`. |
| B9 | Library types reach the shell's public API | **Deferred, accepted risk.** As described in `reviewer-b-gaps.md`; a shell-owned type would be a wrapper for the sake of it until a second panel library exists. |
| B10 | Arbitrary-value classes escape the token lint | **Deferred, accepted risk.** Outside the ten items; noted for the next tokens pass. |
| B11–B13 | Separator too thick, `border-line` misuse, no `disabled` prop | **Fixed.** 1px line (`--spacing-separator: var(--cs-line)`), `border-line` dropped, `disabled` on `Cockpit.Separator`. |
| B14 | AGENTS Stage paragraph stale; reference points at the wrong app; footgun 24 reasoning unrecorded | **Fixed.** Stage rewritten, Shell2 reference added, friction note on the footgun 24 exemption. |

## Evidence (run by the session, 2026-09-03)

- `pnpm nx run-many -t typecheck lint test --skip-nx-cache` → exit 0, "Successfully ran targets typecheck, lint, test for 6 projects" (38 tests).
- `pnpm lint:tokens` → "no raw values outside packages/tokens/src/tokens.css; every var() resolves".
- `pnpm stories:build` → 3 stories (`cockpit--three-regions`, `cockpit--nested`, `studio-cockpit--writers-cockpit`).
- `node tools/src/verify/cockpit.mjs` → 36 passed, 0 failed (dev server); `--preview` → 36 passed, 0 failed (production bundle).
- Built CSS contains the `focus-visible` outline rule reading `--cs-focus-ring` and no `--cs-separator-hit`.
- Screenshots: `screenshots/cockpit-light.png`, `screenshots/cockpit-dark.png`, `screenshots/story-cockpit--nested.png`, `screenshots/story-studio-cockpit--writers-cockpit.png`.
- Pinned-shelf witness, driven by Playwright against the built `Nested` story (`ladle preview`): shelf 48 → 0 → 48 px from the button in the nav panel, `aria-pressed` true → false → true; nav 256 → 0 → 256 px; no console or page errors.

## Found by the session's own visual check (not by either reviewer)

| # | Finding | Disposition |
|---|---|---|
| S1 | The built Ladle stories rendered blank ("React is not defined") while `pnpm stories:build` exited 0. `@vitejs/plugin-react` 6 peers on Vite 8; Ladle 5.1 bundles Vite 6, so the plugin is inert there and `.ladle/components.tsx` compiled its JSX classic. | **Fixed.** `.ladle/vite.config.mts` names `esbuild.jsx: 'automatic'`. Probe against `ladle preview`: both new stories render, zero console or page errors. Screenshots `screenshots/story-cockpit--nested.png`, `screenshots/story-studio-cockpit--writers-cockpit.png`. Recorded in `references/friction-notes.md`. |

## Reviewer C — re-review of the fix diff

Reviewer C confirmed every *fixed* row above at a citation, traced `usePanelToggle` for divergence and
found none, re-derived `layoutKey` against the library's key builder, confirmed the token rename left
no stale reference, ran every gate cold (typecheck, lint, test, token lint, stories, harness on dev
server and built bundle, all green), and drove the `Nested` story's pinned shelf itself (48 → 0 → 48).

| # | Finding | Disposition |
|---|---|---|
| C1 | **Material.** Harness §8's hover-under-focus check moved the pointer to the nav separator's box captured before the drag in §3 moved it, so it hovered a panel and could not fail. | **Fixed.** The box is re-read at the point of use. The behaviour itself was fine (C hovered the live separator with focus held: `data-separator` stayed `focus`, ring stayed `solid 2px`). |
| C2 | §5's shelf-edge drag is vacuous: the shelf is pinned by `minSize === maxSize` as well as `disabled`, so the drag proves the pin, not the flag. | **Fixed (message).** The assertion now says what it proves; `disabled` is proven by the `data-separator=disabled` assertion beside it and by the `data-disabled` check in `cockpit.spec.tsx`. |
| C3 | §8b's expected share used a nav width read two sections earlier. | **Fixed.** Read live beside the body width. C confirmed the assertion discriminates: an unseeded context at 1000px gives 200px against an expectation of 311. |
| C4 | The shelf edge carried `aria-label="Top shelf edge"` while being inoperable, so a screen reader announces a named control nobody can use. | **Fixed.** The separator is nameless (a static separator, like a rule); harness selects it as `#top + [role=separator]`; the app spec expects the three operable names. |
| C5 | Process: the tree changed under the reviewer (disposition and two files appeared or changed mid-review). | **Accepted, corrected going forward.** The code is committed before the record is written; the commit reviewed is named below. Reviewer C's citations were re-checked by the session against the final tree when applying C1–C4. |

**Gate cost:** three opus reviewers (A correctness, B gaps, C diff re-review), headless with fresh
context. Reviewed commit for C's citations: working tree after `48423fe`; the fix wave (with C1–C4 applied) is commit `29233a2`;
every citation above was re-checked against that tree.
