The fix wave holds up. Every finding marked *fixed* in `disposition.md` is actually in the diff and fixes the thing the finding described — I confirmed each one at a citation. The three defects I found are in the harness and the review record, not in the product code. Full report at `references/reviews/2026-09-03-cockpit/reviewer-c-rereview.md`.

**MATERIAL — harness §8's focus-under-hover assertion cannot fail.** `tools/src/verify/cockpit.mjs:216` moves the mouse using `nb`, the nav separator's box captured at `:113` — before the 160px drag at `:139` moves it. Measured: `nb.x = 288`, live separator `x = 448`, and the stale point resolves to a panel `<div>`. The one assertion protecting B4's central claim hovers nothing. That also makes `disposition.md:35` false where it says the harness measures the outline "under focus and under hover" — it measures it twice under focus. The behaviour is fine (I hovered the real separator with focus held: `data-separator` stayed `focus`, ring stayed `solid 2px`), so this is a regression-detection hole rather than a broken feature — move the ring back onto `data-[separator=focus]` and B4 reopens with this test still green. Re-read the box at `:216`.

**MINOR — §5's shelf-edge drag is still vacuous.** B7 gave it a real separator to land on, but `#top` is pinned twice: `minSize`/`maxSize` both 48px (`cockpit.tsx:174-175`) *and* `disabled: true` (`:176`). A pointer drag hits `react-resizable-panels.js:657`, which returns the previous size for a disabled panel, and `:665` would clamp it back regardless. What actually proves `disabled` is `:166` and `:212` — both real — so only the message overpromises.

**MINOR — §8b computes its expectation from a nav width read two sections earlier** (`:243` uses `navShown` from `:180` against a live `bodyWide`). Correct today because §7–8 only move the context shelf, but the message hides the dependency. It does prove what it claims, though: I rendered an unseeded context at 1000px and got `#nav = 200` against an expectation of 311 at ±2 tolerance, so a failed restore fails the test.

**MINOR — the shelf edge is announced but inoperable.** `studio-cockpit.tsx:80` names the disabled separator, and the library omits `tabIndex` when disabled (`:2243`), so it's a named `role="separator"` a screen reader reads out for a 1px rule nobody can touch.

**MINOR (process) — the tree moved under me.** `disposition.md` didn't exist when I started and appeared mid-review; `.ladle/vite.config.mts` and `cockpit.stories.tsx` both changed while I was reading them. Commit before dispatching the re-review and record the tree hash.

On the regression targets the brief named specifically: I traced every path through `usePanelToggle` and found no way for `hidden` to diverge or `collapsedByUs` to be left wrong. The "answers synchronously" comment is accurate — `j()` writes the module-level group map and the handle's size reader goes through the live `V()` map, so `isCollapsed()` after `collapse()` reads the new state. `layoutKey` matches the library's key builder exactly after the prefix shim. The token rename is complete — grep finds only `mainMinHeight` plus the old review docs quoting the old names. The 1px separator keeps a real grab target because the library inflates any hit rect below `{coarse: 20, fine: 10}`. And A4's witness is genuine: I drove the `Nested` story in a built Ladle preview and the pinned shelf went 48 → 0 → 48 with no errors, though it's a manual witness, not an automated one.

Gates, all run cold: `run-many -t typecheck test lint --skip-nx-cache` exit 0 across 6 projects; harness 36/36 on the dev server and 36/36 against the built bundle; `lint:tokens` clean with every `var()` resolving; `stories:build` producing exactly two story chunks, no doubling.
 between them touches nav today — §7 and §8 move only the context shelf,
inside the vertical `center` group — so the number is currently right, and the harness printed
`448px of 1440 at 1440 → 311px at 1000, expected 311`. But the assertion's correctness rests on that
and its message hides it; any future step added to §6–§8 that nudges nav turns this into a spurious
pass or fail.

To answer the brief directly: **§8b does prove what it claims.** I rendered a second context at
1000px with empty storage and got `#nav = 200` against an expectation of 311 at a ±2 tolerance — so a
failed seed, or percentage restore replaced by anything else, fails the test. It is not vacuous.

**Fix:** read nav live beside `bodyWide` — `const navWide = await width('#nav');` at `:234` — and use
that in the ratio.

---

## 4. MINOR — the shelf edge is announced to assistive tech but can never be operated

`studio-cockpit.tsx:80` names the disabled separator `aria-label="Top shelf edge"`, and
`app.spec.tsx:29` locks it into the expected separator list. Since the library omits `tabIndex` when
disabled (`react-resizable-panels.js:2243`), this is a non-interactive `role="separator"` that a
screen reader still announces by name. Valid ARIA for a static separator, but it puts a named,
inoperable control in the reading order of a 1px rule — a small tax the fix wave added.

