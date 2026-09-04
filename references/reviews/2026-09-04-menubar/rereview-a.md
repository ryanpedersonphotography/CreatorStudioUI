Both Material findings verified closed in a real browser, not just read. Writing up.

## Findings

### Minor — `apps/studio/src/app/studio-menus.tsx:30,37`. The "Coming soon" heading is invisible to the assistive tech it was added for, and the fix for that shipped in the same commit unused.

Review B's finding was that the all-disabled File and Edit menus are "silent to anyone not using a mouse" — keyboard *and* screen-reader users. `Menubar.Label` renders a plain div: Radix's `MenuLabel` is `Primitive.div` with no role (`node_modules/.pnpm/@radix-ui+react-menu@*/…/dist/index.mjs:361-366`). I dumped Chromium's AX tree for the open File menu over the live dev server:

```
menu       | "File"
generic    | ""            ← the Coming soon wrapper
separator  | ""
menuitem   | "New manuscript…"
menuitem   | "Open project…"
separator  | ""
menuitem   | "Save"
…
StaticText | "Coming soon"
```

The text is a `generic`/`StaticText` with no relationship to the menu or to the items. A screen reader in menu mode arrows item-to-item; nothing in that traversal names it. `disposition.md` already records this as accepted risk ("may not announce it") and proposes `role="presentation"` or `aria-describedby` as the door — but the commit's own `Menubar.Group` change is the cheaper door and isn't listed. Sighted keyboard users do get the explanation, so this is a partial close, not a miss.

**Fix:** wrap each seam's rows in the part this commit just built — `<Menubar.Group label="Coming soon">…</Menubar.Group>` — which yields `role="group"` with `aria-labelledby` pointing at the same heading, and is announced on entry. Then update the accepted-risk bullet.

### Minor — `tools/src/verify/menubar.mjs:231-232`. The dark-theme contrast assertion passes when the highlight doesn't apply.

The light probe at `:184` is guarded — `:183` asserts `data-highlighted` on the same row first. The dark probe at `:231` has no such guard, and `contrast()` reads `backgroundColor` through a canvas: a transparent background fills nothing, `getImageData` returns `[0,0,0]`, and the ratio is computed against black. In dark, an *unhighlighted* row is light text on nothing. Measured on the live app:

```
DARK highlighted row   {"ratio":7.3,   "bg":"oklch(0.72 0.16 50)"}
DARK UNhighlighted row {"ratio":17.59, "bg":"rgba(0, 0, 0, 0)"}
```

So a broken highlight in dark reads as 17.59:1 and sails past `>= 4.5`. Light is protected only by luck (dark text on notional black gives 1.8:1 and would go red).

**Fix:** have `contrast()` return the raw `backgroundColor` — it already does — and add `darkRow.background !== 'rgba(0, 0, 0, 0)'` to the assertion at `:232`, or mirror `:183` and assert `data-highlighted` before measuring.

### Minor — `packages/menubar/src/lib/shortcuts.ts:116`. The `global` guard still vetoes later bindings, which the new docblock says it doesn't.

`:117` now correctly `continue`s when `when` fails. `:116` still `return`s:

```ts
if (!matchesShortcut(event, binding.shortcut)) continue;
if (editable && !binding.global) return;      // :116
if (binding.when && !binding.when()) continue; // :117
```

Given `[{shortcut: X, run: a}, {shortcut: X, run: b, global: true}]` and focus in a textarea, binding `a` matches, isn't global, and returns — so the binding explicitly marked "fire even while the user is typing" never fires, and no `preventDefault` happens either, so the keystroke silently does nothing. The docblock at `:101-102` now reads "The first matching binding whose guard passes wins", and `global` reads as a guard. This is the same half-built shape A-m3 called out, left in the sibling line. Review A blessed the `return`, but that was reasoning about code where `when` also returned.

**Fix:** `continue` at `:116` too. No current consumer shares a combination (the four `StudioShortcuts` bindings are distinct), so behaviour is unchanged for everything that exists today. If the veto is deliberate, say so on the `global` docblock instead.

### Minor — `references/reviews/2026-09-04-menubar/disposition.md`, row B-m7. It claims the review record is committed. It is not.

> `| B-m7 | The review record was untracked. | **Fixed.** This directory is committed with the fix wave. |`

