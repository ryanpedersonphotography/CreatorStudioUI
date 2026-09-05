# Panel controls spec — review record

**Artifact:** `references/specs/2026-09-05-panel-controls.md`. **Gate:** two opus reviewers per
round, headless, read-only, divergent briefs (A: correctness and buildability against the code and
the installed libraries; B: what is missing for a foundation that must not be stripped later).
Round 1: `brief-a.md`/`brief-b.md` → `review-a.md`/`review-b.md`. Round 2 on the revised spec:
`rereview-brief-a.md`/`rereview-brief-b.md` → `rereview-a.md`/`rereview-b.md`.

## Round 1 → spec revision

| # | Finding (headline) | Disposition (where in the spec) |
|---|---|---|
| A1 | Material. `collapse: 'rail'` cannot pick rail vs strip: no panel knows its axis. | Fixed. `Cockpit` publishes orientation on context; `collapse` resolves the size (*The shell*). |
| A2 | Material. `collapse` and `collapsedSize` are two sources for one library prop. | Fixed. `collapse` is the only source; `pinnedPanel` drops the parameter; the studio stops passing it. |
| A3 / B2 | Material. The sized element is the library's outer div; `className` reaches the inner one, so the slide animates nothing. | Fixed. `Cockpit.Panel` forwards `data-*` to the outer element; the slide is a global rule on `[data-panel][data-sliding]`. |
| A4 | Material. `overflow` is inline on both elements; a stylesheet cannot clip. | Fixed. The clip is `!important` with the reason beside it. |
| A5 / B2 | Material. The transition property the browser reports is `flex-grow`, not `flex`. | Fixed. The rule and the motion assertion name `flex-grow`. |
| A6 | Material. Arming one panel makes its neighbours jump: `flex-grow` is a share. | Fixed. The whole group is armed for one duration. |
| A7 | Material. The disarm timer cancels a transition a test has paused; the mid-slide baseline records the end state. | Fixed. Disarm on `transitionend`/`transitioncancel`, or after 5× duration only if no animation is running. |
| A8 / B6 | Material. Under `hidden` the focus handoff has no target, and a collapsed top shelf takes every way back with it. | Fixed. The strip carries the four toggles (wave 1); the handoff gains the shelf toggle as its second target (wave 2), which always exists. |
| A9 / B4 | Material. "Assertions keep their count" cannot hold; `menubar.mjs` unlisted; wave 1 removed the rails the harness proves. | Fixed. Wave 1 keeps today's rails and changes only the controls; `hidden` becomes the default in wave 2 with the menu; both harnesses named; changed assertions are named in commits. |
| A10 | Material. The contrast probe has no mode for an SVG stroke. | Fixed. The glyph uses `currentColor`; the probe gains a `color`-on-SVG mode. |
| A11 / B11 | Material. No tokens for rail/strip sizes or a shadow; rem fallbacks disagree with px. | Fixed. Two size tokens tied to `sizes.ts` by a spec; px fallbacks; shadow and z left on the fallback, stated. |
| A12 / B1 | Minor / Material. `data-panel` collides with the library's attribute. | Fixed. `data-pc`. |
| A13 | Minor. Two portable packages could import each other under the constraint as written. | Fixed. `onlyDependOnLibsWithTags: []`. |
| A14 / B15 | Minor. Toolbar order vs `STUDIO_REGIONS`; `VIEW_ORDER` already is the spatial order. | Fixed. The toolbar maps `VIEW_ORDER`; the comment is corrected. |
| A15 | Minor. The rail's control shared the toolbar toggle's accessible name. | Fixed. `Expand <region>`, today's name. |
| A16 | Minor. The harness's storage whitelist; `--cs-on-accent` for the highlight ink. | Fixed both. |
| B3 | Material. Nothing decided what a hidden panel is to the keyboard or a screen reader, or what is announced. | Fixed. `inert` + `visibility: hidden` on collapsed content; a polite live region for menu and shortcut toggles. |
| B5 | Material. Window resize while hidden: a silent, useless toggle. | Fixed. The toggle is disabled with the reason in its tooltip when the group has no slack; the variant is kept. |
| B7 | Material. Hover, focus and disabled had no story, baseline or assertion; no `disabled` prop. | Fixed. `disabled` + `disabledReason`; stories declare hover/focus in Ladle meta and the visual spec honours it. |
| B8 | Material. No seam to put the studio in a state for a baseline; unbounded count. | Fixed. `{ view, steps }` descriptor; 14 studio baselines named. |
| B9 | Material. The seams did not reach the card-beside-the-text example. | Fixed. `glyph` override; peek anchored to the body group; the fixed slots of `StudioCockpit` named as the opinionated layer. |
| B10 | Material. Rail content contradicted itself; the strip's title. | Fixed. Sidebar rail: icon only. Shelf strip: icon and title. The letter goes. |
| B12 | Material. The mount reconcile's re-expand: slide or jump? | Fixed. No slide on the reconcile; asserted. |
| B13 | Minor. The preference key made its own door a migration; reset unspecified. | Fixed. `cs:panel-variant:<projectId>:<region>`; reset leaves variants, recorded in the key list. |
| B14 | Minor. Ark arrives in a parenthetical; jsdom stubs; tooltip dismissal untested. | Fixed. Stated with the extraction cost as an accepted risk; Escape dismisses; stubs recorded. |
| B15 | Minor. Separator of a hidden panel; peek zone vs scrollbar; radio labels vs values. | Fixed. Separator stays a way back; the zone yields to a scrollbar; the accepted set is named. |

