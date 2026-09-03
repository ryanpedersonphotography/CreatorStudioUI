# Reviewer B — what is missing, nominal, or inconsistent (`59a7ed9` → working tree)

Read-only. Everything below is quoted from the tree or from commands I ran myself; where I reason rather than execute I say so. Nine of the ten items are genuinely built — the defects are concentrated in what the work *proves* and in three places where a promise in `AGENTS.md` is no longer true of the code.

---

## 1. MATERIAL — hide-then-show throws away the width the writer just dragged

`apps/studio/src/app/studio-cockpit.tsx:39-42` passes a `restoreSize` to all four toggles. `packages/shell/src/lib/use-panel-toggle.ts:55-59` then takes the `resize(restoreSize)` branch on *every* `show()`, never `expand()`.

I measured it. From my own run of `pnpm verify:ui --preview`:

```
✓ dragging the navigation separator widens the nav — 286 → 446
✓ toggle shows it again at its restore size — 286
```

The writer drags nav to 446, clicks Hide, clicks Show, and lands at 286. `AGENTS.md` § *Core experiences* promises "the layout comes back exactly as left." It does not.

This is not a porting error — the hook is verbatim from the kit. It is a misreading of what `restoreSize` is *for*. The kit's own measurements (`/Users/ryanpederson/Dev/Shell2/shell-widgets/packages/shell/rrp/src/usePanelToggle.ts:71-77`) say `expand()` after a **button** collapse is exact (`drag to 440 → collapse() → expand() = 440`) and only a **drag**-shut panel reopens at `minSize`. So `restoreSize` is the fallback for the drag path, and using it unconditionally makes the button path strictly worse than the library's own default.

Fix inside the hook, so no caller has to know: record how the collapse happened. Set a ref in `hide()`/`toggle()`; in `show()`, call `handle.expand()` when that ref says the last collapse was imperative, and `handle.resize(restoreSize)` only when it was a drag. `tools/src/verify/cockpit.mjs:182` asserts `navShown > 100`, which is loose enough to pass through the defect — tighten it to `Math.abs(navShown - navAfter) <= 1`.

---

## 2. MATERIAL — the `top` region is a one-way door with a working handle on it

`studio-cockpit.tsx:24` publishes `top` in `STUDIO_REGIONS`, `:39` builds `topToggle`, `:45` puts it in the context map, and `:61` binds it to the panel. Nothing calls it. So today it is dead weight — but `useCockpitRegion('top')` returns a live toggle, and the top shelf is where `app.tsx:27-35` puts the *only* controls for nav, context and inspector.

One `<ToggleButton region="top" …/>` — a plausible next commit, and the type already permits it — hides the toolbar, and with it every control including its own. There is no separator on the root group (`studio-cockpit.tsx:60-64` has no `Cockpit.Separator`), so there is no keyboard route back either. Only clearing `localStorage` recovers.

Fix: either drop `top` from `STUDIO_REGIONS` and the region map so it cannot be reached, or keep it and give the shelf a persistent affordance that survives its own collapse — a `collapsedSize` stub rather than `cockpitSizes.collapsed`, plus a keyboard shortcut on the document. Recording the intent matters as much as the code; right now the file reads as if a `top` button were simply not written yet.

---

## 3. MATERIAL — the toolbar buttons fail WCAG 2.5.3, and `role="toolbar"` is asserted without the behaviour it promises

`apps/studio/src/app/app.tsx:41-49`:

```tsx
aria-label={`Toggle ${label}`}
…
{toggle.hidden ? 'Show' : 'Hide'} {label}
```

The visible label is "Hide navigation"; the accessible name is "Toggle navigation". The accessible name does not contain the visible text, which is exactly the Label in Name failure (WCAG 2.5.3) — a voice-control user saying "click Hide navigation" gets nothing. `app.spec.tsx:17` locks the broken name in as the contract.

Separately, `app.tsx:29` sets `role="toolbar"` on a div holding three independently tabbable buttons. The ARIA APG requires a toolbar to be a single tab stop with arrow-key navigation between its controls; without roving tabindex the role is a promise to assistive tech that the widget does not keep.

