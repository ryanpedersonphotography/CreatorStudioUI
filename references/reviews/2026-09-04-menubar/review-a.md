Both harnesses re-run green on the dev server (cockpit 73/73, menubar 52/52) and the package's 31 specs pass. Two real defects, one confirmed empirically in Chromium.

## Findings

### Material — `--_mb-max-h` can never see the Radix variable it names

`packages/menubar/src/lib/menubar.css:37` declares

```css
--_mb-max-h: var(--radix-menubar-content-available-height, 80vh); /* token-ok: Radix sets this per open menu */
```

on `:root`. Custom-property substitution happens at computed-value time **on the element that holds the declaration**, and Radix sets `--radix-menubar-content-available-height` as an inline style on each Content element (`@radix-ui/react-menubar@1.1.24/dist/index.mjs:264`, and `:384` for sub-content) — a descendant of `:root`, never `:root` itself. So `--_mb-max-h` resolves to the `80vh` fallback and inherits down as a constant; `[data-menubar='content'] { max-height: var(--_mb-max-h) }` (`:86`) is always 80vh.

Confirmed in Chromium: the same declaration read from `:root` gives `480px` (80vh of a 600px viewport) while reading it on the element that carries the variable gives `123px`.

This makes three statements false: the comment on `:37` ("Radix sets this per open menu"), `packages/menubar/README.md:86` ("Menus cap their height at Radix's `--radix-menubar-content-available-height` and scroll"), and the plan's decision 9. Practically, a menu longer than the space under its trigger overflows the viewport instead of capping at the available height — invisible with today's three-to-six-item menus, live the moment File and Edit are filled in. The `token-ok` on that line also suppresses the undefined-token check for a variable that is unresolvable in that position, so the lint can't tell you.

**Fix:** delete `:37` and put the value where it resolves —

```css
[data-menubar='content'] {
  max-height: var(--radix-menubar-content-available-height, 80vh); /* token-ok: Radix sets this per open menu; 80vh is the standalone fallback */
```

### Material — the highlighted row fails WCAG AA in the light theme

`apps/studio/src/styles.css:13-14` bridges `--menubar-highlight-bg: var(--cs-accent)` and `--menubar-highlight-fg: var(--cs-surface)`. Measured through Chromium's own oklch resolution (canvas readback, WCAG relative luminance):

| | fg | bg | ratio |
|---|---|---|---|
| light (default) | white `rgb(252,252,249)` | ember `rgb(220,99,30)` | **3.49:1** |
| dark | slate `rgb(25,29,36)` | ember-bright `rgb(242,130,59)` | 6.46:1 |

AA wants 4.5:1 for normal text. This hits `menubar.css:113-120` (the highlighted row — the state every keyboard user reads) and `:65-69` (a hovered or open title). Note the direction is the opposite of what the brief suspected: dark is comfortable, the **default light theme** is what fails. It is a new pairing — nothing else in the app puts text on `--cs-accent`; the toolbar's toggles use `text-ink` on transparent.

**Fix:** don't reuse `--cs-surface`, which has to flip with the theme and therefore can't be tuned for the accent. Add one semantic token pinned across both themes in `packages/tokens/src/tokens.css` — `--cs-on-accent: var(--cs-p-night)` — and bridge `--menubar-highlight-fg: var(--cs-on-accent)`. Measured: **5.31:1 light, 7.30:1 dark**, one value, no theme override. (`--cs-ink` is not the fix: 4.59:1 light but roughly 1.5:1 in dark, where it becomes chalk.)

### Minor — the disabled-seam click assertion can't reach the seam

`tools/src/verify/menubar.mjs:177` clicks the centre of `File › New manuscript…` with `page.mouse.click`, but `menubar.css:126` sets `pointer-events: none` on `[data-disabled]`, so the browser hit-tests through to the menu content behind it. The assertion on `:179` ("clicking it leaves the menu open and moves nothing") proves a click on the menu background is inert, not that the item refuses selection. The preceding `ok` on `:174` carries the real weight, and the package spec (`menubar.spec.tsx:109-119`) does prove the refusal, because jsdom never loads the skin.

**Fix:** dispatch straight at the element so `pointer-events` is bypassed — `await seam.dispatchEvent('click')` — then keep the same three checks.

### Minor — the ⌃⌘ manual browser check is recorded as owed, never as done

