## Findings

### How every first-round finding landed

| Finding | Status |
|---|---|
| A‑M1 / B‑M1 height cap on `:root` | **Closed in code.** `--_mb-max-h` is gone (`menubar.css:16-37`, no reference anywhere in `packages/ apps/ tools/`); the cap reads the Radix variable at `menubar.css:87`, where it resolves. |
| A‑M2 / B‑M2 highlight fails AA in light | **Closed in code**, and the numbers reproduce (below). |
| B‑M3 README extraction procedure | **Closed in code.** Every claim in the new step 5 checks out file by file (below). |
| A‑m1 disabled-seam click | **Closed in code.** `menubar.mjs:203` dispatches at the element, bypassing `menubar.css:127`. |
| A‑m2 manual ⌃⌘ check in Ryan's Chrome | **Not addressed — acceptable.** It is a human act, named as owed at `disposition.md:63` and in accepted risks `:90`. Silence would only be acceptable *if the record shipped*; see Material 1. |
| A‑m3 `when` returns instead of continuing; `<select>` undocumented | **Closed in code**, both halves (`shortcuts.ts:118`, `:88`). |
| A‑m4 four unbridged contract properties | **Closed in words — as asked.** Reviewer A wanted a comment; `styles.css:7-9` is that comment. |
| A‑m5 / B‑m6 `CompactStates` | **Closed in code** (`studio-cockpit.stories.tsx:44`). |
| B‑m1 harness §9 layout keys | **Closed narrower**, with the narrowing recorded twice (`disposition.md:48`, `:95`). Honest. |
| B‑m2 `Label` has no role, `Label`/`Group` unlinked | **Closed in code** for the package (`menubar.tsx:227-241`) — but not applied where the complaint was. See Minor 1. |
| B‑m3 disabled seams silent to non-mouse users | **Closed in words for sighted users only.** The keyboard half is untouched and the record doesn't say so. See Minor 1. |
| B‑m4 no Tab-out assertion | **Closed in code** (`menubar.mjs:129-131`). |
| B‑m5 digit `code` fallback | **Closed in code** (`shortcuts.ts:46-51`) with a three-case spec. |
| B‑m7 review record untracked | **Claimed closed. Not closed.** See Material 1. |

---

### Material — `references/reviews/2026-09-04-menubar/disposition.md:72` says the review record is committed. It is not, and neither are the friction notes.

`disposition.md:72` reads: *"B-m7 | The review record was untracked. | **Fixed.** This directory is committed with the fix wave."*

Evidence: `git show 09f42d0 --stat` lists twelve files, none under `references/`. `git ls-files references/reviews/2026-09-04-menubar/` returns only `plan.md` and `plan-review.md`. `git status --porcelain` right now still shows `?? disposition.md`, `?? review-a.md`, `?? review-b.md`, `?? brief-a.md`, `?? brief-b.md`.

Worse, `references/friction-notes.md` is ` M` — the three notes this wave wrote (the `:root` var-resolution rule at `:133-141`, the `--cs-on-accent` rule at `:142-146`, the Vite-watcher trap at `:147-150`) are uncommitted too, though `disposition.md:59` says *"Friction note added."* `git log -1 -- references/friction-notes.md` is `070361b`, the pre-fix wave.

So the two artifacts a later session would read as ground truth — the review record and the friction notes — exist only in this working tree, and the record asserts otherwise. This is exactly the class of defect review B raised, restated as fixed.

**Fix:** `git add references/friction-notes.md references/reviews/2026-09-04-menubar/*.md` and commit (decide deliberately about the six `.err` files — they are agent stderr, not record). Until that commit exists, `disposition.md:72` should read *"pending"*, not *"Fixed"*.

### Material — `packages/menubar/src/lib/menubar.css:151-155` — the wave fixed one AA pair and shipped another at 3.55:1, including the text it just added.

The "Coming soon" heading renders as `[data-menubar='group-label']`: `color: var(--_mb-muted)` at `menubar.css:154`, `font-size: smaller` at `:155` (≈11.7px off a 14px base — normal text by WCAG, not large). The studio bridges `--menubar-muted: var(--cs-ink-muted)` at `styles.css:12`.

