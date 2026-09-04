Verified independently: 34 package tests, 16 studio tests, token lint clean, uncached typecheck+lint green across 14 tasks, and my own oklch→sRGB math reproduces every ratio in the commit message. Findings below.

## Findings

### 1. **Material** — `apps/studio/src/app/studio-toolbar.tsx:42`: the token change halves a colour-only state signal, and nothing in the record notices

`RegionButton` distinguishes pressed from unpressed with *nothing but* the ink/muted delta:

```
className="rounded-sm border border-border px-sm text-ink-muted transition-colors hover:text-ink aria-pressed:text-ink"
```

Same border in both states, no background change, no glyph change. The only visual difference between "Navigation is open" and "Navigation is collapsed" is `--cs-ink-muted` versus `--cs-ink`.

Evidence — my own oklch→sRGB conversion of `packages/tokens/src/tokens.css:16` and `:17`, run against both the old and new value:

| pair | before (ash 62%) | after (ash 50%) |
|---|---|---|
| ink-muted vs ink | **4.52:1** | **2.74:1** |
| ink-muted on white | 3.54:1 | 5.83:1 |

The AA fix is real and the numbers in the commit message are honest (I get 5.83/5.50/4.88 light, 6.32/4.57 dark against their 5.85/5.51/4.90, 6.34/4.57 — rounding only). But pushing muted toward ink to clear AA *against the background* necessarily collapses it *against the foreground*, and this button is the one place in the studio where that delta is load-bearing. The state is still distinguishable at 2.74:1 — nothing is unreadable — but the affordance lost 40% of its separation, and the same edit also affects `studio-rails.tsx:30,42` and `app.tsx:35,36`, where muted text is meant to recede and now sits closer to body ink.

`disposition.md`'s RB-M2 row says only "The whole studio's muted text moves with it (same defect everywhere it is used)" — it treats the sweep as uniformly beneficial. It is not: one consumer got worse.

**Fix I would make:** give `RegionButton` a second channel rather than leaning on the delta — `aria-pressed:border-accent` alongside `aria-pressed:text-ink`, or a pressed background (`aria-pressed:bg-surface-muted`). Then record the 4.52→2.74 collapse in the token comment at `tokens.css:16` so the next person changing ash knows both directions are constrained.

On the framing's other half — **darkening the primitive was the right call, not a new semantic token.** `--cs-p-ash` has exactly one referent in the whole repo (`tokens.css:48`, `--cs-ink-muted`), and `--cs-ink-muted` is only ever consumed as a text `color` (7 sites: `app.tsx:35,36`, `studio-toolbar.tsx:42`, `studio-rails.tsx:30,42`, `studio-cockpit.stories.tsx:80`, `styles.css:13` → `--menubar-muted` → `menubar.css:126,136,154`, all `color:`). A new semantic would have had no second consumer to justify the indirection.

### 2. **Material** — `references/reviews/2026-09-04-menubar/disposition.md:~B-m7 row`: the record still claims a commit that does not exist

The B-m7 row reads:

> **Fixed** by the record commit that closes this wave, made after the re-review below (both re-reviewers noted the row said "Fixed" before that commit existed; the wording here is from after it).

Both clauses are false right now. `git status --porcelain` shows every file in `references/reviews/2026-09-04-menubar/` as `??` and `references/friction-notes.md` as ` M`; `git log --oneline -1` is `cc75bbb`. So "made after the re-review" describes a commit that has not been made, and "the wording here is from after it" is written from a future that has not arrived. `git ls-files references/reviews/` confirms every prior wave (`2026-09-02-agents-md`, `2026-09-02-skeleton`, `2026-09-03-cockpit`) *is* tracked, so this wave is the exception, not the convention.

This is exactly the defect RB-M1 raised, in a document whose RB-M1 row says "**Fixed.** Row B-m7 reworded". The rewording made the claim more elaborate, not more true — and the same table contradicts itself two rows apart, since RB-M1's own disposition correctly uses the future tense ("go in the closing commit").