**Fix:** drop the `aria-label` (a nameless static separator is fine) and trim `app.spec.tsx:26-30`
back to the three operable separators; or keep the name and say in the comment why it earns its place.

---

## 5. MINOR (process) — the tree moved under the re-review

`disposition.md` did not exist when I began (`cat` → *No such file or directory*) and appeared
mid-review; `.ladle/vite.config.mts` and `packages/shell/src/lib/cockpit.stories.tsx` both changed on
disk while I was reading them. Under the review gate a reviewer reads *the artifact at a path*, so
every citation above is pinned to a moment rather than to a commit.

**Fix:** commit the fix wave before dispatching the re-review, and record the tree hash in
`disposition.md` beside the reviewer row.

---

## Checked and clean

**Gates I ran myself.**

- `pnpm nx run-many -t typecheck test lint --skip-nx-cache` → exit 0,
  *"Successfully ran targets typecheck, test, lint for 6 projects"*, 17 tasks, cache skipped. A1 is
  genuinely closed — the arity/field error is gone (`use-panel-toggle.spec.tsx` `dragTo` passes
  `({ asPercentage: 0, inPixels: 0 }, 'nav', undefined)`).
- `node tools/src/verify/cockpit.mjs` → **36 passed, 0 failed (dev server)**, exit 0.
- `pnpm build && node tools/src/verify/cockpit.mjs --preview` → **36 passed, 0 failed (production
  bundle built 2026-09-03T09:42:24.763Z)**, exit 0. A6 confirmed: `:9` no longer promises a build and
  `:265` prints the bundle's mtime.
- `pnpm lint:tokens` → *"27 files · 56 tokens declared · 68 var() references · no raw values outside
  packages/tokens/src/tokens.css; every var() resolves"*. Confirms the deleted `--cs-p-rail` /
  `--cs-separator-hit` left no dangling reference.
- `pnpm stories:build` → 116 modules, exactly two story chunks (`cockpit.stories`,
  `studio-cockpit.stories`). No doubling — B8's anchored globs work.