Measured in Chromium with the harness's own canvas-readback and WCAG luminance formula (the code at `menubar.mjs:36-49`, run against the token values):

| pair | ratio |
|---|---|
| ash `oklch(62% 0.012 95)` on white `oklch(99% 0.004 95)` — light | **3.55:1** |
| fog `oklch(70% 0.012 260)` on slate `oklch(23% 0.014 260)` — dark | 6.34:1 |

The same `--_mb-muted` colours the shortcut column on **enabled** rows (`menubar.css:134-137`). Those are visible in `screenshots/menubar-1512-view-open.png` as the pale `⌃⌘B / ⌃⌘J / ⌃⌘I / ⌃⌘T` stack beside four live checkitems. Disabled rows (`menubar.css:122-127`) are genuinely exempt — WCAG 1.4.3 excuses inactive components — but a heading and a shortcut hint on an enabled row are not. `aria-hidden` on the shortcut span (`menubar.tsx:100`) hides it from assistive tech, not from eyes; 1.4.3 is a visual requirement.

The wave built the measuring tool (`contrast()`, `menubar.mjs:36-49`) and pointed it at one pair.

**Fix:** bridge `--menubar-muted` to a token that clears 4.5:1 on `--cs-surface` in light — a darkened ash around `oklch(52% 0.012 95)` measures ≈4.9:1 — and add two `ok()` calls reusing `contrast()`: one on a group label, one on an enabled row's `[data-menubar="shortcut"]`, in both themes.

### Material — `packages/menubar/README.md:47` — the package's declared contract still calls `Menubar.Group` a Radix passthrough, after the fix gave it an API.

`README.md:46-50` lists *"`Menubar.Sub`, `Menubar.Separator`, `Menubar.Label`, `Menubar.Group` — Radix's parts."* `Menubar.Group` is no longer that: `menubar.tsx:227-241` gives it a `label?: ReactNode` prop, renders the heading itself with a `useId()`, and sets `aria-labelledby`. The two facts that make this the *recommended* route — that Radix's `Label` carries no role (`@radix-ui/react-menu/dist/index.mjs:361-366`, a bare `Primitive.div`), and that `Group label=` is how a heading gets announced — live only in the source docblock at `menubar.tsx:221-225`.

The README is not incidental documentation here: `AGENTS.md:176` names it as the package's contract, and the extraction procedure two sections down hands the package to a stranger. Reviewer B's B‑M3 was upheld on exactly this basis; the fix repaired the extraction half of the README and left the API half describing the pre-fix component.

**Fix:** one bullet — *"`Menubar.Group` — groups items; pass `label` and the group is announced by that heading (`aria-labelledby`). `Menubar.Label` alone is a plain div with no role, by Radix's design."*

### Minor — `apps/studio/src/app/studio-menus.tsx:30,37` — the a11y part the commit built is not used at the place the a11y complaint was made.

Both seams use bare `<Menubar.Label>Coming soon</Menubar.Label>`, not the `<Menubar.Group label="Coming soon">` the same commit added for precisely this. The package's spec uses the new route (`menubar.spec.tsx:39`); the shipped app uses the old one.

Switching would not fully close it, and that is the part worth putting on the record. Every item in File and Edit is `disabled`, and Radix sets `focusable: !disabled` on each item's roving-focus wrapper (`@radix-ui/react-menu/dist/index.mjs:443`). Nothing in those two menus is focusable, so ArrowDown highlights nothing and focus can never enter a group — a group name would go unannounced too. Review B's complaint had two halves ("a keyboard user presses ArrowDown and nothing highlights; a screen-reader user hears three dimmed items and no reason"); the heading answers the sighted case only. `disposition.md:92-94` frames the residue purely as a screen-reader-announcement question and names `aria-describedby` on the menu as the door — the right door, but the keyboard half isn't mentioned.