Plan decision 4 required a manual check that Chrome on macOS lets ⌃⌘B/J/I/T through, "recorded in the report". `references/friction-notes.md` records the obligation ("that is a manual check in Ryan's own browser") but nothing records the result. Headless Chromium has no browser chrome, so the 52-assertion harness proves the bindings reach the page and nothing about the real browser. The four combinations remain unverified against Chrome's own reservations.

### Minor — `when` can only ever veto, never defer

`packages/menubar/src/lib/shortcuts.ts:104` does `if (binding.when && !binding.when()) return;` — a `return`, not a `continue`. A second binding on the same combination with a passing `when` therefore never fires, which is the obvious use of a per-keystroke guard ("this handler while the editor has focus, that one otherwise"). The docblock on `:90` ("The first matching binding wins") is consistent with the code, so nothing is falsely claimed, but the feature is half-built. One-character fix: `continue`. The same line applies to the editable guard on `:103`, where `return` is correct.

Separately, `:80` treats `<select>` as editable, which the docblock on `:76-77`, the `global` doc on `:68-73`, and `README.md:52` all omit. Harmless superset; the comment should say so.

### Minor — four contract properties are unbridged, so the studio ships a raw shadow

`apps/studio/src/styles.css:8-25` maps 16 of the 20 `--menubar-*` properties. `--menubar-shadow`, `--menubar-min-width`, `--menubar-indicator-width` and `--menubar-z` fall back, which means the shipped studio menu carries `rgb(0 0 0 / 0.18)` from `menubar.css:34` — a raw colour that AGENTS.md's "every design value lives in `packages/tokens`" doesn't cover, and that the `token-ok` on that line legitimately hides from the lint. Fine by the portable package's own rules; worth one line in the bridge comment saying which four are deliberately left on their fallbacks.

### Minor — `CompactStates` story can't recover its top shelf

`apps/studio/src/app/studio-cockpit.stories.tsx:41-44` passes `top` but not `shortcuts`, so the story that exists to show collapsed states is the one place ⌃⌘T doesn't bring the shelf back — the exact scenario deviation 1 was made for. Add `shortcuts={<StudioShortcuts />}` as `WritersCockpit` does.

## The two deviations

**Deviation 1 — shortcuts in `StudioShortcuts` via a `shortcuts` slot: correct, and the plan was wrong.** `studio-cockpit.tsx:98` swaps the toolbar for a `Strip` when the shelf collapses, so a binder inside `StudioToolbar` would unmount with it and ⌃⌘T could never restore the shelf. The slot renders at `studio-cockpit.tsx:95`, inside `Cockpit.Regions` and outside every `Cockpit.Panel` — the only position that both has the region context and survives a collapse. `menubar.mjs:147` asserts precisely the failure mode ("brings it back though the toolbar was unmounted") and passes. Endorsed.

**Deviation 2 — `Menubar.Sub` closing one level on Escape: correct.** Radix's default is `rootContext.onClose()`, which closes the whole bar from a submenu (`@radix-ui/react-menu/dist/index.mjs:753-756`); APG's menubar pattern says Escape closes the current menu and returns focus to its parent item. The override at `menubar.tsx:198-204` composes ahead of Radix's handler, and `preventDefault()` stops both Radix's `onClose` (`composeEventHandlers` defaults to `checkForDefaultPrevented: true`) and DismissableLayer's `onDismiss` (`@radix-ui/react-dismissable-layer/dist/index.mjs:96`). Only the topmost layer registers the Escape listener (`:102-107`), so the parent content's handler doesn't double-fire. Focus moves synchronously to the still-mounted sub-trigger, and `MenuSubContent`'s `onCloseAutoFocus: (event) => event.preventDefault()` (`:749`) keeps FocusScope from taking it back. Both the spec (`menubar.spec.tsx:156-175`) and the harness (`menubar.mjs:190-192`) bite. Endorsed.

## Clean passes

