# Menu bar — review disposition

**Feature:** the top shelf as a VS Code-style menu bar over `@creator-studio/menubar`.
**Plan:** `plan.md` (reviewed before approval; see `plan-review.md`). **Commits:** `374e56e` (wave 1,
package) · `970a700` (wave 2, studio) · `070361b` (wave 3, harness + docs) · `09f42d0` (first fix
wave) · `cc75bbb` (second) · `2888f08` (third) · `c90ded1` (fourth) · `4fc0cb1` (fifth) · `6acbf2e`
(sixth) · `02a5213` and `17fe262` (harness only, after the seventh pass) · the record commit that
adds this directory and the friction notes, and the one after it that cites it (row B-m7).
**Gate:** two headless opus reviewers (`command claude -p … --model opus`, read-only tool allowlist),
divergent briefs `brief-a.md` (correctness / buildability) and `brief-b.md` (gaps / honesty /
portability); reports verbatim in `review-a.md` and `review-b.md`. Dispatched by the session, not by
any subagent that wrote code.

## Evidence the session collected itself (before the reviews)

| Check | Command | Result |
| --- | --- | --- |
| Workspace gate | `pnpm nx run-many -t typecheck lint test --skip-nx-cache` | 7 projects green |
| Token lint | `pnpm lint:tokens` | clean (46 files, 127 var() references) |
| Ladle build carries the skin | `BROWSER=none pnpm stories:build` + grep of `dist/ladle/assets/*.css` | 12 `[data-menubar=…]` selectors present |
| Whole gate | `BROWSER=none pnpm verify` | green end to end |
| Cockpit harness | `node tools/src/verify/cockpit.mjs [--preview]` | 73 / 73 dev and built bundle |
| Menubar harness | `node tools/src/verify/menubar.mjs [--preview]` | 52 / 52 dev and built bundle; `screenshots/menubar-1512-view-open.png` |
| Package unit tests | `pnpm exec vitest run` in `packages/menubar` | 31 passed (manifest 3, shortcuts 14, menubar 14) |
| Studio unit tests | `pnpm exec vitest run` in `apps/studio` | 16 passed |
| `kind:portable` goes red | a `probe.ts` importing `@creator-studio/tokens`, `pnpm nx run menubar:lint` | `A project tagged with "kind:portable" can only depend on libs tagged with "kind:portable"`; probe trashed |
| Manifest spec goes red | `@creator-studio/tokens` added to `dependencies`, `vitest run manifest.spec.ts` | 1 failed; manifest restored byte-for-byte, 3 passed |
| Mutations proven red | see below | 5 of 5 |

Mutation checks on the package (each restored byte-for-byte, suite back to green):

1. `MenubarCheckItem` stops forwarding `textValue` → the typeahead spec fails.
2. The shortcut span loses `aria-hidden` → five specs fail (accessible names now include the glyphs).
3. `useShortcuts` ignores the editable-target guard → the text-field spec fails.
4. `useShortcuts` re-registers per render (`[bindings]` dependency) → the registration-count spec fails.
5. `useShortcuts` freezes bindings at mount → the latest-handler spec fails.

Story screenshots (Ladle preview, headless): `screenshots/menubar-story-matrix.png` (gutter alignment
with one item checked, disabled row, separators, group label, submenu chevron),
`screenshots/menubar-story-standalone.png`, `screenshots/menubar-story-dark.png` (system colours under
`color-scheme: dark`).

## Deviations from the plan, decided by the session