**Fix:** switch the studio to `Menubar.Group label=` for consistency with the package's own guidance, and extend the accepted-risk bullet to say that with every item disabled, ArrowDown highlights nothing at all — the heading is a sighted-only affordance until a real item lands.

### Minor — `packages/menubar/src/lib/shortcuts.ts:117` — `global` still vetoes for everyone, the way `when` used to.

```ts
if (editable && !binding.global) return;   // :117
if (binding.when && !binding.when()) continue;  // :118
```

The `when` fix made stacking two bindings on one combination a supported pattern — the new spec at `shortcuts.spec.ts:92-108` is built on it. The editable guard didn't follow: given `[{X, run: a}, {X, run: b, global: true}]`, typing in a field hits the first, returns, and the global binding never fires. The docblock now reads *"The first matching binding whose guard passes wins"* (`:101-102`), which a reader will take to cover this case. The existing spec doesn't reach it — `shortcuts.spec.ts:71` binds the global handler to a *different* key (`j` vs `b`).

**Fix:** `continue` there too, with the same one-line spec as the `when` case; or, if the veto is deliberate, say so in the `global` docblock at `:82-85`.

### Minor — `packages/menubar/src/lib/menubar.spec.tsx:39` — the pattern the studio actually ships lost its coverage.

The fixture changed from a standalone `<Menubar.Label>` plus a bare `<Menubar.Group>` to `<Menubar.Group label="Layout">`. Net result: no spec anywhere exercises a bare `Menubar.Group` (that it renders `role="group"` with no stray `aria-labelledby` pointing at nothing), and no spec exercises a standalone `Menubar.Label` — which is what `studio-menus.tsx:30,37` ships. `studio-menus.spec.tsx:38` filters by `name: /manuscript|project|Save/`, so it would not notice if the heading ever acquired a role and joined the menuitem set. The only guard on "Coming soon" existing at all is the browser harness (`menubar.mjs:205`).

**Fix:** one assertion in `menubar.spec.tsx` for `<Menubar.Group>` with no label, and one in `studio-menus.spec.tsx` that File exposes exactly three `menuitem`s and a "Coming soon" that is not one of them.

### Minor — `references/reviews/2026-09-04-menubar/disposition.md:90` cites a finding that does not exist.

*"Browser-level availability of ⌃⌘B/J/I/T is proven manually by Ryan, not by the harness (A-m7, A-m2)."* Review A has no A‑m7; under the disposition's own numbering its minors run A‑m1 to A‑m5, and this is A‑m2 alone. Trivial, but it is a citation in the record.

---

## Clean passes

What I checked myself, and what I read or ran.