Fix: drop `aria-label` entirely — the visible text is already a good name — and keep `aria-pressed` for state (it is currently redundant with the Show/Hide text; pick one, and `aria-pressed` with a stable "Navigation" label is the cleaner pair). Then either implement roving tabindex or remove `role="toolbar"` and use a plain `<div>`; three buttons in a header do not need the role.

---

## 4. MATERIAL — the separator's focus state is a colour swap with `outline-none` on unconditionally, and nothing proves it is visible

`packages/shell/src/lib/cockpit.tsx:197` opens the class list with a bare `outline-none`, not the reference kit's `focus-visible:outline-none` (`ShellSeparator.tsx:35`). Every outline is suppressed, in every state, and the entire focus indication is `data-[separator=focus]:bg-focus` at `:200` — the same channel already used for hover and active, on a 6px bar.

Two consequences. First, the library's own precedence is `disabled > active > focus > hover` (footguns.md:194), so a keyboard user who focuses a separator and then moves the mouse over it sees the focus colour replaced by the hover colour — the indicator vanishes while focus is still there. Second, `focus-visible:z-10` at `:197` raises an element that now has no ring to raise; it is vestigial.

The 2026-09-02 review named the fix precisely — `references/reviews/2026-09-02-skeleton/reviewer-b-conventions.md:141`: *"add `data-[separator=focus]:outline focus-visible:outline` bound to a new `--cs-focus-ring` width token."* No such token exists in `packages/tokens/src/tokens.css`, and no record anywhere says the recommendation was considered and declined. A later session reading that review will believe finding 6 is closed.

The proof gap compounds it. `tools/src/verify/cockpit.mjs:127-130` checks that hover and active are *painted* differently from idle. Line 201 checks only that `data-separator === 'focus'` — the one state whose paint nobody verified.

Fix: add `--cs-p-focus-ring: 2px` / `--cs-focus-ring` and bridge it; change `:197` to `focus-visible:outline-none` plus an `outline`/`outline-offset` on `data-[separator=focus]`; and extend the harness's colour comparison to focus alongside hover and active.

---

## 5. MATERIAL — `panelIds` changes the storage key, and the port that owns the key format was not told

Item 3 is built and works — `cockpit.tsx:85` forwards `panelIds`, and `cockpit.spec.tsx:66` shows the real read at `cs:layout:demo:root:nav:main`. But `AGENTS.md` says the port owns the key format, and `packages/contracts/src/lib/layout-store.ts:22-23` still documents exactly one shape:

```
Storage key for one panel group of one project: `cs:layout:<projectId>:<group>`.
```

`layoutKey()` cannot produce the extended form, so the shell now writes keys the port cannot express or describe. That is the same objection the 2026-09-02 reviewer raised (`reviewer-a-correctness.md:173`) — it was answered by adding the capability, not by updating the contract.

And the trap is already armed: `tools/src/verify/cockpit.mjs:213` asserts every key equals `key('root')`, `key('body')` or `key('center')` exactly. The first conditional region in the app turns that green gate red with a failure that reads like a persistence bug.

Fix: give `layoutKey` an optional third parameter (`panelIds?: string[]`) that appends `:${ids.join(':')}`, document both shapes in the port's docstring, have `Cockpit` derive its id through it, and change the harness assertion to a `startsWith(key(g))` prefix test.

---

## 6. MATERIAL — the prior review's panel-id finding is still open, is now load-bearing, and nothing records it as open

`reviewer-b-conventions.md:31-36` flagged that `CockpitPanel` passes `id={id}` straight to the DOM, so two cockpits on one page emit duplicate `#nav`/`#main`. `cockpit.tsx:138` still does. The remedy proposed there — namespace the DOM id by group while keeping the caller's `id` as the stable handle — was not taken, and the JSDoc at `cockpit.tsx:30` converts the defect into a caller obligation: *"keep them unique across the page, not just the group."*

This change makes it bite. `apps/studio` now claims seven of the most generic ids in the document: `#top`, `#body`, `#nav`, `#center`, `#main`, `#context`, `#inspector` (`studio-cockpit.tsx:61-110`). The story could not reuse them and had to hand-prefix all five with `five-` (`cockpit.stories.tsx:51-104`) — that prefix *is* the collision, worked around by hand. `AGENTS.md` says "a component that only works in one place is a defect."