| Plan said | Built | Why |
| --- | --- | --- |
| `useShortcuts` called from the toolbar | `StudioShortcuts` rendered by the preset through a new `shortcuts` slot on `StudioCockpit`, outside every panel | The toolbar unmounts with a collapsed top shelf; a binding that dies with the shelf could never bring it back, and every other shortcut would die with it. The harness now proves ⌃⌘T round-trips with the toolbar unmounted. |
| §7 "Escape inside the Theme submenu closes only the submenu and focuses its trigger" | Delivered, but Radix's default closes the whole bar from a submenu; `Menubar.Sub` holds its open state and overrides `onEscapeKeyDown` (APG menubar behaviour) | The plan asserted a behaviour the primitive does not have; the override is ten lines and has a spec. |
| Harness §7 order "Dark → reload → System → Escape" | Escape first, then Dark, reload, System | Same assertions; the Escape step needs the submenu freshly opened. |
| `pnpm nx g … --style=css` with the name positional | Name via `--name`, directory positional | The generator's real flag shape; recorded in friction notes by the generate fork. |
| Harness §9 "no `cs:layout:`/`cs:collapsed:` key remains" | Collapsed keys absent; the body layout key present but no longer holding the dragged layout | A fresh mount writes the layout keys at once, so absence is not the test (B-m1). |
| "`Label` and `Group` render their roles" | `Group` renders `role="group"` named by its `label`; `Label` is a plain div (Radix) | Radix's Label has no role; the group's name is the accessible piece, and that is what the spec asserts (B-m2). |

## Findings

Every finding from both reports, its disposition, and where the fix landed (all in the fix commit
unless stated). Both reviewers' citations were spot-checked by the session before acting
(`menubar.css:37`, `styles.css:17`, `shortcuts.ts:104`, `menubar.mjs` §6 and §9, `README.md:86-97`).

| # | Finding | Disposition |
| --- | --- | --- |
| A-M1 / B-M1 | **Material.** `--_mb-max-h` declared on `:root` can never see `--radix-menubar-content-available-height`, which Radix sets inline on the content; every menu got the `80vh` fallback (Chromium: 785.6px, not the ~940px available). | **Fixed.** The `:root` local is gone; `max-height` reads the Radix variable in `[data-menubar='content']` with `80vh` as the standalone fallback, `token-ok`'d there. README's sentence corrected. Harness §2 asserts the computed cap is not the fallback; reverted, it reads 785.6px and goes red. Friction note added. |
| A-M2 / B-M2 | **Material.** Light theme: highlighted row text is `--cs-surface` on `--cs-accent`, 3.49:1, under AA. | **Fixed.** New semantic token `--cs-on-accent: var(--cs-p-night)` in tokens.css (pinned in both themes, with the reason in a comment); the bridge reads it for `--menubar-highlight-fg`. Reviewer A's measurement chosen over B's `--cs-p-ink` because it was measured in both themes. Harness §5 and §7 now measure the highlighted row's computed colours (canvas readback) in light and dark: 5.31:1 and 7.30:1; reverted, light reads 3.49:1 and goes red. |
| B-M3 | **Material.** README's extraction procedure would strand a follow-er: the tsconfigs extend the repo base, the Vite config names the shared setup path, the eslint config extends the root, five dev dependencies are hoisted and undeclared, and imports carry `.js` extensions. | **Fixed.** README step 3 states the `.js` extension resolution; step 5 lists each piece of repo wiring and what to do with it, the four runtime files are named up front, and the dev-dependency list is spelled out. The manifest is unchanged on purpose: it declares the runtime truthfully, and the repo hoists dev tooling for every package. |
| A-m1 | Harness §6 clicks the disabled row's centre, but the row has `pointer-events: none`, so the click lands on the menu behind it and proves nothing. | **Fixed.** `seam.dispatchEvent('click')` on the row itself; Radix's disabled guard is what keeps the menu open. |
| A-m2 | The manual ⌃⌘ check in Ryan's own Chrome is still owed. | **Open, Ryan's.** Named in the report; the harness proves the bindings reach the page in headless Chromium, not that his browser lets them through. |
| A-m3 | `useShortcuts`: a failing `when` guard `return`s, so a later binding on the same keys can never run; `<select>` counts as editable but the docblock does not say so. | **Fixed.** `continue`; docblocks on `when` and `isEditable` updated; a spec proves the second binding fires when the first's guard says no (red under a revert). |
| A-m4 | Four contract properties are not bridged (shadow, min-width, indicator-width, z), so the studio ships the package's raw shadow with no comment. | **Fixed (comment).** The bridge names all four and why (no shadow token exists yet). Left on fallbacks by design. |
| A-m5 / B-m6 | `CompactStates` story mounts the toolbar without the `shortcuts` slot. | **Fixed.** Both studio stories mount `StudioShortcuts`. |
| B-m1 | Harness §9 checks only the collapsed keys after Reset layout, not the layout keys the command also removes. | **Fixed, narrower than asked.** A fresh mount writes `cs:layout:default:body` and `center` immediately (probed: both present after a clean reload), so their absence cannot be asserted. §9 now captures the body layout the drag stored and asserts the post-reset value differs from it, beside the default-share assertion. |
| B-m2 | `Menubar.Label` renders a plain div with no role, and Label/Group are not linked, so the plan's "Label and Group render their roles" was only half true. | **Fixed.** `Menubar.Group` takes `label`; it renders the label with an id and sets `aria-labelledby`, so the group is announced by its heading. Spec: `getByRole('group', { name: 'Layout' })` (red under a revert). `Menubar.Label` stays available standalone and its docblock says it has no role by Radix design. |
| B-m3 | File and Edit are all-disabled with nothing telling a keyboard or screen-reader user why. | **Fixed (partly).** Both menus' rows sit in a `Menubar.Group` labelled `Coming soon`, so the heading is visible and names the group; the harness and the studio spec assert both. With every item disabled nothing in those menus is focusable (Radix sets `focusable: !disabled`), so ArrowDown highlights nothing and the group name is not announced until a real item lands. Recorded as accepted risk below. |
| B-m4 | No assertion that Tab leaves the bar for the region toggles. | **Fixed.** §3: Tab from a focused title lands on a toggle button (it lands on `Top shelf`). |
| B-m5 | `matchesShortcut`'s `code` fallback maps a digit to `Key1`, which never matches. | **Fixed.** `physicalCode()` gives `Key<X>` for letters and `Digit<N>` for digits, nothing for punctuation; spec covers all three (red under a revert). |
| B-m7 | The review record was untracked. | **Open until the closing commit.** Four passes in a row caught this row describing that commit before it existed; it now says nothing about it. The commit that tracks this directory and the friction notes updates this row with its hash, in a second commit, so the citation is only ever past tense. Reviewer stderr files are not part of the record. |