Clean passes spot-checked by the session: `animations: 'allow'` after pausing works in the installed
Playwright; accessible-name continuity across both harnesses; the `token-ok` contract block; the
manifest spec copies; Ark 5.39 peers on React ≥ 18; 48/32 match `sizes.ts`; `formatShortcut` is a
twenty-line copy.

## Round 2

Reviewer A (`rereview-a.md`, 13 findings, 7 material) and reviewer B (`rereview-b.md`, 12 findings,
10 material). Citations spot-checked by the session against the code: the library's rest-prop spread
onto the outer element and the group's `elementRef`, the distribution loop's early `break`, the
empty-tags branch of the boundaries rule, `pinnedPanel`'s spec and story callers, the two 200ms
sleeps, the rail rendered as the panel's children, the `shortcuts` slot comment, the three
"nothing vanishes" sentences. Checked 20 of the 40-odd citations; every one held.

| # | Finding (headline) | Disposition (where in the spec) |
|---|---|---|
| A1 / B4 | Material. `usePanelToggle` has no DOM; "arms the whole group" was unbuildable, and a descendant selector would reach nested groups. | Fixed. `Cockpit` exposes its group element; `Cockpit.Panel` arms `:scope > [data-panel]` in a layout effect; the binding carries `collapsed`/`sliding`/`onSlideEnd` (*The shell*). |
| A2 | Material. One transition per panel is false: only panels whose share changed animate. | Fixed. The assertion counts panels whose inline `flex-grow` changed, with the expected integer per region (*Motion*). |
| A3 / B1 / B2 | Material. No content wrapper exists; `inert` for every variant blanks the rail's way back; "state survives" was false. | Fixed. `inert` on the outer element, `hidden`/`peek` only, once `sliding` is false; the preset's swap is the studio's mechanism and the shell rule is the guarantee for other callers (*A hidden panel is hidden to everyone*, *The shell*). |
| A4 / B5 | Material. A natively disabled toggle cannot open the tooltip that explains it, breaks the focus target, and nothing can compute the slack; the rule disabled the wrong direction and left menu and shortcut silent. | Fixed. `disabled` renders `aria-disabled` and stays focusable; no-room is a post-hoc `blocked` state with a `hint` and an announcement, reached from toggle, menu and shortcut alike; the toggle stays enabled (*No room*). |
| A5 | Material. Tooltip not portalled; the shelf clips it; hover/focus baselines would carry a floating overlay. | Fixed. Ark `Portal`; `tooltip={false}` in the hover/focus stories; a settled tooltip-open story instead. |
| A6 / B3 | Material. Wave 1 deleted the measurable pressed border; a filled segment is not something the probe can assert. | Fixed. The pressed 1px border stays (probes unchanged) and the segment's computed `fill` is a second machine-readable channel. |
| A7 | Material. The clip reached neighbours, including the manuscript's scroller. | Fixed. Clip on `data-sliding="self"` only. |
| A8 | Minor. `pinnedPanel` callers in the shell's spec and story. | Fixed. Named, with the nested story's `collapse="hidden"`. |
| A9 / B12 | Minor. A "fourth probe mode" contradicted `currentColor`. | Fixed. `color` mode unchanged; the state channel is the segment's `fill` read directly. |
| A10 | Minor. `:focus-visible` and the focus-opened tooltip need keyboard modality. | Fixed. Tab in the unit test and the visual spec; never `element.focus()`. |
| A11 | Minor. Disarm behaviour on a paused animation unstated; the mid-slide recipe paused one transition. | Fixed. Re-check while an animation runs; a drag disarms; the recipe pauses every `flex-grow` transition and finishes them after the shot. |
| A12 | Minor. No contract rows for the toggle's own box. | Fixed. Five rows added. |
| A13 | Minor. Harness sleeps duplicate the duration. | Fixed. The harness reads the token once and sleeps duration + 100ms. |
| B6 | Material. Wave 1 had grown (strip toggles, live region, no-room) and broke three cockpit assertions. | Fixed. Strip toggles, live region, blocked hint and the second focus target move to wave 2; the strip's order is fixed with its own control first. |
| B7 | Material. The live region inside the shelf it must outlive; no wording for the pinned shelf. | Fixed. In the `shortcuts` slot; "Top shelf collapsed / expanded". |
| B8 | Material. The descriptor could not express peek or the mid-slide shots; no baseline of the strip or the submenu; callbacks would not survive the prune script. | Fixed. `{ view, steps, screenshot? }` as data with an interpreter; `top-collapsed` and `when-hidden-open` added; 18 baselines. |
| B9 | Material. Three documents contradict the plan and were unlisted. | Fixed. *Sentences that change, by wave*. |
| B10 | Material. The peek had no mount point. | Fixed. Body portal, anchor rect, `ResizeObserver`. |
| B11 | Minor. The rail's chevron meaning dropped silently. | Fixed. The rail's control keeps the chevron as its `glyph`. |
| B12 | Minor. `VIEW_ORDER` private; `storyMeta` unnamed; the key-list comment; strip order. | Fixed. `REGION_ORDER` exported from `studio-regions.ts`; `storyMeta()`; the `layoutKeys` comment; the order fixed. |

