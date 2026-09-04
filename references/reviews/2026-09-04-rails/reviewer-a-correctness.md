Review complete — two material findings, both confirmed in the browser, and the suites are green.

---

## Findings

### 1. MATERIAL — the top shelf opens collapsed on any window shorter than ~750px, taking the whole toolbar with it

A layout stored at 1440×900 with nothing collapsed reopens with `#top` at 32px and the toolbar gone, purely because the window is shorter. No error, no user action.

```
@1440x900: top=48px toolbarButtons=1 expandStripBtn=0
@1440x760: top=48px toolbarButtons=1 expandStripBtn=0
@1440x740: top=32px toolbarButtons=0 expandStripBtn=1   ← cliff
@1280x660: top=32px toolbarButtons=0 expandStripBtn=1
```

(fresh browser context per row, seeded with `{"cs:layout:default:root":"{\"top\":5.339,\"body\":94.661}"}` — the untouched default written at 900.)

The mechanism is in the library, and this commit is what makes it bite. On mount the group validates the *stored* layout against constraints derived from the *current* group size — `packages/shell/node_modules/react-resizable-panels/dist/react-resizable-panels.js:1493-1497` derives `a = ve(e)` from the live size and immediately runs `X({layout: c, panelConstraints: a})`. The pixel-preserving correction `Ut()` that would have converted 48px-at-899 into 48px-at-739 is only wired to the ResizeObserver (`:1461`), never to mount. So a percentage authored at one height is compared, unconverted, against a threshold computed at another. `Z` then snaps anything below the midpoint to the collapsed size:

```js
// react-resizable-panels.js:659-662
if (A(o, r) < 0)
  if (s) {
    const l = (i + r) / 2;          // (collapsedSize + minSize) / 2
    A(o, l) < 0 ? o = i : o = r;    // below the midpoint → collapsedSize
  }
```

That midpoint is what `apps/studio/src/app/studio-cockpit.tsx:98` moved. With `collapsedSize = 0px` it sat at 24px, so the cliff was a 450px-tall group — a window nobody has. With `cockpitSizes.strip` (32px) it sits at 40px, and `0.05339 × G < 40` puts the cliff at G ≈ 749. A 1280×800 laptop with browser chrome lands at roughly 700 CSS px. **The commit turned an unreachable edge case into the common one.**

Live resizing is fine — I shrank 900 → 600 with the shelf expanded and it held 48px at every step, because `Ut` keeps the pixel size exact and `Z` then sees `size === minSize`. The defect is mount-only, which is exactly why nothing catches it.

`#nav` and `#inspector` have the same shape (midpoints moved 80→104px and 100→124px), but their thresholds land below ~680px width, where the body group already can't satisfy `160 + 320 + 200` of minimums. That's over-constraint, not this defect.

**Fix.** Stop letting a percentage decide a pinned panel's state. `#top` is `minSize === maxSize === cockpitSizes.topHeight`; its stored share carries no information the token doesn't already have, and the only bit worth persisting is collapsed-or-not. Persist that bit under its own key and reconcile on mount through the toggle — if the persisted intent says expanded and the panel came up collapsed, call `expand()`. Same-day containment if you want it smaller: give the root `Cockpit` a non-persisting store so the shelf always mounts expanded and its collapse is session-scoped. Shrinking `strip` back toward zero only moves the cliff; it does not remove it.

### 2. MATERIAL — keyboard focus falls to `<body>` at every transition that unmounts the control the user just pressed

The commit's premise is that each compact state carries its own way back. The control works; it strands the keyboard user.

```
focus before click: BUTTON("Top shelf")
top h 32   focus after collapse: BODY
top h 48   focus after expand-from-strip: BODY
nav w 288  focus after expand from rail: BODY
```

Three of the four transitions drop focus, because `studio-cockpit.tsx:98`, `:120` and `:150` swap `topStrip`/`navRail`/`inspectorRail` for the full content and the activated button ceases to exist. The next Tab restarts from the top of the document. Collapsing nav from the toolbar is the one safe case — that button survives the swap.

Nothing else in the keyboard story is wrong: Enter on the nav separator collapses to the rail and keeps focus on the separator, `aria-pressed` follows, and Enter again restores.

**Fix.** Move focus deliberately across each swap. Have `StudioCockpit` hold a per-region "focus after transition" ref that `Rail`, `Strip` and `RegionButton` set before calling `collapse`/`expand`, and an effect that focuses the counterpart control once the swap has rendered — the `Expand <region>` button after a collapse, the toolbar's region button after an expand. Then assert it: `tools/src/verify/cockpit.mjs:88` already has `focusedLabel()`, so four assertions on `document.activeElement` after the four transitions cost almost nothing.

### 3. MINOR — the rail and strip glyphs are exposed as the button's visible text while the accessible name says something else

`studio-rails.tsx:18` and `:33` put `»`, `«`, `⌄`, `⌃` directly in the button body under an `aria-label`. The accessible name ("Expand navigation") contains none of the visible text, which is the WCAG 2.5.3 shape, and some screen readers announce the glyph in browse mode. The decorative initial two lines down is already handled correctly (`aria-hidden="true"`, `studio-rails.tsx:21`) — the glyphs should get the same treatment.

**Fix.** Wrap each glyph: `<span aria-hidden="true">»</span>`.

### 4. MINOR — one harness assertion would pass on a wrong restore

```js
// tools/src/verify/cockpit.mjs:212
ok('the inspector rail brings it back', (await width('#inspector')) > 100, …)
```

