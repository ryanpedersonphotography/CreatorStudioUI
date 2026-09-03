Verification complete. Here is the report.

---

# Reviewer A — correctness of the cockpit against react-resizable-panels 4.12.3

Read-only review of `git diff 59a7ed9` + untracked files. Library ground truth: `packages/shell/node_modules/react-resizable-panels/dist/react-resizable-panels.{d.ts,js}` (v4.12.3, per `package.json:4`). Ran the suite, both harness modes, and seven browser probes against `http://localhost:5180`.

## 1. MATERIAL — `pnpm typecheck` is red; the earlier green was a stale Nx cache hit

`packages/shell/src/lib/use-panel-toggle.spec.tsx:29` calls `onResize` with two arguments:

```
src/lib/use-panel-toggle.spec.tsx:29:70 - error TS2554: Expected 3 arguments, but got 2.
Found 1 error.
Warning: command "tsc --build --emitDeclarationOnly" exited with non-zero status code
```

`pnpm nx run shell:typecheck --skip-nx-cache` → **exit non-zero**. `pnpm nx run-many -t typecheck --skip-nx-cache` → **`Failed tasks: - shell:typecheck`**. With the cache warm the same command reports "Successfully ran target typecheck for 6 projects" and Nx itself prints *"Nx detected a flaky task: shell:typecheck"* — that is the cache masking a genuine failure, not flakiness.

`PanelProps["onResize"]` is `(panelSize, id, prevPanelSize) => void` (`react-resizable-panels.d.ts:355`); all three parameters are required at the call site. Fixing the arity alone will not clear it: `PanelSize` is `{ asPercentage, inPixels }` (`d.ts:375-378`), and the literal on line 29 passes `inPercentage`, which is not a field of that type.

This also falsifies `AGENTS.md:38` — "`pnpm verify` is green from the root" — since `verify` runs `typecheck` first (`package.json:16`) and stops there.

**Fix:** `onResize?.({ asPercentage: 0, inPixels: 0 }, 'nav', undefined)` at `use-panel-toggle.spec.tsx:29`, then re-run with `--skip-nx-cache`.

## 2. MATERIAL — below ~692px the toolbar toggles are silent no-ops

The body group's three panels declare minimums of 160px (`nav`), 320px (`center` ← `cockpitSizes.mainMin`) and 200px (`inspector`), plus two 6px separators = **692px required**. Measured at a 680px viewport:

```
{"groupW":680,"nav":157,"center":314,"inspector":196,"separators":[6,6],"requiredMin":692}
```

Every panel is already below its stated `minSize`, so the constraint solver has no slack and imperative deltas cannot be absorbed. Sweeping the viewport (cold start, hide, show):

```
@800: cold=160 hidden=0 after-show=160  ok
@700: cold=160 hidden=0 after-show=160  ok
@680: cold=157 hidden=157 after-show=157  <-- HIDE IS A SILENT NO-OP
@600: cold=0   (auto-collapsed)  after-show=0  <-- SHOW IS A SILENT NO-OP
```

At 680 the button reads "Hide navigation" and clicking it does nothing. At 600 the button correctly reads "Show navigation" (so `hidden` self-corrects — see §9) but clicking it does nothing. No console error, no page error, no visual feedback.

The mechanism, not the threshold, is the durable defect: `PanelImperativeHandle.collapse` and `.resize` return `void` (`d.ts:231,269`), `usePanelToggle` only learns of change through `onResize` (`use-panel-toggle.ts:51`), and `onResize` never fires when nothing moved. So the hook offers a control it cannot honour and has no way to know. Adding a fourth region or raising any `minSize` moves the threshold up into ordinary window widths.

**Fix:** in `use-panel-toggle.ts`, make failure observable — after `collapse()`/`resize()`, re-read `handle.isCollapsed()` and expose a `canToggle` (or return a boolean from `hide`/`show`) so `ToggleButton` (`app.tsx:38-51`) can set `disabled`. Cheaper interim fix: drop `center`'s `minSize={cockpitSizes.mainMin}` (`studio-cockpit.tsx:79`) so the surface can yield the pixels the sidebars need.

## 3. MATERIAL — `panelIds` order silently decides whether anything is ever restored