**Fix I would make:** revert B-m7 to a status that is true at read time — `**Open.** The record and the friction notes are untracked until the closing commit lands` — and let the closing commit itself flip it. A row that describes its own commit can only ever be honest in the past tense.

### 3. **Minor** — `tools/src/verify/menubar.mjs:191`: the light highlighted-row probe never got the guard the dark one did

`cc75bbb` added the inline highlight guard to the dark probe only:

```js
// line 244 (dark, guarded)
ok('dark theme: …', (await nav().getAttribute('data-highlighted')) !== null && darkRow.ratio >= 4.5, …);
// line 191 (light, unguarded)
ok('light theme: the highlighted row clears AA (≥ 4.5:1)', lightRow.ratio >= 4.5, …);
```

If the highlight regressed, `nav()` would carry `--_mb-fg` (ink) over the content's `--_mb-bg` (white) — 15.98:1 by my computation — and line 191 would print green while asserting something untrue. The run as a whole still goes red because `menubar.mjs:189` checks `data-highlighted` separately, so this is a flattering *line*, not a flattering *suite*. But RA-2's whole point was that an unhighlighted row reads as a pass, and the fix was applied to one of the two probes.

**Fix I would make:** copy the dark guard onto line 191, one clause.

### 4. **Minor** — `tools/src/verify/menubar.mjs:39-47`: the background walk stops on a semi-transparent ancestor and reads it as opaque

The walk only treats fully-transparent as unpainted:

```js
while (node && (background === 'rgba(0, 0, 0, 0)' || background === 'transparent')) {
```

and the `rgb()` helper drops alpha at line 42 (`.slice(0, 3)` on the canvas readback). So an ancestor at `rgba(0,0,0,0.4)` halts the walk and is scored as pure black — inflating the ratio for light text, which is the same class of silent flattery the walk was added to remove. Nothing in the studio paints a partial-alpha background today, so this is latent, not live. The two other failure modes in the framing are genuinely closed: portal wrappers are never reached because `menubar.css:90` paints `[data-menubar='content']` before them, and the `html`-with-no-background case is unreachable because `apps/studio/src/styles.css` paints `body`. The `'rgb(255, 255, 255)'` terminal fallback is dead code for the same reason — and if it ever ran in dark theme it would fail loudly, not flatter.

**Fix I would make:** keep the alpha and keep walking while it is below 1, or composite: parse the fourth channel and blend against the resolved parent background before scoring.

### 5. **Minor** — `apps/studio/src/app/studio-menus.spec.tsx:40`: the group assertion proves containment but not exclusivity

`within(group).getAllByRole('menuitem')` **does** prove the three items are inside the group — `within` scopes to the container's subtree, and the exact-order `toEqual` at line 41 pins all three. That part of the framing checks out. What it does not prove is that nothing escaped: if a fourth item were added as a sibling of the group rather than a child, this spec stays green.

**Fix I would make:** add `expect(within(menu).getAllByRole('menuitem')).toHaveLength(3)` beside line 41.

### 6. **Minor** — `disposition.md` (mutation paragraph): three of this wave's five changes have no mutation behind them

The closing paragraph records two mutations — ash back to 62%, editable guard back to `return`. The effective-background walk (RA-2), the Group-on-seams (RA-1) and the new bare-shapes package spec (RA-5) are asserted fixed with no red-under-revert evidence, in a document whose first wave recorded five of five. The first wave's standard is the right one.

**Fix I would make:** run the three missing mutations, or say plainly that two of five were mutated and which three were not.

## Clean passes