- **Reset layout's key list matches what the shell actually writes.** The root `Cockpit` is mounted with no `store` (`studio-cockpit.tsx:96`), so it uses `sessionStore()` (`cockpit.tsx:78-85`) and `cs:layout:default:root` never exists; only `body` and `center` pass a store, and `useCollapsedMemory` is wired for nav/context/inspector only. The cockpit harness prints the live key set: `cs:collapsed:default:{context,inspector,nav}, cs:layout:default:{body,center}` — exactly `layoutKeys()` (`studio-commands.ts:72-80`), plus `cs:theme`, which `menubar.mjs:240` proves survives the reset.
- **The `kind:portable` constraint bites as claimed.** `findConstraintsFor` collects *every* entry whose `sourceTag` the project carries (`@nx/eslint-plugin/dist/src/utils/runtime-lint-utils.js:128-137`) and the rule loops over all of them, reporting on the first failure (`rules/enforce-module-boundaries.js:437-451`) — an AND, not an OR. `kind:portable` appears on exactly one project (grep across the workspace: only `packages/menubar/package.json:22` and the generated graph), so no workspace target can satisfy it. External packages are governed by `allowedExternalImports`, which is unset, so Radix is unaffected. `manifest.spec.ts` covers the `package.json` channel the rule can't see.
- **The focus handoff's `data-region` check and its event order.** `data-region` is produced in exactly three places, all `"top"` (`studio-menus.tsx:28,34,42`) — no other element in `apps/` or `packages/` sets it, so `closest('[data-region]')` (`studio-cockpit.tsx:189`) cannot match something unintended, and `View › Navigation` correctly registers as *not* pending for the `nav` handoff. The unmount-focus race resolves the way the plan says: `MenubarContent`'s `onCloseAutoFocus` always calls `event.preventDefault()` (`react-menubar/dist/index.mjs:216-222`), so FocusScope's body fallback never runs, and its `triggerRef.current?.focus()` targets a detached node when the toolbar has unmounted. `menubar.mjs:213` sleeps 300ms — well past FocusScope's `setTimeout(…, 0)` — and reads `Expand top shelf`. Passes.
- **`useTheme`'s no-write-on-mount and its ref.** `useState` reads the store in an initialiser and applies nothing (`use-theme.ts:24`); `applyTheme` and `setItem` happen only inside `setTheme`, behind an identity guard (`:27-33`). Proven three ways: `studio-menus.spec.tsx:58` (`store.bag.size` is 0 after mount), `app.spec.tsx` ("a plain mount writes no theme"), and `menubar.mjs:183` in the browser. `main.tsx:8` is the only mount-time application, and `menubar.mjs:200` proves the value survives a reload.
- **`useShortcuts` lifecycle.** One `keydown` listener for the mount (`shortcuts.ts:110-112`, empty deps), bindings read through a ref refreshed every render (`:94-96`). `shortcuts.spec.ts:109-124` spies on `window.addEventListener` and asserts exactly one registration across three re-renders with a changed handler, plus removal on unmount — the mutation the wave-1 message claims was proven red.
- **`aria-keyshortcuts`, names, and the aria-hidden gutter.** The indicator and shortcut spans are `aria-hidden` (`menubar.tsx:95,100`) and the chevron too (`:186`), so `getByRole('menuitemcheckbox', { name: 'Navigation' })` resolves to the plain title while `textContent` is `✓Navigation⌃⌘B` — asserted both ways at `studio-menus.spec.tsx:47-51` and `menubar.mjs:114-117`. `textValue` defaults to the string label (`:74-76, 116, 131, 155`), and typeahead on `i` reaches Inspector while Inspector is checked (harness section 5).
- **The token lint is genuinely clean, not suppressed into silence.** `pnpm lint:tokens` — 46 files, 56 tokens, 127 `var()` references, no findings. Every `token-ok` in `menubar.css:17-37` sits on a contract line whose only raw value is the standalone fallback the portable design requires; the one that hides something it shouldn't is `:37`, above.
- **Harness claims reproduce.** `node tools/src/verify/all.mjs` against the dev server: cockpit 73/73, menubar 52/52, no console or page errors. The 52 comes from 50 `ok(` call sites with one inside a three-iteration loop. `pnpm exec vitest run` in `packages/menubar`: 31 tests, 3 files, green. `pnpm typecheck` and `pnpm lint`: 7/7 projects each (Nx cache hits — same inputs, same green). I did not rebuild and re-run under `--preview`, so the commit's "on the built bundle" half is unverified by me.
- **The retargeted cockpit assertion is honest.** `cockpit.mjs:393` reads "expanding from the strip moves focus into the returned toolbar, on its first control (the File menu)" and asserts `'File'` — the named change, and the count still lands at 73.

## Verdict

Ship after fixing the two Material findings — the `:root`-scoped `--_mb-max-h` (which also falsifies a comment, the README and the plan) and the 3.49:1 highlighted-row text in the default light theme; everything else in the build stands up to its own claims.