Also folded from the author's own pass: the contradiction between "three regions keep today's
rails and strips" and "the strip gains four toggles" (the strip changes in wave 2 only, and carries
three toggles beside its own control).

Clean passes that stand from round 2 (both reviewers named the check): outer-element rest props and
`flex-grow` as the sole sizing longhand; nothing in the library rewrites the inline style
mid-transition; `visibility` free on the inner element; orientation under nesting reproduces today's
four collapsed sizes; the empty-tags constraint; Ladle `meta` reaching `meta.json`; the tokens spec
under the lint; Ark's tooltip defaults; no name collision between strip and toolbar toggles; the
preference key shape.

## Round 3

Reviewer A (`rereview3-a.md`, 6 findings, 2 material) and reviewer B (`rereview3-b.md`, 12
findings, 7 material). Both confirm the round-2 mechanisms hold: the binding sets `sliding` only on
calls that acted and the reconcile bypasses it; arming in the layout effect of the library's own
commit starts the transition. Citations spot-checked by the session: no `data-resize-handle` in the
installed library and `data-separator` at its `:2226`; `--cs-accent` and `--cs-focus` the same
token in every scheme; the harness's `apart > 40` and `offset >= 0`; the toolbar's header comment;
the shell's `exports`; jsdom's empty computed `fill` (run by the session: `["", "", "currentColor"]`).
Checked 9 of the 30-odd citations; every one held.