`git ls-files references/reviews/2026-09-04-menubar/` returns `plan.md` and `plan-review.md` only; `review-a.md`, `review-b.md`, `brief-a.md`, `brief-b.md` and `disposition.md` are all `??` in `git status`, and 09f42d0 touched none of them. Review B's point stands unchanged: a fresh clone sees the plan and its pre-build review and no evidence the code was ever reviewed — including this disposition, which is itself untracked, so the false row harms nobody but also proves nothing.

**Fix:** if the intent is to commit after the re-reviews land, the row should say pending, not Fixed. Otherwise `git add` the directory now.

### Minor — `packages/menubar/src/lib/menubar.spec.tsx:39`, `menubar.stories.tsx:63`. Standalone `Menubar.Label` lost its only coverage in the commit that made it the studio's shipping pattern.

Both fixtures moved from `<Menubar.Label>Layout</Menubar.Label>` + `<Menubar.Group>` to `<Menubar.Group label="Layout">`. `grep -rn "Menubar.Label" packages/menubar/src apps/studio/src` now finds the standalone form only at `studio-menus.tsx:30,37`. So the part the studio actually ships is exercised by no package spec and appears in no story — and `Matrix`, the story whose job is showing every part, no longer shows it. The `[data-menubar='group-label']` rule at `menubar.css:151-156` (its padding aligns the heading to the label column) is now visually unproven anywhere; the harness only counts the text at `:205`.

**Fix:** keep one bare `<Menubar.Label>` in the `Matrix` story beside the labelled group, so the gallery covers both shapes.

## Clean passes

**The max-height move resolves, measured.** `data-menubar="content"` is on `Radix.Content` itself (`menubar.tsx:65`), and Radix stamps the re-namespaced property in that element's inline `style` (`@radix-ui/react-menubar/dist/index.mjs:258-267`), fed by `--radix-popper-available-height`, which floating-ui's `size` middleware writes on the wrapper (`@radix-ui/react-popper/dist/index.mjs:154`) and which inherits into the content. Probed on the running app at 1512×982: computed `max-height: 944px`, the variable reads `944px` on the content and **`""` on `:root`** — the empty string is the direct proof the old placement could never work. The `80vh` fallback would be 785.6px, and the standalone case still gets it. `menubar.css:37` is gone with no other reference; README:86-88 now describes what the file does.

**The harness assertion for it is non-vacuous three ways** (`menubar.mjs:97-102`). Under the reverted `:root` declaration `maxH` is 785.6 and `Math.abs(maxH - 0.8 * 982) > 4` fails; with the declaration deleted `parseFloat('none')` is NaN and every clause fails; `maxH > mb.height - 1` catches a cap that clips. The upper bound `maxH <= 982 - mb.y + 2` is exact rather than fragile — availableHeight *is* viewport minus the floating top (944 = 982 − 38), and the 2px is pure slack.

**The contrast token is declared where both themes need it, and nothing else moves.** `--cs-on-accent: var(--cs-p-night)` sits once in `:root` (`tokens.css:53`); `--cs-p-night` (`:18`) is a primitive redeclared nowhere, and neither dark block (`:83-93` and the `prefers-color-scheme` twin at `:95-107`) overrides `--cs-on-accent`, so it inherits night in both — A's "one value, no theme override" as specified. Measured on the live app: highlighted row **5.31:1 light, 7.30:1 dark**, matching the commit's numbers, and the open title (`menubar.css:65-69`, same token pair) also reads 5.31. The only other consumers of `--cs-accent` in the repo are backgrounds (`data-[separator=*]:bg-accent` on the panel rules), never text, so no other pairing changes. `node tools/src/lint/check-tokens.mjs`: 46 files, 57 tokens, 127 `var()` references, exit 0.

**`continue` cannot double-fire.** `:118-120` is `preventDefault()` → `run()` → `return`, so exactly one binding runs per keystroke, and `preventDefault` happens only on the binding that actually runs — a keystroke whose every candidate guard fails stays available to the page. `shortcuts.spec.ts:92-108` proves both directions with a flipped `inEditor` flag.