The urgency is real: the kit warns that changing panel ids later invalidates every saved layout, because the library keys the saved layout by panel id. Doing this after writers have layouts costs a migration; doing it now costs nothing.

Fix: `id={`${domId(layoutKey)}-${id}`}` in `CockpitPanel`, sourced from a cockpit context, and update the harness selectors. If you'd rather not, say so in the review record — the point is that a later session currently has no way to tell this was decided rather than forgotten.

---

## 7. MATERIAL — the pinned-shelf proof is vacuous, and `pinnedPanel`'s central claim is untested

`tools/src/verify/cockpit.mjs:163-169` drags at `tb.y + tb.height - 1` and asserts the top shelf did not move. There is no separator between `top` and `body` — `studio-cockpit.tsx:61-64` has two panels and nothing between them. The drag lands on empty panel chrome, so the assertion passes whether or not `disabled: true` is set. It proves nothing about item 5.

Worse, the claim that carries the whole pinned-rail recipe is never exercised at all. `cockpit.tsx:157-158` asserts *"A disabled panel is skipped by the drag hit-test but still answers the imperative API"* — that is what makes `pinnedPanel`'s `disabled: true` + `collapsible: true` combination coherent. No unit test covers it (`cockpit.spec.tsx:93` only checks the `data-disabled` attribute is present), and the harness never touches the top toggle because no button exists (finding 2). If the claim is wrong, `topToggle` is silently inert and nobody finds out.

Fix: put a `Cockpit.Separator` in the root group so the drag test has something to refuse, or move the pinned-panel drag proof onto a group that has one; and add a harness step that calls the top toggle through a temporary control (or a story-only harness pass) so `disabled` + `collapse()` is demonstrated once.

---

## 8. MATERIAL — `FiveRegions` is a second, already-diverging copy of the app preset, and the real preset has no story

`cockpit.stories.tsx:41-114` reproduces `studio-cockpit.tsx:38-116` — same nesting, same tokens, same Enter handler inlined at `:76-80` instead of shared. They have already drifted: the story's toolbar (`:116-124`) has no `role="toolbar"` and its buttons no `aria-label`, so the a11y surface the app ships is not the one the story shows.

The split is upside down, and `.ladle/config.mjs:3` is why: `stories: 'packages/**/src/**/*.stories.{ts,tsx}'`. Apps are outside the glob, so `StudioCockpit` — the actual product surface, the thing item 6 asked for — can never have a story, while a throwaway imitation of it does. `AGENTS.md`'s "every component export also has a story" rule has no reach into the one composition that matters.

I'd keep the preset in the app (item 6 is explicit, and item 2's "not a fixed five-slot AppShell" is the right instinct). Widen the Ladle glob to `{apps,packages}/**/src/**/*.stories.{ts,tsx}`, add `apps/studio/src/app/studio-cockpit.stories.tsx` that renders the real `StudioCockpit`, and cut `FiveRegions` down to what only the *primitive* can show: nesting on both axes plus one toggle read through `Cockpit.Regions`. One product surface, storied once, with no copy to keep in sync.

---

## 9. MINOR — the shell's public types name the panel library

`cockpit.tsx:99` exports `CockpitPanelBinding = Pick<PanelProps, 'panelRef' | 'onResize'>`, and `index.ts:6` re-exports it. `panelRef` resolves to `Ref<PanelImperativeHandle | null>` (verified in `packages/shell/node_modules/react-resizable-panels/dist/react-resizable-panels.d.ts:366`), so `react-resizable-panels`' type names appear in any consumer's hover text and inferred types. `CockpitPanelProps.groupResizeBehavior` at `:117` copies the library's vocabulary verbatim as a string union.

`AGENTS.md` scopes the boundary promise narrowly ("the shell strips the library's own key prefix so the store never learns which library is underneath"), and the store side is genuinely clean — so this is not a rule violation. But the wider claim in the brief, that a consumer never has to know, does not hold today.

Worth noting on the credit side: dropping the kit's `handle: PanelImperativeHandle | null` escape hatch from `PanelToggle` (`use-panel-toggle.ts:6-16` vs the kit's `usePanelToggle.ts:26-27`) was the right call and closes the larger half of this. Finish it: declare a local `CockpitPanelHandle` with the four methods actually used and type `panelRef` against that.

---

## 10. MINOR — the token gate does not see Tailwind arbitrary values, and this change added two

