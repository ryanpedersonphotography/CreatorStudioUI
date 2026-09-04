# Rail and strip states — review disposition

**Artifact:** the rail/strip wave for the `/goal` "add a rail state to the left/right/bottom and also add
a top strip as well": commit `e60933b` as reviewed, fixes applied on top in `053c544` (reviewers A, B)
and the commit named under "Reviewer C" (reviewer C).
**Gate:** two independent opus reviewers, fresh context, divergent briefs, headless Playwright probes
against the dev server; an opus re-review of each fix diff. Briefs and reports sit beside this file.

| Reviewer | Brief | Report |
|---|---|---|
| A (opus) | `brief-a-correctness.md` — correctness against react-resizable-panels 4.12.3 | `reviewer-a-correctness.md` |
| B (opus) | `brief-b-gaps.md` — what is missing, overclaimed, or ambiguous | `reviewer-b-gaps.md` |
| C (opus) | `brief-c-rereview.md` — the first fix diff (`053c544`) | `reviewer-c-rereview.md` |
| D (opus) | `brief-d-rereview.md` — the second fix diff (`709252e`), and the AGENTS.md headless rule from `ad71d78` | `reviewer-d-rereview.md` |
| E (opus) | `brief-e-rereview.md` — the third fix diff (`b8c732e`), and the rewritten AGENTS.md rule | `reviewer-e-rereview.md` |
| F (opus) | `brief-f-rereview.md` — the fourth fix diff | `reviewer-f-rereview.md` |

## Reviewer A

| # | Finding | Disposition |
|---|---|---|
| A1 | **Material.** A shelf stored as a share of a 900px window mounts collapsed on any window shorter than ~750px: the library validates the stored percentage against constraints from the current size without pixel conversion, and the strip moved the collapse midpoint from 24px to 40px. | **Fixed in two steps.** First (`053c544`): the root group is session-only, so the shelf never mounts from a stored share (harness §5b, §7b). Reviewer C then showed the same clamp hits nav, context and inspector (C1); the general fix is under C1. |
| A2 | **Material.** Focus falls to the document at every transition that unmounts the pressed control. | **Fixed.** `useFocusHandoff` in the preset wraps each toggle: when focus was inside the region at the call, it moves to the new content's first control or its landmark once rendered; a call that did not act moves nothing. Harness §8c: toolbar "Top shelf" → "Expand top shelf"; strip → "Top shelf"; toolbar "Navigation" keeps focus; rail "Expand navigation" → the nav landmark. |
| A3 | Glyphs are the button's visible text under a different accessible name. | **Fixed.** Glyphs are `aria-hidden` spans. |
| A4 | The inspector restore assertion (`> 100`) could pass on a wrong restore. | **Fixed.** Captured before collapse and compared within 1px. |
| A5 | The harness never mounts below the cliff; collapsed-state shelf edge and height untested. | **Fixed.** §5b (above); the collapsed shelf edge is dragged and asserted at 32px. |

## Reviewer B

| # | Finding | Disposition |
|---|---|---|
| B1 | **Material.** Same as A2. | **Fixed** (A2). |
| B2 | **Material.** A collapsed region loses its accessible name and landmark. | **Fixed.** `Rail` and `Strip` render `<section aria-label>` named like the full region; unit test asserts the landmark; harness asserts the rail's expand control sits inside the "Navigation" region. The decorative initial stays hidden. |
| B3 | **Material.** Free-form `ReactNode` slots for the compact states; a caller could make the shelf unrecoverable; eight flat props. | **Fixed.** The preset renders `Rail`/`Strip` itself; the API is back to five region slots and the way back exists by construction. Titles come from one record (`studio-regions.ts`) shared by the toolbar, the compact states, and the landmarks. |
| B4 | **Material.** The ASCII diagram lost a box character and its padding. | **Fixed.** Redrawn and column-counted. |
| B5 | **Material.** No story shows a rail or strip. | **Fixed.** `studio-cockpit--compact-states` collapses all four regions once every panel has attached. Probed headless: 32/48/32/48 with four expand controls, no errors. Screenshot `screenshots/story-studio-cockpit--compact-states.png`. Reviewer C found the first version fought the user (C2); fixed there. |
| B6 | **Material (interpretation).** The request said "rail" for the bottom; the bottom got a strip, and nothing recorded the substitution. | **Named, not changed.** The preset header states the decision: a horizontal edge collapses to a strip because a rail is a vertical form. Flagged to Ryan in the report as the one reading he may overrule. |
| B7 | Stale hide/show wording in friction notes, tokens, regions context, spec, `pinnedPanel` doc. | **Fixed.** All five swept; `pinnedPanel` no longer calls the kit's pinned panel a "rail". |
| B8 | Tautological test names after the rename; story comment. | **Fixed.** |
| B9 | `pinnedPanel`'s second parameter untested. | **Fixed.** Spec asserts `pinnedPanel(topHeight, strip).collapsedSize === strip`. |
| B10 | Token comment cited a kit "activity bar" that does not exist. | **Fixed.** Cites `AppShell.tsx` `TOP_HEIGHT`. |
| B11 | "48px" overclaims below the body's minimum width. | **Fixed.** Preset and harness header say "above the body's minimum width"; the floor sentence mentions squeezed rails. |
| B12 | Glyph chosen by binary ternary; `region` and `title` could drift. | **Fixed.** One record keyed by region carries title and glyph; `Rail`/`Strip` take `region` only. |
| B (gaps) | No harness proof that compact states survive a reload or that a rail drags open. | **Fixed.** §7b and §6b. |