Mutations run on the fix commit, each restored byte-for-byte (hash compared) and the suite green
after: max-height on `:root` again (harness red, 785.6px); highlight-fg back to surface (harness red,
3.49:1; the first attempt looked green because the harness loaded before Vite's watcher saw the edit,
see friction notes); `when` back to `return` (spec red); digits dropped from `physicalCode` (spec
red); `aria-labelledby` removed from Group (spec red). Five of five.

After the fixes: workspace gate green uncached (7 projects), token lint clean, package tests 32
(shortcuts 15), studio tests 16, cockpit harness 73 / 73, menubar harness 59 / 59 on the dev server.
The built-bundle runs and the re-review of the fix commit are recorded below.

## Accepted risks

- First-paint theme flash for a dark-theme user on a light OS (plan decision 5); the door is a
  blocking inline script in `index.html`.
- Reset layout works by reload (plan decision 6); dated: must become a live reset before the editor
  holds unsaved state. Friction note carries the trigger.
- Browser-level availability of ⌃⌘B/J/I/T is proven manually by Ryan, not by the harness (A-m2).
- The `Coming soon` heading in File and Edit names a group whose every item is disabled, so
  nothing there is focusable: ArrowDown highlights nothing, and a screen reader never enters the
  group to hear its name. It is a sighted affordance until the Write milestone lands a real item
  (B-m3, re-review). `aria-describedby` on the menu is the door if a screen-reader user needs it
  sooner.
- Layout keys are rewritten on a fresh mount, so "no layout key remains" after Reset layout is not
  assertable (B-m1); the harness asserts the dragged layout is gone instead.

## Re-review of the fix commit (`09f42d0`)