`cockpit.stories.tsx:18` and `:48` both carry `h-[80vh]`. `pnpm lint:tokens` passes — I ran it: *"✔ no raw values outside packages/tokens/src/tokens.css."* The reason is `tools/src/lint/check-tokens.mjs:116`: length checking is gated behind `isStyleLine`, which matches `style={{` or a CSS-like `prop: value` line. A `className` string is neither, so every `h-[…]`, `w-[…]`, `p-[…]` in the repo is invisible to the rule `AGENTS.md` states as *"No raw values outside the token package."*

Fix: in non-CSS files, also scan `className` string literals for `-\[[^\]]*<length>\]`. That is a few lines in the linter and it closes a hole that will otherwise widen every milestone.

---

## 11. MINOR — a dead class and a dead token, side by side

`cockpit.stories.tsx:18` uses `border-line`. There is no `--color-line` in the `@theme inline` block (`tokens.css:108-136`), so Tailwind emits nothing — it is a leftover from the reference kit's `bg-line`. Meanwhile `--cs-line: var(--cs-p-line)` is declared at `tokens.css:59` and referenced by nothing in the repo.

Fix: drop `border-line` from the story (`border-border` beside it already does the job), and either bridge `--cs-line` into the theme or remove it.

---

## 12. MINOR — a hit-target token is being used as the visible line, and the separators are 6× the reference weight

`cockpit.tsx:198-199` sizes the separator with `w-separator` / `h-separator`, which resolve through `--spacing-separator: var(--cs-separator-hit)` (`tokens.css:121`) → `--cs-p-rail: 0.375rem` (`:34`) — 6px. The kit deliberately separates the two concepts: a `w-px` visible line with a wider grab target supplied by the library's own `resizeTargetMinimumSize` (`ShellSeparator.tsx:27`, `shell.css:6`). The token's name still says "hit"; its only use is visual width.

So the writer's cockpit currently draws three 6px bars of `--cs-border` across a surface whose north star is "nothing on screen competes with the prose." Fix: add `--cs-separator-line` (1px, or reuse `--cs-line`) for the visible rule, keep `--cs-separator-hit` for the library's `resizeTargetMinimumSize` on the `Group`, and use each where its name says.

---

## 13. MINOR — a styled state the public API cannot reach

`cockpit.tsx:201` styles `data-[separator=disabled]`. `CockpitSeparatorProps` (`:179-187`) exposes `className`, `aria-label`, `onKeyDown` and `disableDoubleClick` — not `disabled`, which the library does support (`react-resizable-panels.d.ts:416`). The branch is unreachable through the cockpit. Narrowing the prop surface is otherwise good work — it correctly excludes the props footgun 20 says `Separator` silently discards — so either add `disabled` (and `elementRef`, which the earlier review also asked for) or drop the dead style.

---

## 14. MINOR — the record a later session will read is wrong in three places

- `AGENTS.md` § *Stage* still says `packages/shell` "renders an **empty three-region** cockpit" and names collapse/pin as the *next* milestone. Both landed in this change. The diff updated the harness paths in that same paragraph but not the sentence around them.
- `AGENTS.md` § *Reference, not source* points at `/Users/ryanpederson/Downloads/finalproject/lost-lantern-studio` and its `docs/footguns.md`. This work was ported from `/Users/ryanpederson/Dev/Shell2/shell-widgets` — a different tree, which also has `docs/footguns.md`. Both exist on disk (I listed both). A later session told to "read the footguns before writing shell code" will read the wrong file and not notice.
- `references/reviews/2026-09-03-cockpit/reviewer-a-correctness.md` and `reviewer-b-gaps.md` are **0 bytes**; both stderr logs say `Warning: no stdin data received in 3s`. As it stands the directory records a gate that was attempted and produced nothing — which under the two-reviewer floor is indistinguishable from a gate that never ran.

Related and worth writing down while it is fresh: item 8's call to skip `holdPixelSizes` is **correct for this layout** and for a non-obvious reason. Footgun 24 case 2 says an imperative collapse trades its delta with the immediate neighbour only; in `studio-cockpit.tsx` every pinned rail's neighbour is the relative `center` or `main` panel, so nothing pinned ever moves. Add one more pinned rail adjacent to another and the exemption evaporates silently. That reasoning exists nowhere in the repo — `references/friction-notes.md` is where it belongs.