The library reads under a key built from the `panelIds` prop **verbatim**, and writes under a key built from `Object.keys(layout)`:

```
1850:  a = he(u, n ?? [])            // read key  — the panelIds prop, in the caller's order
1885:  s ? y = he(u, Object.keys(d)) // write key — the layout's own key order
1806:  return `react-resizable-panels:${[e, ...t].join(":")}`;
```

`Object.keys(layout)` is DOM order — confirmed in the browser: `cs:layout:default:body` = `{"nav":0,"center":76,"inspector":24}`. So a caller who passes `panelIds={['main','nav']}` while the JSX renders `nav` then `main` reads `…:main:nav` and writes `…:nav:main`, and the layout is never restored, silently and forever.

`cockpit.tsx:49-54` documents the prop as "list the ids of the ones mounted right now, derived from the same state as the JSX" and gives the key shape — it never says the order must match render order. And the test that would catch it cannot: `cockpit.spec.tsx:57-67` asserts only `store.reads()`, never that anything was written, so its name — *"remembers a conditional panel set under the key extended with its ids"* — describes a round-trip it does not perform (jsdom commits no layout, so nothing is written at all).

To answer the brief's question directly: yes, `cs:layout:demo:root:nav:main` is exactly what 4.12.3 produces for that read, and the prefix shim (`cockpit.tsx:67-73`) is correct — the harness confirms every stored key starts with `cs:layout:default:`.

**Fix:** amend the `panelIds` doc at `cockpit.tsx:50-53` to "in the same order the panels render", and extend `cockpit.spec.tsx:57` to drive a layout change and assert `store.keys()` contains the same suffixed key it read.

## 4. MATERIAL — the pinned panel's headline claim is never exercised, and in the app it is unreachable by construction

`pinnedPanel` (`cockpit.tsx:155-177`) is documented as "fixed in size, inert to dragging, and still hideable through a toggle", and `studio-cockpit.tsx:10` labels the top shelf "pinned · hideable". Nothing tests the hideable half. `grep` across `apps`, `packages`, `tools` finds `topToggle` only at its creation (`studio-cockpit.tsx:39`), its entry in the region map (`:45`), and its spread onto the panel (`:61`). No control anywhere calls it — not in `app.tsx:27-36`, not in the Ladle story's `Toolbar` (`cockpit.stories.tsx:116-124`, which likewise omits `top`), not in the harness.

It is also unreachable *by design*: the toolbar containing every toggle is rendered inside the `top` panel (`app.tsx:18`, `studio-cockpit.tsx:61-63`). Hiding `top` would hide the only means of showing it again.

The claim does hold at source level — `Z` early-returns for disabled panels only when `overrideDisabledPanels` is false (`react-resizable-panels.js:657`), and `le` sets it true for `trigger === "imperative-api"` (`:677`), so `collapse()`/`expand()` on a disabled panel do act. But it is asserted in three comments and proven in none.

**Fix:** either drop `topToggle` and the `'top'` member of `STUDIO_REGIONS` (`studio-cockpit.tsx:24`) as dead wiring, or add a story that toggles a pinned panel from a control outside it, so `pinnedPanel`'s contract has a witness.

## 5. MATERIAL — sidebars do not hold their pixels across a reopen at a different width

`studio-cockpit.tsx:18-19` and the harness header (`tools/src/verify/cockpit.mjs:6`) both promise sidebars "hold their pixels when the window resizes". That is true for a *live* resize and false for a reopen, because layouts persist as percentages (`{"nav":32.594,"center":43.406,"inspector":24}`) while `defaultSize` for `nav`/`inspector` is a percentage too (`sizes.ts:13,21`).

Two browser contexts sharing one localStorage:

```
S1 @1600: nav=518  stored={"nav":32.594,"center":43.406,"inspector":24}
S2 @1000: nav=322
VERDICT: NOT held — 518px became 322px (restored as a percentage)
```

`cockpit.mjs:151-157` resizes the live window and passes, which reads as proof of pixel stability but is not — the resize itself re-persists the new percentage, so the follow-up reload in §3 of the harness can only ever agree. A user who moves between an external monitor and a laptop gets a differently-sized sidebar every time.