Same tier and shape: two headless opus reviewers, read-only, divergent briefs
(`rereview-brief-a.md`: does each fix close its finding and break nothing; `rereview-brief-b.md`:
what is still missing and is the record honest). Reports verbatim in `rereview-a.md` and
`rereview-b.md`. Both measured the two material fixes themselves in Chromium (944px cap from
Radix's own variable; 5.31:1 light, 7.30:1 dark) and ran the unit suites and the uncached
typecheck and lint.

| # | Finding | Disposition |
| --- | --- | --- |
| RB-M1 / RA-m4 | **Material (B).** The disposition said the review record was committed; it was not, and neither were the friction notes. | **Fixed.** Row B-m7 reworded; the record and the friction notes go in the closing commit, after this re-review. |
| RB-M2 | **Material.** Muted text (`--cs-ink-muted` = ash on white) is 3.55:1: the shortcut column on enabled rows and the `Coming soon` heading fail AA in the light theme. | **Fixed at the token.** `--cs-p-ash` darkened from 62% to 50% lightness, measured against every light surface: 5.85 on white, 5.51 on paper, 4.90 on linen (52% failed linen at 4.48). Dark's fog on slate is 6.34 and on steel 4.57, unchanged. The whole studio's muted text moves with it (same defect everywhere it is used). Harness §5, §6, §7 now probe the muted shortcut and the heading in both themes; the probe reads the effective background by walking to the nearest painted ancestor. Reverted to 62%, the two light probes read 3.55:1 and go red. |
| RB-M3 | **Material.** README still called `Menubar.Group` a Radix passthrough after it gained `label`. | **Fixed.** Its own bullet: `label` names the group; `Menubar.Label` alone has no role. |
| RA-1 / RB-m1 | The seams used a bare `Menubar.Label`, not the `Group label` the same commit built; and with every item disabled the keyboard half of B-m3 stays open. | **Fixed / recorded.** Both seams are labelled groups; the docblock, the B-m3 row and the accepted risk say why that is a sighted affordance for now. |
| RA-2 | The dark contrast probe was unguarded: an unhighlighted row's transparent background read as black and passed at 17.6:1. | **Fixed.** The dark probe asserts `data-highlighted` first, and `contrast()` resolves the effective background. |
| RA-3 / RB-m2 | The editable guard still `return`ed, so a global binding behind a non-global one on the same keys never fired. | **Fixed.** `continue`, docblock updated, spec added (red under a revert). |
| RA-5 / RB-m3 | Standalone `Menubar.Label` and a bare `Menubar.Group` lost their only coverage; the studio spec did not pin the heading's role. | **Fixed.** Package spec for both bare shapes; the Matrix story keeps a bare heading beside the labelled group; the studio spec asserts three disabled items inside the named group and that the heading has no role. |
| RB-m4 | The accepted-risk bullet cited "A-m7", which is plan-review numbering. | **Fixed.** A-m2. |

After the second fix wave: package tests 34, studio tests 16, token lint clean, cockpit 73 / 73,
menubar 63 / 63 on the dev server. Mutations: ash back to 62% (light muted probes red at 3.55:1);
editable guard back to `return` (spec red). The built-bundle run and the third pass are below.

## Third pass (`cc75bbb`, the second fix commit)

One headless opus reviewer, read-only, briefed on blast radius and honesty (`rereview-brief-c.md`;
report verbatim in `rereview-c.md`). It reproduced every contrast figure with its own oklch→sRGB
conversion, enumerated every consumer of the muted-ink token, and ran the suites and the uncached
gate.

| # | Finding | Disposition |
| --- | --- | --- |
| C1 | **Material.** The region toggles signalled pressed/unpressed with the muted-vs-ink delta alone, and darkening ash narrowed that delta from 4.52:1 to 2.74:1: an AA fix against the background that cost an affordance against the foreground. Darkening the primitive was still the right move (one referent, seven text-colour consumers). | **Fixed.** A pressed toggle now carries a fill (`aria-pressed:bg-surface-muted`) beside the ink change; the token comment states both constraints on ash; harness §4 asserts a pressed and an unpressed toggle differ in fill (reverted, both read transparent and it goes red). |
| C2 | **Material.** Row B-m7 described the record commit as already made. | **Fixed.** Reworded to point at `git log` for the closing commit rather than describe it. |
| C3 | The light highlighted-row probe lacked the `data-highlighted` guard the dark one got. | **Fixed.** Same clause on both. |
| C4 | The background walk stopped at the first non-transparent ancestor and scored a translucent one as opaque black. Latent: nothing in the studio paints partial alpha. | **Fixed.** `contrast()` composites every translucent layer over the first opaque one, top down, and reports `painted`; every probe requires it. Reverted to reading the element's own paint, four probes go red (the dark ones at 2.66:1 against the assumed white). |
| C5 | The studio spec proved the three items are inside the group, not that none escaped. | **Fixed.** `getAllByRole('menuitem')` on the menu has length 3. |
| C6 | Three of the second wave's five changes had no mutation behind them. | **Fixed.** Run: seams back to a bare Label (studio spec red); bare Group given a dangling `aria-labelledby` (package spec red); the background walk removed (four harness probes red). With the two from the second wave, five of five. |

The reviewer's clean passes name: the editable-guard loop walked by hand (exactly one `run()`, and
`preventDefault` only on it), the new spec red under the old `return` by reading the diff, the
Group's ARIA shape with a Separator inside and `...rest` after `aria-labelledby`, the ash blast
radius (seven sites, all `color:`; `cockpit.mjs` reads one colour, the separator's), the highlighted
row's shortcut inheriting the highlight colour (5.32:1, not muted-on-accent at 1.67:1), a missing
element landing as a failed `ok` through `lib.mjs`, and the counts. Its one correction: the brief
said seven contrast assertions; there are six (three pairs, light and dark), and the session's
count was wrong. The pressed-fill check added afterwards is a colour comparison, not a contrast
probe.

Third fix wave, on the dev server: package tests 34, studio tests 16, token lint clean, cockpit
73 / 73, menubar 64 / 64.

## Fourth pass (`2888f08`, the third fix commit)

One headless opus reviewer, read-only, briefed narrowly on whether the third pass's two material
findings closed and whether the commit broke anything (`rereview-brief-d.md`; report verbatim in
`rereview-d.md`). It rendered the toolbar in both themes, measured the fill against the shelf, and
mutated the harness assertion two ways against the preview build.

| # | Finding | Disposition |
| --- | --- | --- |
| D1 | **Material.** The pressed-fill assertion pinned two strings being unequal: the fill collapsed to the shelf colour (1.00:1) or moved to the unpressed button both passed it. | **Fixed.** Replaced by a probe of the pressed button's outline against the backdrop behind it (WCAG 1.4.11's 3:1), which also requires the unpressed outline to fall under 3:1 and the unpressed fill to be transparent; run in both themes. Reverted (outline removed), light reads 1.19:1 and goes red; inverted (outline on the unpressed button), red. |
| D2 | **Material.** The linen fill measures 1.19:1 light / 1.39:1 dark against the shelf, under the 3:1 a state indicator needs, and it is the border colour, so the outline dissolves into it. Ink on the fill is fine (13.4:1 / 10.2:1). | **Fixed.** A pressed toggle takes an ink outline (`aria-pressed:border-ink`): 16.0:1 light, 14.2:1 dark against the shelf, measured by the harness. The reviewer suggested the accent; ink was chosen so four pressed chips do not sit permanently orange in a writer's cockpit, and it measures higher. The fill stays as the chip. The token comment now carries the numbers. |
| D3 | The foreground colour's alpha was dropped where the background's was composited. | **Fixed.** The probe composites a translucent foreground over the resolved backdrop before scoring. Latent: no translucent colour exists in the tree. |