---

## Checked and clean

- **Item 1 — dead selector.** `grep` for `data-resize-handle-active` across `apps/` and `packages/` returns nothing; `cockpit.tsx:200-201` uses `data-[separator=…]` for hover, active, focus and disabled. The harness asserts the absence live (`cockpit.mjs:131`) and I watched it pass. Hover and active are also *painted* differently, measured: `oklch(0.93 0.008 95) → oklch(0.64 0.17 45)`. Focus is the exception — finding 4.
- **Item 9 — proof against the built bundle.** I ran `pnpm build && pnpm verify:ui --preview` myself: **29 passed, 0 failed (production bundle)**. `package.json:14` chains it into `pnpm verify`, and `AGENTS.md`'s gate list matches that chain word for word, including `verify:ui --preview`. `tools/src/verify/cockpit.mjs` exists at the path `AGENTS.md` names; `persistence.mjs` is gone and no reference to it survives.
- **Other gates.** `pnpm typecheck`, `pnpm lint`, `pnpm test` (5 projects) and `pnpm lint:tokens` all exit 0 — the first three from Nx cache hits on this exact tree, the token lint executed live.
- **Item 4 — port fidelity.** Diffed `use-panel-toggle.ts` against `/Users/ryanpederson/Dev/Shell2/shell-widgets/packages/shell/rrp/src/usePanelToggle.ts` line by line: `usePanelCallbackRef`, the `sync` reducer, the mount effect, `onResize`, `isCollapsed()` over a zero-size test, the named `restoreSize`, and the `useMemo` identity are all faithful. The one deliberate divergence — dropping the `handle` escape hatch — is a boundary improvement, not a loss.
- **Item 3 — orientation, pass-through, panelIds.** `cockpit.tsx:48/85` and `:104-117`; the nesting test at `cockpit.spec.tsx:69-94` proves both groups read their own key and that `aria-orientation` reports the inverse axis. `panelIds` produces a real read at `cs:layout:demo:root:nav:main` (`:66`) — the library genuinely extends the key, so that test is not vacuous.
- **Item 5 — pinned recipe.** `pinnedPanel` (`cockpit.tsx:160-177`) is exactly disabled + collapsible + equal `min`/`max`/`default` + `preserve-pixel-size`, pinned by an exact-equality test (`cockpit.spec.tsx:99-107`). Footgun 15's "disable the panel, not the separator" is honoured. The harness confirms the shelf sits at 48px and that both sidebars hold their pixel widths across a 1440→1200 viewport change while `#main` absorbs it.
- **Items 2, 6, 10.** `Cockpit` is still one `Group` plus composed children with no region vocabulary; the five-region layout lives in `apps/studio`, not in the package. `grep` across the tree finds zero references to `layout-lab` in any source, doc or config — it was used as reference only.
- **Boundary and store hygiene.** `packages/shell/package.json` depends on `contracts` and `tokens` only, tagged `type:ui`; the story builds its own in-memory `LayoutStore` rather than importing the adapter (`cockpit.stories.tsx:9-15`). The prefix shim (`cockpit.tsx:67-73`) works in the browser: every key in `localStorage` after a full harness run starts with `cs:layout:default:`.
- **Export/test/story coverage.** All six runtime exports from `packages/shell/src/index.ts` have tests: `Cockpit`, `pinnedPanel`, `Cockpit.Regions` and `useCockpitRegion` in `cockpit.spec.tsx` / `cockpit-regions.spec.tsx`, `usePanelToggle` across eight cases in `use-panel-toggle.spec.tsx`. `Cockpit`, `Cockpit.Panel`, `Cockpit.Separator` and `Cockpit.Regions` all appear in stories. `.ladle/` is now tracked in git — the 2026-09-02 finding 1 is genuinely closed.
- **`removeItem`.** Present on the port (`layout-store.ts:18`) and covered including the missing-key case (`layout-store.spec.ts:26`). The 2026-09-02 finding 7 is closed.
- **Separator naming.** All three separators in the app carry distinct `aria-label`s and `app.spec.tsx:21-28` locks that in — footgun 20's requirement met, and `aria-label` is confirmed to pass through `{...rest}` untouched.
