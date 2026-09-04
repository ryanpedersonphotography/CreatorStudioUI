The preview is stopped and the tree is unchanged. Here is the review.

---

## Findings

### 1. **Material** — `tools/src/verify/menubar.mjs:165`: the new assertion pins two strings being unequal, not a visible fill; two regressions of the exact defect it guards slip past it

```js
// tools/src/verify/menubar.mjs:162-165
const fill = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor);
const unpressedFill = await fill(button('Navigation'));
const pressedFill = await fill(button('Inspector'));
ok('a pressed toggle carries a fill an unpressed one lacks: …', unpressedFill !== pressedFill && …);
```

The condition is *string inequality between two different elements*. It never asks which element carries the fill, and never asks whether the fill is distinguishable from what it sits on. I ran both regressions live against the preview build, driving the harness's own expression verbatim:

| mutation | fill-vs-shelf contrast | line 165 |
|---|---|---|
| as shipped | 1.194:1 | PASS |
| `--cs-surface-muted` retuned to `--cs-surface` | **1.000:1** — the fill is literally the shelf colour | **PASS** |
| rule inverted so the *unpressed* toggle carries the fill | 20.431:1, on the wrong button | **PASS** |

Mutation B is the original defect returning verbatim: `/tmp/shelf-collapsed.png` shows the pressed toggles with no fill at all, state signalled by the muted/ink delta alone — the precise condition rereview-c finding 1 raised — with the harness green. So a regression only has to keep `--cs-surface-muted` *lexically distinct* from transparent to pass; it does not have to keep it visible, and it does not have to keep it on the pressed state.

This matters more than a normal weak assertion because `packages/tokens/src/tokens.css:16-19` now writes the fill into the token file as a standing rule ("Anything that signals state with muted-vs-ink alone needs a second channel (the region toggles also carry a fill)"). The rule is inherited by later sessions; the guard that is supposed to hold it up cannot.

**Fix I would make:** assert the fill's *non-text contrast against its own backdrop*, and pin which state carries it. `contrast()` already composites ancestors, so a sibling helper is four lines — composite the button's own `backgroundColor` over `eff(el.parentElement)` and require ≥ 3:1 (WCAG 1.4.11) — plus `unpressedFill === 'rgba(0, 0, 0, 0)'` so inversion fails. Run it in both themes, next to the existing dark-theme block at line 257.

### 2. **Material** — `apps/studio/src/app/studio-toolbar.tsx:42`: the second channel measures 1.194:1 light / 1.389:1 dark, and in both themes the fill is exactly the border colour

Measured in the running app, not derived — pressed `Top shelf` against the composited shelf behind it:

| | light | dark |
|---|---|---|
| **fill vs shelf** (the state signal) | **1.194:1** | **1.389:1** |
| fill vs its own border | 1.000:1 | 1.000:1 |
| ink on fill (label legibility) | 13.43:1 | 10.20:1 |
| ink vs muted (the pre-existing channel) | 2.74:1 | 2.23:1 |

The brief's contrast question resolves cleanly in the affirmative: **ink on linen is 13.43:1 and chalk on steel is 10.20:1**, so the pressed label is never at risk. The problem is the other axis. `--cs-surface-muted` and `--cs-border` are the same primitive in both themes (`tokens.css:50`/`:53` → linen; `:90`/`:93` → steel), so pressing a toggle fills it with the colour its own border already was — the outline dissolves into the fill, and the fill differs from the shelf by exactly the amount the border already differed. Neither channel now reaches the 3:1 that WCAG 1.4.11 asks of a component state: text 2.74:1, fill 1.19:1.

To be fair to the commit: I rendered it and looked (`/tmp/shelf-light.png`, `/tmp/shelf-dark.png`). The states **do** read — the filled chips are distinguishable from the greyed one in both themes. This is a standards-and-measurement gap on a control, not an unusable control. But this wave's whole subject has been AA on this toolbar, and the token comment asserts the mitigation without a number behind it.

**Fix I would make:** take rereview-c's *first* suggestion rather than its parenthetical. `aria-pressed:border-accent` measures **3.49:1 light / 6.46:1 dark** against the shelf — it clears 1.4.11 in both themes where the fill clears neither, and it costs one utility. Keep the fill if you like the chip; add the border for the signal. Then put the measured number in the `tokens.css:16-19` comment, so the rule cites evidence rather than an unquantified "also carry a fill".

### 3. **Minor** — `tools/src/verify/menubar.mjs:61`: the alpha fix reached the background walk but not the foreground

```js
const a = lum(rgba(cs.color).rgb);   // .rgb — the alpha the new helper just captured is dropped
```

`rgba()` was rewritten specifically to stop discarding alpha, and the background loop uses it correctly. The text colour is the one place the old behaviour survives: `color: oklch(24% 0.014 95 / 50%)` would be scored as fully opaque ink, inflating the ratio — the same flattery, in the mirror position, that minor 4 asked to be closed. Latent only: I grepped `packages/*/src` and `apps/studio/src` for `rgba(`, `hsla(`, `color-mix`, `opacity` and `/ NN%` in CSS and TSX and found no translucent colour anywhere in the shipped tree.