## Reviewer C (re-review of `053c544`)

Two material findings, both reproduced by the session before anything was changed (C1 with a fresh
Playwright context per width; C2 by reading the story).

| # | Finding | Disposition |
|---|---|---|
| C1 | **Material.** A1 was fixed for the shelf only. Any collapsible panel whose stored share lands under `(collapsedSize + minSize) / 2` at the new window size mounts collapsed: nav dragged to its 160px minimum at 1440px stores 11.127%, which is 100px at 900px, under the 104px midpoint. Measured: nav=48 with a rail and an unpressed toolbar button at 900px and below. Two docs recorded the class of bug as closed. | **Fixed.** `usePanelToggle` takes a `CollapsedMemory` (read/write of the user's collapsed-or-not); on mount a panel that comes up collapsed against a memory that is not "collapsed" is reopened with the library's `expand()`, which lands on the panel's minimum when nothing was recorded. Memory is written from intent only (see D1 for what that means), never from the mount, so a reopen that could not act does not become a remembered collapse; a `collapse()` issued before the mount reconciles (a child's effect) is intent and is not undone. Memory only ever reopens. The preset wires it for nav, context and inspector under `cs:collapsed:<project>:<panel>` (`collapsedKey` in contracts); the shelf stays session-only. Harness §5c seeds C1's exact share into a 900×800 context: nav mounts at 160px, pressed, no rail; with `cs:collapsed:default:nav = 1` it stays a rail. §7b asserts the bits are written (`111`) and cleared (`000`). Six hook tests cover the reconcile, the intent case and the no-slack case. Preset header and `references/friction-notes.md` corrected. |
| C2 | **Material.** `CollapseAllOnMount` rendered inside the shelf it collapses; expanding the shelf remounted it with a fresh ref and collapsed everything the user had opened. Measured on the built bundle: three opened regions wiped on shelf expand, every time. | **Fixed.** `CollapseAll` renders nothing and lives in the manuscript slot, the one region that never collapses; the shelf shows the real toolbar. Probed on the built bundle: mounts 32/48/32/48 with four expand controls; opening nav, inspector and context then expanding the shelf twice leaves them at 288/345/180 with the toolbar's four buttons back, zero errors. Screenshot `screenshots/story-studio-cockpit--compact-states-after-expands.png`. |
| C3 | The session-store test asserted only that two panels rendered. | **Fixed.** Spies on `Storage.prototype.getItem`/`setItem` assert zero reads and zero writes. The "remount comes back at defaults" half is not testable in jsdom (no measured layout); the harness covers it (§5b, §7b). |
| C4 | Harness §8 restored the context shelf with `> 100`, the same loose check A4 removed elsewhere. | **Fixed.** Height captured before the Enter and compared within 1px. |
| C5 | Harness §8c named the landmark but tested containment. | **Fixed.** Asserts `document.activeElement` is `SECTION[Navigation]`. |
| C6 | The handoff's landmark got Chrome's default ring, not the design-system ring. | **Fixed.** `Rail`, `Strip`, the toolbar's section and the app's regions set `tabIndex={-1}` in JSX and carry `LANDMARK_FOCUS`: the separators' ring classes, inset 2px so the panel edge does not clip it. Measured after a rail expand: `SECTION[Navigation] tabindex=-1 outline=solid 2px oklch(0.64 0.17 45) offset=-2px`; the separator under a real Tab reads the same `solid 2px oklch(0.64 0.17 45)` once its 120ms `transition-colors` (which lists `outline-color`) settles. Screenshot `screenshots/landmark-focus-ring-light.png`. The runtime `tabIndex = -1` assignment stays as the fallback for caller content. |
| C7 | The AGENTS.md headless-verification paragraph rode into `053c544` unreviewed. | **Accepted, and routed.** The paragraph was rewritten in `ad71d78` (the Ladle fix); reviewer C read the first version, reviewer D is briefed to review the current one as a governing rule. |
| C8 | "Top shelf" was a landmark only while collapsed. | **Fixed.** `StudioToolbar` renders `<section aria-label="Top shelf">`; the app spec asserts five landmarks including the top shelf inside `#top`; the landmark list in the browser reads Top shelf, Navigation, Manuscript, Context shelf, Inspector. |
| C (env) | `ladle serve` fails in this workspace (rolldown `moduleType` under Ladle's bundled Vite 6); `build` + `preview` works. | **Noted.** Already the recommended path in friction notes; brief D says so explicitly. Not in this wave's scope. |

Beyond C1–C8, one line of scope: the app's placeholder regions gained `h-full` so the landmark ring
outlines the column rather than the heading's box.

## Reviewer D (re-review of `709252e`)

Two material findings; D1 reproduced by the session before anything was changed (mount 1440 → 600 →
1440 → reload: nav 48px, bit `1`, share 3.338%).

| # | Finding | Disposition |
|---|---|---|
| D1 | **Material.** `onResize` recorded every size change as intent, and the library fires it from a ResizeObserver for a window squeeze too. Below ~700px wide the body cannot hold nav + centre + inspector, the library rails the nav, the bit is written `1` and the degraded share is stored; on a wide reload the bit tells C1's reconcile to stand down, so the rail is permanent. C1 made that state stickier than before. | **Fixed.** Memory is written from intent only: `collapse()` and `expand()`, and a layout change the library attributes to the user. `Cockpit` composes `useDefaultLayout`'s save with the group's `onLayoutChanged` and, when `meta.isUserInteraction` is true (a released drag, a separator key; never imperative calls, mount or window resize), notifies every panel of that group through a context; `Cockpit.Panel` registers the binding's new `onUserLayout`, which the hook maps to `sync(true)`. `onResize` is state only. Measured after the fix: the same sequence leaves no bit and reloads with nav open and pressed. Harness §1 asserts a plain mount writes no bit; §1b squeezes to 600px, asserts the rail, no bit, and an open pressed nav after a wide reload; §7 asserts a released drag writes the bit; §6a asserts the library's own keyboard path (ArrowRight on the nav separator) and the double-click reset do (added after reviewer E). One rider, named by reviewer E: `Cockpit` now wires only the release-time `onLayoutChanged`, not the hook's deprecated per-move `onLayoutChange`, so a layout is saved when a drag ends rather than during it. **Residual, recorded:** the stored share still degrades on a squeeze (nothing stops the library saving it), so that reload reopens nav at its 160px minimum, not its old 288px. The library's `onlySaveAfterUserInteractions` would keep the share but also stop saving toggle collapses (`useDefaultLayout` returns early on `!isUserInteraction` when it is set), which the bit would then have to restore on mount, before paint, to avoid a flash. Not taken in this wave; the friction note records it as the door. |
| D2 | **Material (governing rule).** The AGENTS.md paragraph's headline was absolute but its last sentence let an agent grant itself a visible browser and merely say why; the ban list read as an enumeration, and `playwright-cli show --annotate` (a dashboard window) and the `playwright test --ui` family were unlisted. | **Fixed.** The only exception is Ryan saying so in the current session; an agent's own reading of necessity is never one. The bans are stated as examples of the principle, not its extent, and now include `show --annotate`, `playwright test --ui` / `--debug` / `PWDEBUG=1`, `show-report`, `show-trace` and computer-use. The memory file carries the same wording. Reviewer E reviews the rewritten paragraph. |
| D3 | "Memory is written on transitions only, never from the mount" was false: a plain mount wrote all three bits (`0`) through the ResizeObserver's first `onResize`. | **Fixed by D1.** `onResize` writes nothing. Harness §1 measures it: no `cs:collapsed:` key after a plain mount. The hook header, the disposition and the friction note now say "from intent only" and name the sources. |
| D4 | C4's exact-restore assertion in harness §8 sat at the 180px default, so a fallback to the default would pass. | **Fixed.** §8 drags the shelf 60px off its default first and asserts it is off (`240px`), then the Enter round trip must restore that exact height. |
| D5 | The hook tests ratified the defect: `dragTo` was a bare `onResize` and asserted a write. | **Fixed.** `resizeTo` is the bare size change and asserts no write; `dragTo` is the size change followed by `onUserLayout` and asserts the write; the mount guarantee lives in the harness (§1) where a real ResizeObserver can falsify it. |
| D (clean) | C1's table, memory identity, StrictMode, the consumer-collapse guard, C2 on the built bundle, C3's spy direction, C5's sensitivity, C6's ring token after the transition with no clipping and no Tab-order entry, C8's five landmarks in both extremes, scope. | Named checks, citations spot-checked by the session (the ring measurements match the session's own; the Tab-walk claim was not re-run). |