The pinned top shelf is immune, because `pinnedPanel` sets `minSize === maxSize` and the constraints clamp it back to 48px.

**Fix:** give `nav` and `inspector` pixel `defaultSize`s to match their `preserve-pixel-size` behaviour, or add a harness assertion that reopens at a new viewport and states the expected (percentage) outcome, so the comment and the test agree on what is actually promised.

## 6. MINOR — `--preview` never builds, and prints "(production bundle)" over whatever is in `dist/`

`cockpit.mjs:9` documents `--preview` as "build first; serves dist/ on :5181". The script does not build: `:29-32` only checks `existsSync(dist/index.html)` and exits if it is missing. A stale `dist/` is served and the run ends with `29 passed, 0 failed (production bundle)` (`:219`). Inside `pnpm verify` this is safe because `build` runs first (`package.json:16`); run standalone it will validate a bundle from a previous commit.

**Fix:** either run the build when `dist` is older than the newest source file, or change the message at `:9` to "requires a prior `pnpm build`" and print the `dist/index.html` mtime alongside the summary line.

## 7. MINOR — `preventDefault()` on the context separator cannot suppress the library's Enter

`studio-cockpit.tsx:49-50` says "The library's own Enter acts on the panel before a separator, so the shelf's separator handles Enter itself", and `:54` calls `event.preventDefault()`. The library's handler checks `defaultPrevented` (`react-resizable-panels.js:1117`) but is registered as a **native listener on the separator element** (`:1517`), while React 19 delegates `onKeyDown` at the root container. The native target-phase listener therefore runs *first*; `preventDefault()` arrives too late to stop it.

The feature works anyway, for a different reason: the library's Enter acts on the panel preceding the separator (`:1147`, `const c = l[0]`) and guards on `m.collapsible` (`:1152`). That panel is `main`, which is not collapsible (`studio-cockpit.tsx:81`), so the library no-ops. Make `main` collapsible and Enter will fire twice — library then app — and cancel itself out. Harness §8 passes today and would keep passing until that change.

**Fix:** drop the `preventDefault()` or replace the comment with what actually protects this — "safe only because `main` is not collapsible" — so the next person does not read it as a guarantee.

## 8. MINOR — `mainMin` and `surfaceMin` are applied across different axes

`cockpitSizes.mainMin` (320px) is applied to `center` (`studio-cockpit.tsx:79`) as a **width** floor; `cockpitSizes.surfaceMin` (240px) is applied to `main` (`:81`) as a **height** floor. Neither token name carries the axis, and `mainMin` is not applied to `main`. `sizes.ts:15-17` comments `surfaceMin` as "The main surface's floor" without saying which dimension, and `mainMin` carries no comment at all. A maintainer will swap them, and §2 shows the cost lands directly on `mainMin`.

**Fix:** rename to `columnMin` / `surfaceHeightMin` (or similar) and comment the axis on each.

## 9. MINOR — assertion strength in two tests

`cockpit.spec.tsx:53` asserts `store.keys()` equals `['cs:layout:demo:root']`, which the test itself wrote on line 42. It proves no *extra* key was written; it does not prove the value was read back and applied — a shim that mangled the value rather than the key would pass. `store.reads()` on `:54` covers the read; the restore is only ever proven in the browser (`cockpit.mjs:146-149`). Worth one line of comment saying so, since the test name reads as a round-trip claim.

`cockpit.spec.tsx:93` — `document.getElementById('top')?.hasAttribute('data-disabled')` — is a genuine assertion, not a tautology: hit regions are only built when more than one *non-disabled* panel is present (`react-resizable-panels.js:194,196`), so removing `disabled` would make the root group draggable. Confirmed in the real DOM: `topHasDataDisabled: true`, `bodyHasDataDisabled: false`.

## Checked and clean