The reviewer's clean passes name: the utility compiles into the built CSS and renders opaque in
both themes; the compositing order, the opaque stop, `painted`, and why the white base cannot mask
a dark regression (`body` paints opaque); all six contrast probes require `painted` and both
highlighted-row probes guard the highlight; no cockpit assertion or spec reads the buttons' colour;
the studio spec's exclusivity check is scoped to the popup; gates uncached (34 + 16 tests, 14
typecheck/lint tasks, token lint, cockpit 73 / 73 and menubar 64 / 64 on the preview build). Two
latent gaps it checked and did not file: `background-image` layers and ancestor `opacity` are not
modelled; neither exists in the tree.

Fourth fix wave, on the dev server: menubar 65 / 65 (the pressed-state probe runs in both
themes); unit suites and cockpit unchanged.

## Fifth pass (`c90ded1`, the fourth fix commit)

One headless opus reviewer, read-only, narrow brief (`rereview-brief-e.md`; report verbatim in
`rereview-e.md`). It injected seven mutations as stylesheets against the dev server and ran the
pre-commit harness from a `/tmp` extraction to prove the probe refactor changed no ratio.

| # | Finding | Disposition |
| --- | --- | --- |
| E1 | **Material.** The outline probe read `borderTopColor`, which a border keeps when nothing draws it: `border-style: none` and `border-width: 0` both passed at 16.04:1. Tailwind's preflight sets `border: 0 solid`, so dropping the `border` utility is one edit away from that. | **Fixed.** The probe reports `drawn` (width > 0 and style not `none`) for an outline and the pressed-state check requires it. The `border` utility removed with the colour kept: both themes go red. |
| E2 | The region toggles had no project focus ring (Chrome's blue UA ring), so a pressed chip's look was defined against a browser default. Pre-existing. | **Fixed, then corrected.** `LANDMARK_FOCUS` on the button gave the ember ring, but its inset offset painted over the pressed outline (sixth pass, F1); the chips now use an outset twin, `CONTROL_FOCUS`. |

Fifth fix wave: menubar 65 / 65 (the drawn-border clause adds no assertion), cockpit 73 / 73,
studio 16, package 34, typecheck and lint 14 tasks over 7 projects uncached.

The reviewer's clean passes name: three of the four regressions the brief listed caught for the
right reason, the shelf repaint caught by construction (3.84 / 3.50, red), `border-transparent`
caught through alpha; top is representative of a uniform border and a one-side regression fails in
the safe direction; the dark run has Navigation unpressed and §9 and §10 prove the restore; 16.04
and 14.16 read off the app, the walk terminating on the shelf panel's own opaque surface; ink on
the fill 13.43 / 10.20 unchanged; ink over accent has a second advantage, the accent being the
focus colour in both themes; the foreground composite reduces to identity for an opaque colour
and every AA probe returned byte-identical ratios before and after; cockpit and app.spec read only
`aria-pressed`; both chips 87 × 22 at the same x, so §10's geometry cannot shift; gates run
uncached.

## Sixth pass (`4fc0cb1`, the fifth fix commit)

One headless opus reviewer, read-only, narrow brief (`rereview-brief-f.md`; report verbatim in
`rereview-f.md`). It replayed the probe against the shipped code with mutations injected as
stylesheets, and rendered a focused pressed chip.

| # | Finding | Disposition |
| --- | --- | --- |
| F1 | **Material.** `LANDMARK_FOCUS` ends in a negative outline offset (inset, for landmarks flush with a panel edge), so on a focused pressed chip the ring painted over the 1px ink outline and the pressed state fell back to the 1.19:1 fill; the ring's inner neighbour was the fill at 2.93:1 light. | **Fixed.** `CONTROL_FOCUS`: the same ring, outset, for a control with its own border. The border stays visible under focus and both of the ring's neighbours are the shelf (3.49:1 light, 6.46:1 dark; the sixth-pass report, this row's first version and the commit message of `6acbf2e` said 3.29 and 7.30, which the seventh pass traced to the wrong pairings, paper and the dark highlighted row; the commit message cannot be corrected). Harness §3 asserts the focused toggle's ring is drawn at a non-negative offset over an intact 1px border; on the inset ring it goes red. |
| F2 | The landmark constant's docblock described only its landmark use, which is how the inset reached a bordered control. | **Fixed.** Both docblocks say why the offsets differ. |

Sixth fix wave: menubar 66 / 66 (the ring-placement check), cockpit 73 / 73, studio 16, package
34, typecheck and lint 14 tasks over 7 projects uncached; `pnpm verify` exit 0 on the built bundle.

The reviewer's clean passes name: E1 closed against the shipped code (`border-style: none`,
`border-width: 0`, the dropped utility, and `hidden` all red); Chrome clamps any non-zero border
to one device pixel, so `> 0` is exactly "painted"; `transparent` caught through alpha; one-sided
borders fail safe; the text probes unchanged digit for digit; the ring is `--cs-focus` and truly
focus-visible (Tab paints, click does not); nothing asserted the old ring; geometry unmoved;
gates uncached.

## Seventh pass (`6acbf2e`, the sixth fix commit)

One headless opus reviewer, read-only, briefed on the sixth pass's closure and on the honesty of
this record (`rereview-brief-g.md`; report verbatim in `rereview-g.md`). It read the rendered
pixels of a focused pressed chip in both themes, tested the ring at five viewport widths, replayed
the new assertion under eleven injected mutations, and checked nine of this document's `Fixed`
rows against the tree.

| # | Finding | Disposition |
| --- | --- | --- |
| G1 | **Material.** Row B-m7 cited `git log` for a record commit that did not exist; the command resolved to wave 1. Fourth recurrence. | **Fixed.** The row is `Open until the closing commit` and names no commit; the closing commit updates it with its own hash in a second commit, so the citation is only ever past tense. |
| G2 | The ring-neighbour figures in the F1 row and in `6acbf2e`'s message (3.29 / 7.30) were the wrong pairings; measured 3.49 light, 6.46 dark. Conclusion unchanged. | **Fixed** in the F1 row, with the provenance of the wrong numbers; the commit message stands as written. |
| G3 | The ring-placement check measured geometry only: a ring the colour of the shelf, transparent, or fallen back to `currentColor` (the focus token dropped, which makes it the pressed outline's colour) stayed green. | **Fixed, in two commits.** The probe reads `outlineColor`; the focused toggle's ring must clear 3:1 against the shelf and sit more than 40 RGB units from the pressed border's colour. The first version compared colour strings and probed straight after Tab: the chip transitions its colours for 150ms, so it read the interpolation (ink, serialised as oklab), and the string inequality passed on serialisation alone; the focus-token mutation stayed green, which the session caught from the probe's own output. The follow-up (`17fe262`) settles 300ms and compares numerically. Its commit message says the mutation then went red; it had not: removing the `outline-focus` class makes Chrome fall back to its own blue ring, which is distinguishable and passes, so that mutation was the wrong revert. The reviewer's scenario, the focus token made unresolvable in the Tailwind bridge, was run afterwards and goes red (ring 16:1 against the shelf, 0 from the border); a transparent ring goes red at 1.00:1. Those two are M16. 66 → 67. |
| G4 | The fifth and sixth pass sections carried no counts line, so the record's newest tally was stale. | **Fixed.** Both sections close with their counts. |

Clean passes named: F1 read off the pixels (shelf → ember 2px → shelf 2px → ink 1px → fill, both
themes); no collision with a neighbour (4px clear) or the viewport at 1512, 1440, 1180, 1024 and
900, bounded by the toolbar's own padding; the outset ring clears the two clipping ancestors by
9px above and below; F2's two docblocks; four gates run; eight of nine sampled `Fixed` rows
resolve in the tree (the ninth is G1); the inset-ring mutation red as the sixth-pass row claims.

No code finding remained after this pass; the review loop stops here.

## Closing state

Final numbers, on the built bundle (`BROWSER=none pnpm verify`, exit 0, after `17fe262`):

| Check | Result |
| --- | --- |
| Workspace gate, uncached | typecheck · lint · test green, 7 projects |
| Token lint | clean: 46 files, 57 tokens, 127 `var()` references |
| Package unit tests | 34 (manifest 3, shortcuts 16, menubar 15) |
| Studio unit tests | 16 |
| Cockpit harness | 73 / 73, 1440 × 900 |
| Menubar harness | 67 / 67, 1512 × 982 @2× (52 at the first review) |
| Mutations proven red across the wave | 16 of 16 (M1–M16 in the sections above) |

Gate cost: two opus reviewers with divergent briefs on the code, then five narrow opus passes on
each fix commit in turn (seven headless runs; every one read-only, every report verbatim in this
directory). Passes stopped at the first that returned no code finding: the seventh's Material was
this record's own commit status, closed by committing it.

Still owed by Ryan: the four ⌃⌘ bindings pressed once each in his own Chrome, since headless
Chromium has no browser chrome to intercept them.