**Fix I would make:** composite the foreground over the resolved `base` the same way the layers are composited — `const fg = rgba(cs.color); const a = lum(fg.rgb.map((v,i) => v*fg.alpha + base[i]*(1-fg.alpha)));`

---

## Clean passes

- **The utility is real, not a silently-dropped class name.** `--color-surface-muted` is bridged at `packages/tokens/src/tokens.css:118`, and `pnpm nx build studio --skip-nx-cache` emits `.aria-pressed\:bg-surface-muted[aria-pressed=true]{background-color:var(--cs-surface-muted)}` into `apps/studio/dist/assets/index-Shm9FNa9.css`. Confirmed at runtime too: the harness prints `rgba(0, 0, 0, 0) vs oklch(0.93 0.008 95)`, and my own probe read the pressed button's computed `backgroundColor` as opaque linen (alpha 1.0) in light and opaque steel in dark. Tailwind 4.3.3 (`node_modules/tailwindcss/package.json`) ships `aria-pressed` as a built-in variant; nothing custom was needed.
- **The compositing loop is correct in all four respects the brief asks about.** `menubar.mjs:49-60`: layers are pushed top-down (`el` → `parentElement`), then `layers.reverse()` composites bottom-up with source-over — the top layer is applied last, over everything beneath it, which is the right order. `if (layer.alpha === 1) break` stops at the first opaque layer, so nothing below it is read. `painted` is set inside the loop on the first layer with `alpha > 0` and is therefore false only when no node in the `el`→`html` chain paints at all.
- **The white base cannot mask a dark-theme regression.** `apps/studio/src/styles.css:36` paints `body { background: var(--cs-bg) }` opaque, and `packages/shell/src/lib/cockpit.tsx:231` paints every panel `bg-surface`, so in dark theme the walk terminates on an opaque layer well before `html`. Even if it reached the fallback, an `alpha === 1` layer resolves to `v*1 + base*0` and erases the white entirely. Confirmed live: the dark probes report `on rgb(25, 29, 36)` (slate), never white. The only path by which white can reach a *passing* result is a translucent layer with no opaque layer beneath it — and there are none in the tree (same grep as finding 3). Where it *is* reachable, it fails in the safe direction: a dark page with nothing painted would score chalk against white and go red, not green.
- **All six contrast probes require `painted`, and both highlighted-row probes now guard the highlight.** `menubar.mjs:205, 208, 231, 258, 260, 267` — every one is `… && X.painted && X.ratio >= 4.5`. Lines 205 and 258 additionally re-read `data-highlighted !== null` inline, so rereview-c's minor 3 (light probe unguarded) is closed symmetrically. One correction to the brief: there are **six** probes, not seven — the same count rereview-c arrived at.
- **No cockpit or spec assumption moves.** `tools/src/verify/cockpit.mjs` touches these buttons only through `getAttribute('aria-pressed')` (lines 78, 154, 183, 202, 216, 265, 294, 304, 316) and reads exactly one colour, the nav separator's `backgroundColor` at line 82, driven by `--cs-border`. `apps/studio/src/app/app.spec.tsx:33-38` and `:56` likewise assert only the `aria-pressed` attribute — no class, style, or snapshot assertion anywhere on `RegionButton`. A background-color addition changes no geometry, so the `height('#top') === 32/48` checks are untouched. `cockpit.mjs --preview`: **73 passed, 0 failed.**
- **The spec addition closes the exclusivity hole it was written for.** `apps/studio/src/app/studio-menus.spec.tsx:43` adds `expect(within(menu).getAllByRole('menuitem')).toHaveLength(3)` scoped to the popup, not the group — so a fourth item added as a sibling of the group now fails, which is exactly what line 41's `within(group)` could not catch.
- **Gates, run by me, uncached.** `pnpm exec vitest run` in `packages/menubar` → 34 passed (3 files); in `apps/studio` → 16 passed (4 files). `pnpm nx run-many -t typecheck lint --skip-nx-cache` → 14 tasks successful across 7 projects. `node tools/src/lint/check-tokens.mjs` → clean, 46 files, 57 tokens, 127 `var()` refs. `node tools/src/verify/menubar.mjs --preview` → **64 passed, 0 failed** (the disposition's "63" is now 64; the new fill assertion is the increment). No console or page errors on any run. The working tree is unchanged by this review — the build output is gitignored, and every scratch artifact went to `/tmp`.
- **Two latent gaps I checked and am not filing.** `contrast()` reads `backgroundColor` only, so a `background-image` or gradient layer would be treated as unpainted — no gradients exist in `packages/*/src` or `apps/studio/src`. And ancestor `opacity` is not modelled — no `opacity` declarations exist either. Both are correct today and would become findings the moment either is introduced.

## Verdict

Finding 1 is closed in substance — the utility is real, compiles, renders in both themes, and puts ink on the fill at 13.43:1 / 10.20:1 — but the second channel it adds measures 1.19:1 against its own backdrop, below the 3:1 a state indicator needs, and the harness assertion guarding it passes unchanged when that fill is collapsed to invisible or moved to the wrong state; minors 3 and 4 are closed correctly, with the foreground alpha the one place the fix did not reach, and nothing in the commit breaks anything (34 + 16 tests, 64/64 and 73/73 harnesses, 14 lint/typecheck tasks, all green).