It reported 345. `inspectorMin` is 200px and `inspectorDefault` is 24% ≈ 345px, so `> 100` passes whether the panel restores correctly, at its minimum, or at anything else non-trivial. Its sibling for nav (`:202-206`) compares against a captured width within 1px and is genuinely discriminating.

**Fix.** Capture the inspector's width before collapsing and compare within 1px, mirroring the nav assertion.

### 5. MINOR — the harness cannot see finding 1, and that is a coverage gap rather than luck

All 41 assertions pass while the top shelf silently self-collapses on any window shorter than ~750px. The run never mounts the app below that: sections 1–8 sit at 1440×900, section 4 and section 6 resize *live* (which is the path that works), and section 8b — the only fresh-context mount at another size — uses 1000×**800**, one viewport step above the cliff.

Two smaller gaps in the same area: `:167-169` proves the pinned edge is disabled and immovable only while the shelf is expanded, and `:166` checks the token height only in the expanded state. I probed both in the collapsed state myself and they hold, so these are untested-not-broken.

**Fix.** Add a fresh-context mount at 1440×740 seeded with a default layout, asserting `#top === 48` and that the toolbar is present. That single assertion fails today and passes under finding 1's fix.

---

## Checked and clean

**Ran, with results.** `pnpm nx run-many -t typecheck test lint --skip-nx-cache` → `Successfully ran targets typecheck, test, lint for 6 projects`, 17 tasks, exit 0. `node tools/src/verify/cockpit.mjs` against the dev server on :5180 → `41 passed, 0 failed (dev server)`.

**Brief item 1 — px `collapsedSize` on a percentage layout.** Traced `ve()` (`:72-130`) recomputing every constraint from the live group size on each pass, `k()` (`:638`) comparing at zero tolerance after 3-dp rounding, and `Z` (`:659-665`) snapping to exactly the derived collapsedSize. The zero-tolerance compare is safe *because* the snap restores exact equality. Swept a collapsed nav live across 13 widths from 1439 to 701: `#nav` stayed at 48px and `aria-pressed` stayed `false` at every one, zero failures. Reload at 1440 with nav collapsed: 48px, `aria-pressed="false"`, one `Expand navigation` button. The reload-at-1000 case is finding 1's territory, reported above.

**Brief item 2 — pinned panel with `minSize === maxSize === 48px`, `collapsedSize = 32px`.** It sits at exactly 32.0 collapsed and exactly 48.0 expanded, measured as floats, with no drift after five collapse/expand round trips. The disabled separator refuses a ±120px drag in *both* states (I tested the collapsed state the harness doesn't). No overflow: `#top` reports `scrollHeight === clientHeight` at 32 and at 48; the nav rail reports 48/48 wide and 851/851 tall. Screenshots: `screenshots/review-a-strip-and-rails.png`, `screenshots/review-a-rails-collapsed.png`.

**Brief item 3 — drag with a non-zero collapsed size.** Dragging nav inward lands on 160 (min) then jumps straight to 48, never to 0 and never in between: `-60 → 228`, `-90 → 198`, `-110 → 178`, `-140 → 160`, `-200 → 48`, `-400 → 48`. Dragging a rail outward expands it (48 → 248). Arrow keys on the nav separator walk 288 → 216 → 160 → 48 and stop; ArrowRight from the rail returns 160, which is the library's `expandedPanelSizes[id] ?? minSize` at `:1154`, not a bug in this code. Enter on the nav separator is owned by the library (`:1143-1156` acts on the panel *before* the separator, and nav is collapsible); Enter on the context separator is owned by `toggleContextOnEnter` because `main` is not collapsible. The comment at `studio-cockpit.tsx:85-91` describes this correctly and there is no double-fire.

**Brief item 4 — `usePanelToggle` after the rename.** `collapsed` is written only by `sync()`, which reads `handle.isCollapsed()` rather than testing for zero — the one thing that makes a rail work. The mount effect (`use-panel-toggle.ts:72-74`) catches a restored-collapsed layout, `onResize` catches drags, and both paths agreed with the DOM in every probe, including at 560px where the rail renders at 47.16px under group squeeze (state and rendering stayed consistent). Expanding from the rail's own button and from the toolbar produce identical geometry; the only difference between them is which one survives the swap, which is finding 2.

**Brief item 5 — accessibility, beyond findings 2 and 3.** The expand controls are named `Expand navigation` / `Expand inspector` / `Expand top shelf` / `Expand context shelf`, all distinct from the toolbar's `Navigation` / `Inspector` / `Top shelf` / `Context shelf`, and `getByRole(…, {exact: true})` resolved each to exactly one node. The rail's initial is correctly `aria-hidden`. With the top shelf collapsed the other regions' toolbar toggles are unreachable, but this is not a dead end — every collapsed region carries its own expand, and the strip restores the toolbar.

**Brief item 7 — StrictMode and console.** StrictMode is on (`apps/studio/src/main.tsx:8`). Across every probe — six scripts, dozens of mounts, ~40 viewport changes, all four regions collapsed and expanded — zero console errors and zero page errors. The harness confirms the same at `:108` and `:286`.

**Observation, not a finding.** Below ~680px wide the body group cannot satisfy `navMin 160 + centerMinWidth 320 + inspectorMin 200`, and panels snap to rails in an order that looks arbitrary (at 500px the nav stays open and the inspector rails instead). That is over-constraint rather than a defect in this diff, and the app has no responsive story at that width either way.