## Evidence (run by the session, 2026-09-04, after the D fixes)

- `pnpm nx run-many -t typecheck lint test --skip-nx-cache` → exit 0, 17 tasks across 6 projects; 50 unit tests.
- `pnpm verify` → exit 0 (typecheck, lint, token lint, test, stories, build, harness on the built bundle).
- `node tools/src/verify/cockpit.mjs` → 63 passed, 0 failed (dev server); `--preview` → 63 passed, 0 failed.
- Squeeze probe (session): mount 1440 → nav 288, no bits; 600 → nav 48, no bits; back → 48, no bits; reload → nav 160 open, no bits.
- Screenshots: `screenshots/cockpit-rails-light.png`, `screenshots/cockpit-rails-dark.png` (every region collapsed in the app), `screenshots/story-studio-cockpit--compact-states.png`, `screenshots/story-studio-cockpit--compact-states-after-expands.png`, `screenshots/landmark-focus-ring-light.png`, `screenshots/separator-focus-ring-light.png`.

## Reviewer E (re-review of `b8c732e`)

One material finding, reproduced by the session before anything was changed (toolbar collapse → bit
`1`; double-click the separator → nav 288, bit still `1`; squeeze and reload → nav 48).

| # | Finding | Disposition |
|---|---|---|
| E1 | **Material.** The separator's double-click reset is a user gesture the library routes through its imperative `resize()`, which `onLayoutChanged` does not attribute to the user, so a rail reopened that way left the bit at `1` and the next squeeze made the rail permanent: D1's failure, verbatim, and a regression against wave two where `onResize` recorded it. | **Fixed, at the group rather than the separator.** E suggested `onDoubleClick` on the separator; that never fires, because the library resolves the gesture through its own inflated hit regions and the 1px separator element is never the event's target (measured: window-capture, root and document listeners see the event, the separator's own does not). `Cockpit` holds the group's imperative handle, snapshots `getLayout()` on a window-capture `dblclick`, and after the dispatch notifies its listeners only if the layout changed, so a double-click that reset nothing (or on a `disableDoubleClick` separator) writes nothing. Measured: double-click reopen → bits `0-0` (nav and inspector, the body group; context untouched), squeeze and reload → nav 160 open. Harness §6a asserts it. No jsdom unit test: the library needs a measured layout to resolve the gesture. |
| E2 | Harness §8's "keyboard collapse" bit assertion tested the app's Enter handler (a `collapse()` write), not the library's keyboard attribution; the D1 row overstated it. | **Fixed.** §6a presses ArrowRight on the nav separator from a fresh state and asserts the group's bits appear (`0` from `-`) and the nav grew; the §8 assertion is retitled to name the app's Enter handler; the D1 row corrected. |
| E3 | AGENTS.md banned `show --annotate`, the dashboard's mode flag, not the dashboard. | **Fixed.** `playwright-cli show` is banned outright, with or without `--annotate`; the memory file matches. |
| E4 | The refactor silently dropped the hook's deprecated per-move `onLayoutChange`, so layouts persist on release only. | **Recorded.** Benign and preferred; now stated in the D1 row and in a comment beside the destructure. |
| E (clean) | D1's table from scratch; the residual and the `onlySaveAfterUserInteractions` reasoning against the library source; D3 measured; broadcast reaches unmoved panels and stays within its group; no listener leak; StrictMode; D4 revert-sensitive with a genuine 240px replay; D5; the rewritten AGENTS.md rule as a governing rule (only E3's token wrong); scope. | Named checks; the session's own measurements agree. |

## Evidence (run by the session, 2026-09-04, after the E fixes)

- `pnpm nx run-many -t typecheck lint test --skip-nx-cache` → exit 0, 17 tasks across 6 projects; 50 unit tests.
- `pnpm verify` → exit 0 (typecheck, lint, token lint, test, stories, build, harness on the built bundle).
- `node tools/src/verify/cockpit.mjs` → 67 passed, 0 failed (dev server); `--preview` → 67 passed, 0 failed.
- Double-click probe (session): toolbar collapse → bit `1`; double-click → nav 288, bits `0-0`; squeeze and reload → nav 160 open, bits `0-0`.

## Re-review

Reviewer F: pending at the time of writing; findings and disposition appended when it returns.
