## Findings

### 1. **Material** — `references/reviews/2026-09-04-menubar/disposition.md:72`: row B-m7 is marked **Fixed** and offers a command as its evidence; the command runs and names a commit that predates the entire record

The row reads: "**Fixed** in the wave's closing commit: `git log -- references/reviews/2026-09-04-menubar` names it, and this file, the briefs, the reports and the friction notes are in it." I ran exactly that command:

```
$ git log --oneline -- references/reviews/2026-09-04-menubar
374e56e menubar: portable @creator-studio/menubar package (wave 1)

$ git ls-files references/reviews/2026-09-04-menubar
references/reviews/2026-09-04-menubar/plan-review.md
references/reviews/2026-09-04-menubar/plan.md
```

The only tracked files in that directory are `plan.md` and `plan-review.md`, both landed in wave 1 before any review existed. `disposition.md` itself, all seven briefs and all seven reports are untracked (`git status --porcelain` lists each as `??`), and `references/friction-notes.md` is still ` M`, uncommitted. So the command "names" a commit, but not the one the sentence claims, and none of the four artefacts the sentence enumerates is in it.

What makes this material rather than pedantic is the row's own second half: "Three passes in a row caught this row claiming the commit before it existed; the row now points at the evidence instead of describing the commit." The rewording changed the failure mode without closing it — a reader who follows the citation now gets a commit hash back and stops, where before they got a claim they could see was future-tense. This is the fourth recurrence, and `disposition.md:110` (RB-M1, itself the finding "the disposition said the review record was committed; it was not") is marked **Fixed** on the strength of it.

The mitigation, in fairness: `disposition.md:110` does say plainly "the record and the friction notes go in the closing commit, after this re-review", so the document read end to end does not deceive. The defect is that row 72, read on its own, does.

**Fix I would make:** mark B-m7 **Open until the closing commit** and drop the `git log` citation until it resolves — a row cannot cite a commit that is the last step of the wave it is a row in. Restore the citation, with the real hash, when the record actually lands.

### 2. **Minor** — `references/reviews/2026-09-04-menubar/disposition.md:207` and the commit message of `6acbf2e`: the two contrast figures given for the ring's neighbours are both wrong, and each is traceable to a different pairing

The F1 row and the commit body both state that the ring's neighbours "become the shelf (3.29:1 light, 7.30:1 dark)". Running the harness's own canvas-readback and luminance code (`tools/src/verify/menubar.mjs:41-66`) against the focused chip on the live page:

| | record says | measured |
|---|---|---|
| light: ring vs the shelf behind it | 3.29:1 | **3.49:1** |
| dark: ring vs the shelf behind it | 7.30:1 | **6.46:1** |

The backdrop my probe walks to is `rgb(252, 252, 249)` light and `rgb(25, 29, 36)` dark — the same two values the harness prints for itself at `/tmp/menubar-run.txt:23` and `:51` ("pressed 16.04:1 … on rgb(252, 252, 249)"), and my method reproduces its 16.04 and 1.19 exactly, so the method is not the discrepancy. A PNG pixel scan of the rendered ring agrees to the same two decimals.

Both numbers have identifiable wrong sources. **3.29** is the ring against `--cs-bg` — paper, `oklch(97% 0.006 95)` — not against `--cs-surface` at 99%, which is what the toolbar actually paints; I reproduced 3.29 exactly by substituting that token. **7.30** is the dark highlighted-row figure, night-on-ember-bright, which appears at `disposition.md:60`, `rereview-a.md:72` and `rereview-b.md:97` — a different pairing entirely, carried across. Both originate in `rereview-f.md:20` and were copied forward into the disposition and the commit message unremeasured.

The conclusion is unaffected — 3.49 and 6.46 both clear the 3:1 of WCAG 1.4.11, more comfortably than stated — which is why this is Minor and not Material.

**Fix I would make:** correct both figures to 3.49:1 and 6.46:1 in `disposition.md:207`. The commit message is immutable; the disposition row is the place to note the corrected values.

### 3. **Minor** — `tools/src/verify/menubar.mjs:157-165`: the new assertion measures geometry and never colour, so the ring can go invisible or turn ink-coloured and stay green

The predicate at `:163` is `style !== 'none' && width >= 1 && offset >= 0 && border === '1px solid' && pressed === 'true'`. I replayed it verbatim against the live page under eleven injected mutations:

| mutation | verdict |
|---|---|
| control (shipped) | GREEN |
| **F1's own regression** — `outline-offset: -2px` | **RED** ✓ |
| ring removed (`outline: none`) | RED ✓ |
| `border-width: 0` (preflight's `border: 0 solid`) | RED ✓ |
| `border-style: none` | RED ✓ |
| `outline-color` = the shelf paint | **GREEN** |
| `outline-color: transparent` | **GREEN** |
| `--cs-focus` stops resolving → ring falls back to `currentColor` | **GREEN** |
| `outline-width: 1px` | GREEN |
| `outline-offset: 12px` (ring overruns the neighbour) | GREEN |

The third of those is the one that matters, because it is one edit away and it restores the exact defect E2 was filed for. `outline-focus` compiles to `outline-color: var(--cs-focus)`; if that custom property is renamed or dropped, the declaration is invalid at computed-value time and `outline-color` falls back to `currentColor`, which on a pressed chip is ink. Measured under that mutation: `outline-color oklch(0.24 0.014 95) | border-color oklch(0.24 0.014 95)` — ring and pressed border the same colour, focus and pressed no longer distinguishable by hue — and the assertion prints green. This wave has driven every other state signal to a measured floor (`:177` enforces 3:1 two sections away); the focus ring, the thing the last two passes were about, is the one indicator with no measured floor at all.

`pressed === 'true'` also couples the check to Top shelf being expanded when §3 runs; a default change would turn it red. That is the safe direction and the clause is load-bearing — the check is only meaningful on a chip that has a pressed outline to preserve — so I would leave it.

**Fix I would make:** add a contrast clause using the existing `probe()` on `outlineColor`, asserting ≥3:1 against the resolved backdrop, alongside the geometry it already checks. The measured headroom is 3.49 light / 6.46 dark, so a 3:1 floor sits comfortably under both.

### 4. **Minor** — `references/reviews/2026-09-04-menubar/disposition.md:199-215`: the sixth pass section records no counts, so the newest tally a reader can find in the record is stale

Every earlier wave closes with a counts line — `:80-82` (menubar 59/59), `:119-121` (63/63), `:149-150` (64/64), `:174-175` (65/65). The fifth pass section (`:177-197`) and the sixth (`:199-215`) both end on clean passes with no such line. The last menubar tally recorded anywhere in the document is **65 / 65** at `:174`; the tree runs **66 / 66** (I ran it). Nothing here is false — the 65 is correctly attributed to the fourth wave — but the document's own convention makes its absence read as "unchanged", and the 65 → 66 increment lives only in the commit message.

**Fix I would make:** close the sixth pass section with the same line the others carry: menubar 66 / 66, cockpit 73 / 73, studio 16, package 34, typecheck and lint 14 tasks over 7 projects uncached.

## Clean passes

- **F1 is closed, and I read it off the rendered pixels rather than the computed style.** Focusing the chip by the same path the harness takes (landmark → Tab → Tab), I screenshotted a 1-device-pixel horizontal strip through the chip's mid-height at 2× and read it back through a canvas. Light: shelf `rgb(252,252,249)` → **ember ring `rgb(220,99,30)`, 2px** → **shelf gap, 2px** → **ink border `rgb(33,31,24)`, 1px** → linen fill `rgb(233,232,226)`. Dark, same structure: `rgb(25,29,36)` → **`rgb(242,130,59)` 2px** → gap → **`rgb(233,235,239)` 1px** → steel `rgb(49,54,61)`. Three distinct bands, so the 1px ink border is visibly beside the ring, not under it. Computed style agrees: `solid 2px oklch(0.64 0.17 45) offset 2px` over `1px solid oklch(0.24 0.014 95)`, `:focus-visible` true.
- **No collision with a neighbour and none with the viewport, and the reason is structural rather than lucky.** The chips sit at x 1125.5 / 1210.6 / 1305.3 / 1417.0 with 8.0px gaps; the ring reaches 4px, so the focused chip's ring right edge lands at 1206.6 against Navigation's 1210.6 — 4px of clear shelf, which I also confirmed in pixels (focusing Inspector, the left neighbour's ink border reads at −9px, the ring at −4 to −2.5, shelf between). The last chip ends at 1496, ring to 1500, inside 1512 with 12px to spare, `scrollWidth === clientWidth === 1512`. The general reason: the ring's 4px reach is bounded by the toolbar section's own `px-md` (16px) horizontal padding, so viewport width cannot clip it — verified by focusing the last chip at 1512, 1440, 1180, 1024 and 900, all clear.
- **Vertically the outset ring clears the one clipping ancestor.** The chip's ancestor chain includes a `overflow-hidden` div and `#cs-layout-default-root` (`overflow: hidden/hidden`), both spanning the 48px bar. Chip box y 13–35, ring 9–39, measured in pixels: ember at device rows corresponding to y 9.0–11.0 and y 37.0–39.0, with shelf above and below. 9px of clearance on each side. This is the failure mode the landmarks' inset exists to avoid, and it does not occur here.
- **F2 is closed.** `apps/studio/src/app/studio-regions.ts:20` now gives the landmark's reason and names the alternative — "inset so the panel's edge does not clip it (a bordered control uses `CONTROL_FOCUS`, outset)" — and `:26-28` gives the control's — "Outset, not inset: an inset ring would paint over the 1px pressed outline and leave the pressed state to the fill alone while the chip has focus." Between them a reader learns why each offset is what it is and which to reach for; the panel-specific assumption that let the inset reach a bordered control is now stated at the constant it belongs to.
- **The commit breaks nothing, by gates I ran myself.** `node tools/src/verify/menubar.mjs` → **66 passed, 0 failed** (dev server, 1512×982 @2×), the new check printing `solid 2px offset 2px, border 1px solid, pressed true` at line 19 of the run. `node tools/src/verify/cockpit.mjs` → **73 passed, 0 failed** (1440×900 @1×), which matters because `cockpit.mjs` focuses these chips at four points. `pnpm exec vitest run` in `apps/studio` → 16 passed across 4 files. `pnpm nx run-many -t typecheck lint --skip-nx-cache` → 14 tasks over 7 projects successful, cache skipped. No console or page errors on either harness.
- **The record's "Fixed" citations resolve, on the sample I checked — 9 of the disposition's rows, one failure.** Checked in the tree: A-M1 (`--_mb-max-h` gone; `packages/menubar/src/lib/menubar.css:87` reads `var(--radix-menubar-content-available-height, 80vh)`), A-M2 (`packages/tokens/src/tokens.css:59`), RB-M2 (`tokens.css:22`, ash at 50%; `:54` binds `--cs-ink-muted`), B-m2 (`packages/menubar/src/lib/menubar.tsx:239`, `aria-labelledby` conditional on `label`), B-m5 (`shortcuts.ts:47`, `physicalCode`), A-m3/RA-3 (`shortcuts.ts:116-118`, three `continue`s not `return`), C5 (`apps/studio/src/app/studio-menus.spec.tsx:43`, `toHaveLength(3)`), D2 (`studio-toolbar.tsx:42`, `aria-pressed:border-ink`), E1 (`menubar.mjs:69`, the `drawn` clause). Eight resolve; B-m7 is finding 1. The other ~19 Fixed rows I did not individually check — they belong to earlier passes' code, which this brief excludes.
- **The one claim the sixth-pass row makes about the harness is true and I proved it by mutation.** `disposition.md:207` says "on the inset ring it goes red": injecting `outline-offset: -2px !important` on `#top button:focus-visible` and replaying the predicate from `menubar.mjs:163` gives `RED — solid 2px offset -2px, border 1px solid, pressed true`. The claim "both of the ring's neighbours are the shelf" is also true in pixels (shelf in the 2px gap, shelf outside the ring); only the two ratios attached to it are wrong, which is finding 2.
- **Read-only, confirmed.** `git status --porcelain` at the end is byte-identical to the session-start snapshot (`diff` clean). Every probe script and capture went to `/tmp`; the only file the harnesses rewrite is `screenshots/menubar-1512-view-open.png`, which is gitignored.

## Verdict

Both of rereview-f's findings are genuinely closed — the outset ring renders with the ink border visible beside it in both themes, clears its neighbours and the viewport at every width I tested, and breaks nothing across four gates — but the record still marks B-m7 **Fixed** on a `git log` citation that resolves to wave 1 while the entire review directory sits untracked, and the two ring-contrast figures it quotes are both traceable to the wrong pairing.
