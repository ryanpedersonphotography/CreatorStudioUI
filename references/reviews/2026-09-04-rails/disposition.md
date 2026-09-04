# Rail and strip states — review disposition

**Artifact:** the rail/strip wave for the `/goal` "add a rail state to the left/right/bottom and also add
a top strip as well": commit `e60933b` as reviewed, fixes applied on top (commit named at the end).
**Gate:** two independent opus reviewers, fresh context, divergent briefs, headless Playwright CLI
probes against the dev server; one opus re-review of the fix diff. Briefs and reports sit beside this file.

| Reviewer | Brief | Report |
|---|---|---|
| A (opus) | `brief-a-correctness.md` — correctness against react-resizable-panels 4.12.3 | `reviewer-a-correctness.md` |
| B (opus) | `brief-b-gaps.md` — what is missing, overclaimed, or ambiguous | `reviewer-b-gaps.md` |
| C (opus) | `brief-c-rereview.md` — the fix diff | `reviewer-c-rereview.md` |

## Reviewer A

| # | Finding | Disposition |
|---|---|---|
| A1 | **Material.** A shelf stored as a share of a 900px window mounts collapsed on any window shorter than ~750px: the library validates the stored percentage against constraints from the current size without pixel conversion, and the strip moved the collapse midpoint from 24px to 40px. | **Fixed.** The root group is session-only: `Cockpit` now takes an optional `store` and keeps a session-scoped layout without one; the preset omits it for the root. Collapsing the shelf is deliberately session-scoped (documented in the preset header and `references/friction-notes.md`). Harness §5b seeds the stale share into a 1440×740 context and asserts the shelf mounts at 48px with its toolbar; §7b asserts the shelf mounts expanded after a reload. Persisting the collapsed bit under its own key is the recorded door. |
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
| B5 | **Material.** No story shows a rail or strip. | **Fixed.** `studio-cockpit--compact-states` collapses all four regions once every panel has attached. Probed headless: 32/48/32/48 with four expand controls, no errors. Screenshot `screenshots/story-studio-cockpit--compact-states.png`. |
| B6 | **Material (interpretation).** The request said "rail" for the bottom; the bottom got a strip, and nothing recorded the substitution. | **Named, not changed.** The preset header states the decision: a horizontal edge collapses to a strip because a rail is a vertical form. Flagged to Ryan in the report as the one reading he may overrule. |
| B7 | Stale hide/show wording in friction notes, tokens, regions context, spec, `pinnedPanel` doc. | **Fixed.** All five swept; `pinnedPanel` no longer calls the kit's pinned panel a "rail". |
| B8 | Tautological test names after the rename; story comment. | **Fixed.** |
| B9 | `pinnedPanel`'s second parameter untested. | **Fixed.** Spec asserts `pinnedPanel(topHeight, strip).collapsedSize === strip`. |
| B10 | Token comment cited a kit "activity bar" that does not exist. | **Fixed.** Cites `AppShell.tsx` `TOP_HEIGHT`. |
| B11 | "48px" overclaims below the body's minimum width. | **Fixed.** Preset and harness header say "above the body's minimum width"; the floor sentence mentions squeezed rails. |
| B12 | Glyph chosen by binary ternary; `region` and `title` could drift. | **Fixed.** One record keyed by region carries title and glyph; `Rail`/`Strip` take `region` only. |
| B (gaps) | No harness proof that compact states survive a reload or that a rail drags open. | **Fixed.** §7b and §6b. |

## Evidence (run by the session, 2026-09-04)

- `pnpm nx run-many -t typecheck lint test --skip-nx-cache` → exit 0, 6 projects, 42 tests.
- `pnpm verify` → exit 0 (typecheck, lint, token lint, test, stories, build, harness on the built bundle).
- `node tools/src/verify/cockpit.mjs` → 52 passed, 0 failed (dev server); `--preview` → 52 passed, 0 failed.
- Screenshots: `screenshots/cockpit-rails-light.png`, `screenshots/cockpit-rails-dark.png` (every region collapsed in the app), `screenshots/story-studio-cockpit--compact-states.png`.

## Re-review

Reviewer C: pending at the time of writing; findings and disposition appended when it returns.