**`physicalCode` is right for the keys it claims.** macOS reports ⌥1 as `key '¡'`, `code 'Digit1'`, which `Digit${key}` matches; `/` returns `undefined`, so `code 'Slash'` correctly does not match `{key: '/', alt: true}` and the spec at `shortcuts.spec.ts:37-41` asserts that `false`. Punctuation Option-combinations therefore still never fire — but that is now the documented boundary ("Letters and digits also match on `code`", `:55`) rather than a silent `Key/` that could never match, which is exactly the narrowing review B offered.

**`Menubar.Group`'s id lands, and a label-less Group is unchanged.** Radix's `MenuGroup` sets `role="group"` *before* spreading props (`@radix-ui/react-menu/dist/index.mjs:358`), so `aria-labelledby` passes through; `MenubarLabel` forwards `id` to `Radix.Label` (`menubar.tsx:227`). `getByRole('group', { name: 'Layout' })` at `menubar.spec.tsx:76` passes, which is the accessible-name computation resolving the IDREF. Without a label, `aria-labelledby` is `undefined` and no heading child renders — identical output to the previous implementation.

**The "Coming soon" heading breaks no count or name assumption.** `studio-menus.spec.tsx:36` counts menuitems with no menu open (the three titles); `:38` filters by `/manuscript|project|Save/`; `app.spec.tsx:46` scopes to the bar. The AX tree shows the File menu's accessible name still `"File"` with three menuitems. Studio suite: 16 passed.

**`dispatchEvent('click')` reaches the guard it claims to.** Radix's `MenuItem` selects inside `onClick: composeEventHandlers(props.onClick, handleSelect)`, and `handleSelect` opens `if (!disabled && menuItem)` (`@radix-ui/react-menu/dist/index.mjs`, `MenuItem`). So the dispatched click hits the disabled check rather than being swallowed by `pointer-events: none`; drop `disabled` and `handleSelect` would fire `onSelect` and `rootContext.onClose()`, closing the menu and turning `menubar.mjs:204` red. The old `page.mouse.click` could not do that.

**The Tab-out assertion discriminates.** Radix triggers render as `button`, so a broken roving tabindex would still satisfy `afterTag === 'BUTTON'` — the allowlist on `afterLabel` (`:132`) is what catches it, because focus would read `Edit`.

**The layout-key assertions bite in the right direction.** If `resetLayout` stopped removing `cs:layout:default:body`, the untouched key would survive the reload and `layoutNow !== draggedLayout` (`:276`) would be false. It asserts inequality rather than absence, which is weaker than plan §9 promised — and that narrowing is now recorded, both in the deviations table (`disposition.md:48`) and as an accepted risk, which is the alternative review B offered.

**Assertion arithmetic.** 57 literal `ok(` call sites in `menubar.mjs`, one of them inside the 3-iteration loop at `:152-165` → 56 + 3 = **59**, matching the commit message's 52 → 59 (+7: max-height, Tab-out, light contrast, the heading, dark contrast, and the two layout-key checks).

**The README extraction procedure is now complete against the directory.** Its "runtime is four files" claim matches `find packages/menubar/src` exactly (`index.ts`, `menubar.tsx`, `shortcuts.ts`, `menubar.css`), and every remaining file is named in step 5 — the three tsconfigs and their base, `vite.config.mts` with the four setup stubs, `eslint.config.mjs`, `manifest.spec.ts`, the six hoisted dev dependencies including `jsdom`, and the `.js`-extension resolution requirement. Review B's Material #2 is closed as written.

**Gates, run by me.** `pnpm exec vitest run` in `packages/menubar`: 32 passed (31 → 32, the new `when`-yields spec). In `apps/studio`: 16 passed. `pnpm typecheck --skip-nx-cache` and `pnpm lint --skip-nx-cache`: "Successfully ran target … for 7 projects", both uncached.

**Not verified by me:** the full 59/59 harness run (it writes `screenshots/menubar-1512-view-open.png` and this review is read-only, so I probed the new height and contrast assertions directly against the live dev server instead), the `--preview` built-bundle run, the cockpit harness at 73/73, and the five mutation reds — of which I independently measured the *green* side for the two harness ones and confirmed by inspection that the three spec ones cannot pass under their stated reverts.

## Verdict

Both Material findings are genuinely closed and I measured them — 944px from Radix's own variable, 5.31:1 light and 7.30:1 dark — with no regression anywhere in the suites; what remains is five cheap Minors, of which the sharpest is that the seam heading still never reaches a screen reader while the commit's own `Menubar.Group label` would fix it in two lines.
