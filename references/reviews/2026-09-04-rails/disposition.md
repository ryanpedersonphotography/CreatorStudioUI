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
| D (opus) | `brief-d-rereview.md` — the second fix diff, and the AGENTS.md headless rule from `ad71d78` | `reviewer-d-rereview.md` |

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
| C1 | **Material.** A1 was fixed for the shelf only. Any collapsible panel whose stored share lands under `(collapsedSize + minSize) / 2` at the new window size mounts collapsed: nav dragged to its 160px minimum at 1440px stores 11.127%, which is 100px at 900px, under the 104px midpoint. Measured: nav=48 with a rail and an unpressed toolbar button at 900px and below. Two docs recorded the class of bug as closed. | **Fixed.** `usePanelToggle` takes a `CollapsedMemory` (read/write of the user's collapsed-or-not); on mount a panel that comes up collapsed against a memory that is not "collapsed" is reopened with the library's `expand()`, which lands on the panel's minimum when nothing was recorded. Memory is written on transitions only (buttons, drags after the mount settles), never from the mount, so a reopen that could not act does not become a remembered collapse; a `collapse()` issued before the mount settles (a child's effect) is intent and is not undone. Memory only ever reopens. The preset wires it for nav, context and inspector under `cs:collapsed:<project>:<panel>` (`collapsedKey` in contracts); the shelf stays session-only. Harness §5c seeds C1's exact share into a 900×800 context: nav mounts at 160px, pressed, no rail; with `cs:collapsed:default:nav = 1` it stays a rail. §7b asserts the bits are written (`111`) and cleared (`000`). Six hook tests cover the reconcile, the intent case and the no-slack case. Preset header and `references/friction-notes.md` corrected. |
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

## Evidence (run by the session, 2026-09-04, after the C fixes)

- `pnpm nx run-many -t typecheck lint test --skip-nx-cache` → exit 0, 17 tasks across 6 projects; 49 unit tests.
- `pnpm verify` → exit 0 (typecheck, lint, token lint, test, stories, build, harness on the built bundle).
- `node tools/src/verify/cockpit.mjs` → 56 passed, 0 failed (dev server); `--preview` → 56 passed, 0 failed.
- Screenshots: `screenshots/cockpit-rails-light.png`, `screenshots/cockpit-rails-dark.png` (every region collapsed in the app), `screenshots/story-studio-cockpit--compact-states.png`, `screenshots/story-studio-cockpit--compact-states-after-expands.png`, `screenshots/landmark-focus-ring-light.png`, `screenshots/separator-focus-ring-light.png`.

## Re-review

Reviewer D: pending at the time of writing; findings and disposition appended when it returns.