**`usePanelToggle` (the brief's main regression target).** I traced every path and found no way for
`hidden` to diverge or for `collapsedByUs` to be left wrong.

- *Synchrony.* The comment at `use-panel-toggle.ts:42-45` is accurate. `j()` writes the module-level
  group map `F` and emits synchronously (`react-resizable-panels.js:474-483`); the panel handle's
  size reader is `s = () => n().layout[t]` where `n()` calls `V()`, the live map
  (`:885-895`, `:927-931`). So `isCollapsed()` immediately after `collapse()` reads the new state.
- *No-slack path.* `a()` early-returns when the requested size equals the current one, and skips
  `j()` entirely when the clamped layout equals the previous one (`:963-966`, `:978-983`) — so no
  store write and no `onResize`. That is exactly the case `hide()`/`show()` now report through their
  return value.
- *`hide()` that did not act.* `collapsedByUs` is set before `collapse()`, but `sync()` clears it the
  moment the panel is seen open (`use-panel-toggle.ts:59`) and `:77` clears it again. Both the flag
  and `hidden` end correct. Covered by the "stuck" fake at `use-panel-toggle.spec.tsx:127-141`.
- *`show()` that did not act.* Keeps `collapsedByUs`, returns false, `hidden` stays true. Deliberate
  and commented at `:85-86`.
- *Drag-open-then-drag-shut after a hide.* `onResize` → `sync()` sees the panel open and clears the
  flag, so the later drag-shut correctly takes the `resize(restoreSize)` branch. Tested at
  `use-panel-toggle.spec.tsx:70-77`.
- *Non-collapsible panel.* `isCollapsed()` returns `undefined` (`:1002-1005`, `r && k(l,c)` with `r`
  undefined); `sync()` treats that as "no info" and leaves `hidden` alone. Safe, if slightly
  conflated with the no-handle case.
- B1 is proven end-to-end, not just in units: harness `:207` — *"after a button hide, show brings back
  the dragged height exactly — 280 → 280"* — and `:183` now pins nav to ±1 of the dragged width
  (448 → 448). Since `restoreSize` for nav is `navDefault` (`20%` ≈ 288px), that assertion would fail
  if `show()` still took the `resize()` branch. Discriminating.

**A4's witness is real.** I drove the `Nested` story in a built Ladle preview:

```
shelf height at rest: 48 | Shelf button aria-pressed: true
AFTER hide -> shelf height: 0  | aria-pressed: false
AFTER show -> shelf height: 48 | aria-pressed: true
AFTER nav hide -> nav width: 0 ; AFTER nav show -> nav width: 288 ; errors: none
```

So `pinnedPanel`'s "disabled but still hideable" claim now has a working demonstration, and `expand()`
does restore exactly 48px despite `minSize === maxSize`. The library path agrees: `collapse()` stores
`expandToSize` and `expand()` replays it (`:986-996`), and both `le` (`:677`) and the clamp `X`
(`:865`, `:877`) pass `overrideDisabledPanels: true`, so a disabled panel answers the imperative API.
Note this is a *manual* witness — no automated test covers it, which is what A4 asked for.

**`layoutKey` matches what the library writes.** `Cockpit` sets the group id to
`layoutKey(projectId, group)` (`cockpit.tsx:88`), the library builds keys as
`` `react-resizable-panels:${[groupId, ...panelIds].join(":")}` `` (`:1805-1807`), and the shim strips
that prefix (`cockpit.tsx:61-74`). Stored key is therefore `cs:layout:<pid>:<group>:<id>:<id>…`,
which is exactly `['cs:layout', projectId, group, ...panelIds].join(':')`. Verified live: every key
in `localStorage` after a full harness run is `cs:layout:default:{root,body,center}`. The read/write
asymmetry A3 found is real and now documented at `cockpit.tsx:50-54` — read uses the `panelIds` prop
verbatim (`:1850`), write uses `Object.keys(layout)` (`:1885`).

**The token rename is complete.** `grep -rn 'mainMin\|surfaceMin'` across `apps`, `packages`, `tools`,
`references` and `*.md`/`*.css` returns only `mainMinHeight` (`sizes.ts:18`,
`studio-cockpit.tsx:98`) and the two prior review documents quoting the old names. No stale reference.

**The 1px separator keeps its grab target.** B12's fix removed `--cs-p-rail` and set
`--spacing-separator: var(--cs-line)`, without adding `resizeTargetMinimumSize`. That is correct: the
library defaults to `{coarse: 20, fine: 10}` (`react-resizable-panels.js:1606-1609`) and inflates any
hit rect below that (`:261-274`). Measured separator width in the built bundle: `1px`. So the comment
at `cockpit.tsx:196-198` ("its grab target is wider than the visible line") is now true rather than
incidental.

**Ladle globs and Tailwind sources.** `.ladle/config.mjs:3` lists `apps/*/src/**`,
`packages/*/src/**`, `packages/*/*/src/**`; the depths are disjoint, so nothing is doubled, and the
two story files on disk are both discovered. `@source '../apps'` genuinely reaches app-only classes —
probed in the *built* preview of `studio-cockpit--writers-cockpit`:
`font-prose → "ui-serif, Georgia, serif"`, button `padding 8px / border 1px oklch(0.93 0.008 95) /
radius 4px`, `aria-pressed:text-ink → oklch(0.24 0.014 95)`, separator `1px`. Zero console or page
errors. The only uncovered depth is `apps/*/*/src`, which nothing currently occupies.

**A7's Enter reasoning holds.** The library's keydown entry point checks `defaultPrevented`
(`:1017-1019`) but is registered natively on the separator element, so React's delegated handler
cannot get in front of it — `preventDefault()` was inert and removing it changes nothing. The comment
at `studio-cockpit.tsx:61-67` now states the real guard (`main` is not collapsible). Harness `:224`
and `:227` still show Enter toggling the drawer.

**No scope creep.** Every changed file maps to an accepted finding: `.ladle/config.mjs`,
`.ladle/preview.css`, `studio-cockpit.stories.tsx` → B8; `.ladle/vite.config.mts` → S1 (recorded in
`disposition.md:54-58`); `app.tsx`, `app.spec.tsx`, `studio-toolbar.tsx` → B3; `layout-store.{ts,spec.ts}`
→ B5; `sizes.ts` → A8; `tokens.css`, `cockpit.tsx` → B4/B11–13/A3/A4; `use-panel-toggle.{ts,spec.tsx}`
→ A1/A2/B1; `studio-cockpit.tsx` → A2/A5/A7/A8/B7; `cockpit.mjs` → A5/A6/B1/B4/B5/B7;
`AGENTS.md`, `friction-notes.md` → B14/A2. Nothing unaccounted for.

**Docs no longer overclaim.** `AGENTS.md:36-40` claims sidebars "hold their width when the window
resizes" — true for a live resize, which is what harness `:158` measures (448 → 447 across
1440→1200). The reopen caveat A5 raised is stated where it belongs, at `studio-cockpit.tsx:19-21` and
`cockpit.mjs:6`, and proven by §8b. `pinnedPanel`'s comment attributes its 120px-drag number to the
reference kit rather than to this repo. B10 is moot in the current tree as well as deferred:
`grep` for `-[…]` arbitrary values across `apps` and `packages` `.tsx` returns nothing.