- **The height cap genuinely moved.** `grep -rn "_mb-max-h"` across `packages/ apps/ tools/` returns nothing; `menubar.css:16-37` no longer declares it; `menubar.css:85-87` declares `max-height: var(--radix-menubar-content-available-height, 80vh)` inside `[data-menubar='content']`, with a comment stating why the position matters and a `token-ok` covering only the `80vh` fallback. `README.md:86-88` now says the variable is "set on the open menu itself". The harness check at `menubar.mjs:97-102` is a bound (`> mb.height - 1`, `<= 982 - mb.y + 2`) plus `Math.abs(maxH - 785.6) > 4` — narrower than review B's "tracks the trigger's distance", but `disposition.md:59` describes it as "asserts the computed cap is not the fallback", which is what it does. No overclaim. `plan.md:149` still reads `max-height: var(--_mb-max-h)`; that is a dated pre-build artifact and the change has a deviation row, so I don't count it stale.
- **The contrast numbers are real — I re-measured them.** Running the harness's own WCAG luminance code against the token values in Chromium: night `oklch(17% 0.012 260)` on ember `oklch(64% 0.17 45)` = **5.31:1**; on ember-bright `oklch(72% 0.16 50)` = **7.30:1**; the old surface-on-ember = **3.49:1**. All three match the commit message and `disposition.md:60` exactly. `--cs-on-accent` is declared once at `tokens.css:53` and appears in neither dark block (`:83-93`, `:95-107`), so "pinned in both themes" is literally true. `screenshots/menubar-1512-view-open.png` shows the open View title as near-black on ember — the new pairing, rendered.
- **The token's existence is pinned, by the lint rather than a spec.** `check-tokens.mjs:105-107` flags any `var(--cs-…)` with no declaration in `tokens.css`, and `styles.css:17` carries no `token-ok`, so deleting `--cs-on-accent` fails `lint:tokens`. I ran it: *"46 files · 57 tokens declared · 127 var() references · ✔"* — 57, one more than the 56 review A recorded, which is the new token. I traced the rule rather than performing the deletion. No unit spec pins it; given the lint, none is needed.
- **`when` → `continue` has a spec that bites.** `shortcuts.spec.ts:92-108` puts two bindings on ⌃⌘B, asserts the second runs while the first's guard is false, flips the flag and asserts the first runs and the second is not called again. `pnpm exec vitest run` in `packages/menubar`: **32 passed** (manifest 3, shortcuts 15, menubar 14) — matching `disposition.md:81`. `apps/studio`: **16 passed**.
- **The digit fallback is complete and honest.** `shortcuts.ts:46-51` returns `Key<X>` for `/^[a-z]$/`, `Digit<N>` for `/^[0-9]$/`, `undefined` otherwise; `shortcuts.spec.ts:37-41` covers all three including the punctuation non-match. That spec pins ⌥`/` as *unsupported*, which is a limitation frozen by a test — but the docblock at `:55-58` says "Letters and digits", so the code and its claim agree.
- **The assertion arithmetic holds at 59.** 57 `ok(` call sites in `menubar.mjs`; one of them sits inside the three-iteration loop at `:152-165`; section 9's `{ }` at `:251-278` is a plain block, not a conditional. 56 + 3 = **59**, matching the commit message and `disposition.md:81`. I did not run the harness — no dev server was started in this review.
- **The disabled-seam click is now the right click.** `menubar.mjs:203` is `await seam.dispatchEvent('click')` with an inline comment naming `pointer-events: none` as the reason — precisely review A's fix, and the three original checks are unchanged at `:204`.
- **The extraction procedure is true claim by claim.** `tsconfig.json:12`, `tsconfig.lib.json:2`, `tsconfig.spec.json:2` all `"extends": "../../tsconfig.base.json"`; `vite.config.mts:12` is `setupFiles: ['../../tools/src/vitest/setup.ts']` and `:2` imports `@vitejs/plugin-react`; `eslint.config.mjs:2` imports `../../eslint.config.mjs`; `tools/src/vitest/setup.ts:26-28` stubs exactly the four methods the README names (`scrollIntoView`, `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`). The dev-dependency list and the `.js`-extension note are both accurate.
- **The record's counts are dated, not stale.** `disposition.md:20`'s "52 / 52" sits under the heading *"Evidence the session collected itself (before the reviews)"*; `:81` records 59/59 after the fixes. Two different moments, both labelled.
- **The deviations table absorbed both reviewers' asks.** `:48` records the §9 narrowing (B‑m1) and `:49` records that the plan's *"`Label` and `Group` render their roles"* was not achievable as written (B‑m2). Both name the finding they answer.
- **The Matrix story picture is not stale.** `menubar.stories.tsx:63` moved the label from a sibling above the group to the group's `label`, which renders it as the group's first child — same DOM order, same `[data-menubar='group-label']` styling, so the rendering is unchanged. The screenshots were regenerated at 16:44–16:45 against a commit made at 16:43:30.
- **AGENTS.md carries no claim the fix falsified.** Its menu-bar paragraph (`:43-50`) names no assertion count, no `:root` contract wording, and no contrast figure; the harness paragraph (`:98-102`) names viewports only.

## Verdict

The two Material defects and every minor from round one are genuinely closed in code and the disposition is unusually honest about what it narrowed — but the wave shipped a second AA failure in the muted text it just added, left the package README describing a component the same commit changed, and marked "the review record is committed" fixed when neither the record nor the friction notes are in any commit.