| # | Finding (headline) | Disposition (where in the spec) |
|---|---|---|
| A1 | Material. The drag disarm named an attribute v4 does not have, and the inflated grab area defeats any selector. | Fixed. Any capture-phase `pointerdown` inside the group disarms; the drag assertion is made non-vacuous (toggle, then `mouse.down` within the slide). |
| A2 | Material. Computed `fill` is empty in jsdom and a resolved colour in a browser. | Fixed. Unit reads the attribute; the harness compares the resolved `fill` to the button's `color`, `none` when unpressed. |
| A3 | Minor. The top shelf's transition pair unstated. | Fixed. Two for every region, the root group named. |
| A4 / B10 | Minor. The `!sliding` guard's placement decides whether the pending flag survives. | Fixed. The guard precedes the pending check, stated. |
| A5 | Minor. Two panels of one group overwrite each other's `"self"` mark. | Fixed. Two attributes, `data-sliding` and `data-sliding-self`. |
| A6 | Minor. The shell exports no CSS. | Fixed. `./cockpit.css` export named. |
| B1 | Material. The pressed ring and the focus ring bridged to one token; the harness requires them apart and the ring outset. | Fixed. Highlight border → `--cs-ink` (today's chip), `--panel-focus-offset` added, `aria-keyshortcuts` named as new. |
| B2 | Material. The blocked state reached no sighted pointer user; one string for two axes; no clear condition. | Fixed. `hintAt` opens the tooltip for two seconds on the attempt; width and height hints per group; clears on an acting call, a user layout change, or a window resize; the harness scenario names both axes. |
| B3 | Material. The `menu` step's modes were unstated; peek's dwell had no step; the zone had no hook. | Fixed. `menu` holds, `select` activates, `dwell` holds the pointer; `data-pc="zone"`. |
| B4 | Material. `animations: 'allow'` un-freezes the toggle's colour transition; the mid-slide frames would flake at zero tolerance. | Fixed. The recipe finishes every other animation before pausing the slide. |
| B5 / B7 | Material. The closed `collapse` union contradicted the variant seam and shipped `peek` as a stub shell state. | Fixed. The shell knows `hidden`, `rail`, `{ size }`; the kit's map names each variant's shell behaviour; `peek` is `hidden` to the shell. |
| B6 | Material. Four more documents contradict the plan. | Fixed. The list gains the toolbar header, the handoff doc block, two friction notes and the cockpit harness header. |
| B8 | Minor. `PanelEdge`'s landmark name, glyph override and `children` were guesses. | Fixed. Landmark named by region, control `Expand <label>`, `glyph?` with a `side` default, `children` after the control. |
| B9 | Minor. The strip's own control at default size does not fit 32px with the ring. | Fixed. Every strip control is `compact`. |
| B11 | Minor. Two region orders with nothing tying them. | Fixed. A one-line spec asserts one set. |
| B12 | Minor. Easing and the clip only in a picture; peek timings had no property. | Fixed. Computed `transitionTimingFunction` and `overflow` asserted during the slide; `--panel-peek-open`/`--panel-peek-close` replace `--panel-motion`. |

## Round 4

Reviewer A (`rereview4-a.md`, 9 findings, 5 material) and reviewer B (`rereview4-b.md`, 12
findings, 6 material). Both confirm 12 to 14 of the 16 round-3 rows hold as written, and A settled
four by running them against the installed sources (the `fill` channel in jsdom 27.4 and Chromium,
the easing and clip reads, the `--cs-ink` distance in both schemes, the `./cockpit.css` route).
Citations not yet spot-checked by the session.

**Paused 2026-09-05.** Ryan steered toward a smaller, immediate deliverable (the panel glyph beside
each View item, built the same day; see `apps/studio/src/app/panel-glyph.tsx`). The findings below
are **open**, each with the fix the author intends, and must be folded into the spec before any
wave is planned from it.

| # | Finding (headline) | Intended fix |
|---|---|---|
| A1 | Material. Mapping `peek → 'hidden'` puts the peek zone inside the subtree the shell makes `inert` and invisible; `peek` has no way back. | The zone is not the panel's child: `PanelEdge`'s `peek` case renders nothing in the panel and the preset mounts the zone beside the separator, outside the panel, from the same edge map. |
| A2 / B1 | Material. The blocked-hint scenario's window sizes (700 wide, 500 tall) both have slack; the repo's own figure is 560/600. | Use the harness's calibrated sizes: 560px wide for the navigation, and derive the height from `mainMinHeight + contextMin + top` for the shelf; state both numbers from `sizes.ts`. |
| A3 | Material. Deferring the handoff to the slide's end lets a click elsewhere during the slide be yanked back. | The handoff re-checks at slide end that focus is still where it was captured (or on `body`) before moving it. |
| A4 / B6 | Material. "Any pointerdown inside the group" disarms the root group on a click into the manuscript, and snaps the top shelf. | Disarm only on a `pointerdown` whose target is within the library's inflated separator hit area: the target is a `[data-separator]`, or the pointer is within `resizeTargetMinimumSize` of one; the shell measures against the group's separators' rects. |
| A5 / B4 | Material. The testing contract still says "a landmark named `Expand <region>`"; `PanelEdge` lacks `glyph?` in its prop list. | Correct the unit contract's wording; add `glyph?` to the prop list. |
| B2 | Material. A two-second tooltip makes the clearing assertion undecidable; retraction on clear unstated. | The harness asserts `blocked` through `aria-describedby`/a `data-blocked` attribute on the toggle, not the tooltip's visibility; clearing removes the attribute and closes the tooltip. |
| B3 | Material. `pause-slide` has no verb; the two slide views are identical as written. | `['pause-slide', region, fraction]` performs the toggle itself and pauses at the fraction; `slide-nav-show` first runs `['toggle', 'nav']` to hide, then `['pause-slide', 'nav', 0.5]`. |
| B5 | Material. A new variant needs a label and a radio item, so "the menu code does not change" is false. | The map entry carries the menu label; the menu maps the entries. Then a variant is one entry, one part if needed, one composite view. |
| A6 | Minor. `pinnedPanel`'s doc block in `cockpit.tsx` and `CockpitPanelProps.collapsedSize`'s comment. | Add both to the wave-1 list. |
| A7 | Minor. "The same two for the inspector" reads as navigation and centre. | Name the pair: inspector and centre. |
| A8 | Minor. The compact control fits the strip with zero slack and nothing asserts it. | A one-line spec: compact size + 2 × (ring + offset) ≤ strip size. |
| A9 | Minor. `hintAt` against an Ark API not installed; three writers of `open`. | Note Ark as unverified until installed; the toggle owns `open` as its single state, fed by hover/focus events and by `hintAt`. |
| B7 | Minor. `CONTROL_FOCUS` loses its only consumer in wave 1. | Add `studio-regions.ts:25-31` to the list; either the kit reads the same ring or the export goes. |
| B8 | Minor. The blocked announcement has no region name; two blocked regions collide. | "No room for Navigation: widen the window"; one tooltip open at a time (the latest). |
| B9 | Minor. The top shelf's hint. | State that the pinned shelf cannot block and why. |
| B10 | Minor. The hint has no picture; `resize` is unused. | The tooltip-open story carries a hint; drop `resize` or name its view. |
| B11 | Minor. The peek dwell duplicates `--panel-peek-open`. | The interpreter resolves the dwell from the computed property at run time. |
| B12 | Minor. `disabled` has no caller and costs two baselines. | Keep as kit surface, drop its baselines until a caller exists; say so. |