- **The editable guard, walked by hand.** `packages/menubar/src/lib/shortcuts.ts:113-121`: for three bindings on one combination, the loop `continue`s past a non-matching shortcut, past a non-global binding when the target is editable, and past a failing `when`; the first binding clearing all three hits `event.preventDefault(); binding.run(); return`. Exactly one `run()`, and `preventDefault` fires only on that same iteration — there is no path that prevents the default without running something. The editable check precedes `when`, so a skipped binding's guard is never evaluated; `when` is documented as a pure predicate, so that is harmless. The no-match-at-all case still leaves `defaultPrevented` false, which `shortcuts.spec.ts:83-90` pins and which passes (16 tests green).
- **The new spec is red under the old code.** `shortcuts.spec.ts:92-102` dispatches on a `textarea` with `[local, global]` in that order and asserts `global` called once and `defaultPrevented === true`. Under the pre-commit `return`, the loop exits on the first matching binding (`local`, non-global, editable target) — `global` is never reached and nothing is prevented, so both assertions fail. Confirmed by reading the diff, not by mutating the tree (I was read-only).
- **`Menubar.Group`'s ARIA shape.** `menubar.tsx:236-242`: `aria-labelledby` is set only when `label !== undefined`, the `MenubarLabel` carries the matching `useId()`, and `...rest` spreads *after* `aria-labelledby` so a consumer's own `aria-label`/`aria-labelledby` wins. `aria-labelledby` pointing at a descendant is spec-legal and is the standard menu-group pattern; the `Separator` now living inside the group is also legal (`role="menu"` owns the `group`, and `group` places no restriction on `separator`), and Radix's roving focus works off its collection rather than DOM children, so the wrapper cannot change arrow travel. With every item `disabled`, Radix sets `focusable: false` and nothing is enterable — which the disposition's accepted-risk bullet states correctly.
- **`--cs-p-ash` blast radius, enumerated.** Grepped `cs-p-ash` / `cs-ink-muted` / `ink-muted` across `apps/`, `packages/`, `tools/` excluding `dist` and `node_modules`: 7 consumer sites, all text colour, listed in finding 1. No `bg-ink-muted`, no `border-ink-muted`, no `bg-surface-muted` anywhere — so the 4.88:1-on-linen figure is defensive, not load-bearing. `tools/src/verify/cockpit.mjs` reads exactly one colour (line 82, the separator's `backgroundColor`, driven by `--cs-border`), so no cockpit assertion moves with ash. The package's standalone fallback `GrayText` at `menubar.css:19` is untouched.
- **The highlighted row's shortcut is not a hidden AA hole.** `menubar.css:138-140` flips `[data-highlighted] > [data-menubar='shortcut']` to `inherit`, so a highlighted row's shortcut is `--cs-on-accent` on `--cs-accent` (night on ember, 5.32:1 by my math), not muted-on-accent (which would be 1.67:1). The harness's `data-highlighted === null` guards at lines 194 and 246 therefore probe the case that actually uses muted.
- **A missing element cannot pass a contrast assertion.** `tools/src/verify/lib.mjs:117-118` catches a thrown error and records it as a failed `ok`. A missing shortcut span, heading, or row makes `locator.evaluate` throw (or trip Playwright strict mode on a duplicate), which lands as a failure rather than a skipped line. The light heading probe at line 217 is additionally preceded by an explicit `count() === 1` plus `getByRole('group', { name: 'Coming soon' })` check at line 214.
- **Counts and gates, run by me.** `pnpm exec vitest run` in `packages/menubar` → 34 passed (manifest 3, shortcuts 16, menubar 15); in `apps/studio` → 16 passed. `node tools/src/lint/check-tokens.mjs` → clean, 46 files, 57 tokens, 127 `var()` refs. `pnpm nx run-many -t typecheck lint --skip-nx-cache` → 14 tasks successful, cache skipped. The disposition's "package tests 34, studio tests 16, token lint clean" is accurate, and "59 → 63" reconciles: four new `ok()` calls at menubar.mjs 194, 217, 246, 253.
- **One record correction, small.** The framing refers to "the seven contrast assertions"; there are six in the tree — `menubar.mjs` 191, 194, 217, 244, 246, 253 — and none in `cockpit.mjs`.

## Verdict

The three code fixes are sound and the measurements are honest, but the token sweep quietly halved the pressed/unpressed signal on the region buttons, and the disposition still says a record commit exists that does not.