- **Suite.** `pnpm nx run-many -t test --skip-nx-cache` → exit 0, 5/5 projects. `pnpm nx run-many -t lint --skip-nx-cache` → exit 0, 6/6. `pnpm lint:tokens` → exit 0, "no raw values outside `packages/tokens/src/tokens.css`; every var() resolves".
- **Harness, both modes.** `node tools/src/verify/cockpit.mjs` → `29 passed, 0 failed (dev server)`; `--preview` → `29 passed, 0 failed (production bundle)`, exit 0. Port 5181 was free before and after, so the `pnpm`→`vite` child is not orphaned by `preview?.kill()` (`cockpit.mjs:49`).
- **Spread order (Q1).** `{...layout}` precedes `id`/`orientation`/`className` at `cockpit.tsx:88-91`; `useDefaultLayout` returns only `defaultLayout`/`onLayoutChange`/`onLayoutChanged` (`js:1907-1922`), none of which are re-specified. No handler is clobbered. Attaching the deprecated `onLayoutChange` alongside `onLayoutChanged` costs nothing: instrumenting `Storage.prototype.setItem` through a 40-step, ~0.5s drag recorded **1** write (`{"cs:layout:default:body":1}`), because `onLayoutChanged` clears the pending debounce timer (`js:1874,1885`).
- **`hidden` self-corrects on mount (Q2).** Hide nav → reload → `navWidth=0 aria-pressed=false label="Show navigation"`, and one click reopens at 286px. Cold start at 600px where the library auto-collapses nav → `aria-pressed=false`, so `hidden` follows the panel even with no stored layout. Mechanism verified: `useImperativeHandle` attaches at `js:1957` before the panel's `useLayoutEffect` assigns the real methods (`js:1958-1963`, `q = useLayoutEffect` at `js:1547`), so the parent's passive `useEffect` at `use-panel-toggle.ts:47-49` never sees the `isCollapsed: () => !1` placeholder (`js:1948`).
- **StrictMode.** `main.tsx:8` wraps `App` in `<StrictMode>`; all 29 harness assertions and every probe ran under it with `ERRORS: none`, including an all-regions-hidden reload.
- **`resize()` with a percent string (Q2).** `'20%'` parses to `[20,"%"]` at `js:22` and converts against group size at `js:1007-1013`; measured 286px at a 1430px group, 343px for the inspector's `'24%'`. `'180px'` for the vertical context shelf restores to exactly 180.
- **`restoreSize` is genuinely needed.** `expandToSize` is written only inside `collapse()` (`js:987`) and initialised `undefined` (`js:1997`); a drag populates a different store, `expandedPanelSizes` (`js:1756`), read only by the keyboard path (`js:1154`). So `expand()` after a drag-collapse falls back to `minSize` — `use-panel-toggle.ts:30-32` is accurate, and harness §7 confirms the button reopens at 180, not 120.
- **Pinned panel is inert to drag (Q3).** Harness `dragging the top shelf edge moves it zero pixels — 48 → 48`; root group has one non-disabled panel so no hit regions are built (`js:194,196`).
- **At least one relative panel per level (Q4).** root: `body` relative; body: `center` relative (`nav`/`inspector` pixel); center: both relative. Satisfies `d.ts:318`.
- **DOM ids (Q5).** 14 ids on the page, `duplicates: []`, `non-selector-safe ids: []`. React 19.2.8's `useId` uses guillemets, not colons, so the auto-generated separator ids (`js:2228`) are selector-safe here.
- **Built CSS (Q6).** `apps/studio/dist/assets/index-BL7CgK25.css` contains `[aria-orientation=vertical]{width:var(--cs-separator-hit)}`, `[aria-orientation=horizontal]{height:var(--cs-separator-hit)}`, both cursors, and all four `data-separator=` rules (`active`/`hover`/`focus`/`disabled`). `--cs-separator-hit: var(--cs-p-rail)` resolves (`packages/tokens/src/tokens.css:60`). Computed in-browser: both vertical separators 6px wide with `col-resize`, the horizontal one 6px tall with `row-resize`.
- **`Cockpit.Regions` (Q8).** Context identity is the app's `useMemo` (`studio-cockpit.tsx:44-47`); each toggle is itself memoised (`use-panel-toggle.ts:68-71`). The toolbar inside the pinned `top` panel resolves `useCockpitRegion` fine — the provider wraps the whole tree at `studio-cockpit.tsx:59` and `{top}` is rendered as children beneath it, so no hook-ordering hazard. Both error paths are covered by `cockpit-regions.spec.tsx:13,26`, including the known-regions list.
