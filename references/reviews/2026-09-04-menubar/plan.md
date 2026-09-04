# Top shelf → a VS Code-style menu bar

**Status:** plan, reviewed · **Date:** 2026-09-04 · **Review:** two headless opus reviewers (A correctness/buildability, B gaps/parity/a11y/portability); every finding is dispositioned in the last section.

## Context

The top shelf today is a row of toggle buttons (`apps/studio/src/app/studio-toolbar.tsx`). Ryan wants
it to become a menu-based system like an IDE's menu bar: titles across the top, click a title and a
menu drops down, hover across titles while one is open, keyboard all the way. It must be modular and
compositional, designed so the menu code can live inside this monorepo or be lifted out of it, and it
targets desktop only, laid out for a MacBook Pro 14" (1512 × 982 logical px at 2×). No mobile.

Reused as-is: the cockpit preset and its region toggles (`useCockpitRegion`, one `PanelToggle` per
region), the top shelf panel that already collapses to a strip with its way back (`Strip` in
`studio-rails.tsx`), the focus handoff for controls that unmount themselves (`useFocusHandoff` in
`studio-cockpit.tsx`), the theme helpers nobody wires yet (`applyTheme`/`parseTheme` in
`packages/tokens/src/lib/theme.ts`), the `LayoutStore` port and the `collapsedKey`/`layoutKey` key
builders in contracts, the token lint, Ladle, and the Playwright harness pattern in
`tools/src/verify/cockpit.mjs`.

Outcome: a `packages/menubar` package with zero workspace dependencies, and a studio top shelf
composed from it: **File · Edit · View** menus on the left, the existing region toggles on the right
(VS Code keeps its layout controls at the top-right too, so the verified rail/strip feature and its
harness survive), the brand label at the far left. View is fully real: it toggles the regions with
shortcuts, switches the theme (a core experience in AGENTS.md with no UI yet), and resets the layout.
File and Edit are honest seams for the Write milestone: present, disabled, no shortcuts promised.

## Decisions (defaults built unless Ryan overrules; raised once here)

1. **Primitive: Radix `@radix-ui/react-menubar` (^1.1.24).** Checked against the published types and
   source on unpkg: Ark UI 5.39 exports no menubar (only `Menu`), and AGENTS.md's rule is "Ark by
   default; Radix only where Ark has no equivalent, with a one-line comment beside the import". A
   menubar is that case: bar-level roving focus, Left/Right across titles, hover-switch while a menu
   is open, click-to-close on an open title, typeahead, submenus, portal + collision positioning,
   non-modal. Hand-rolling the APG menubar is ~600 lines we would own; Ark `Menu` × N with a custom
   bar coordinator is fragile. Radix peers on React 19; every runtime dep is `@radix-ui/*`.
2. **Keep the region toggles at the right of the shelf.** VS Code shows the same controls at the
   top-right of its title bar. The harness's `getByRole('button')` never sees Radix triggers (they are
   `role="menuitem"`), and the menu items are `menuitemcheckbox`, so "Navigation" naming both a
   toolbar button and a menu item in one landmark is deliberate and does not collide.
3. **Menus: File · Edit · View.** View is real (4). File (`New manuscript…`, `Open project…`, `Save`)
   and Edit (`Undo`, `Redo`, `Cut`, `Copy`, `Paste`) are disabled seams with no shortcuts shown: the
   Write milestone owns them. No Help menu yet; listed as a seam.
4. **View, flat like VS Code's Appearance list:** `Navigation ⌃⌘B` · `Context shelf ⌃⌘J` ·
   `Inspector ⌃⌘I` · `Top shelf ⌃⌘T` (checkbox items, checked = expanded) — separator —
   `Theme ▸ System / Light / Dark` (radio; the one submenu) — separator — `Reset layout`.
   **Why ⌃⌘ and not VS Code's ⌘B family (reviewer B):** this is a writing app whose next milestone is
   a ProseMirror editor, where ⌘B is bold and ⌘I italic. Shipping ⌘B for a sidebar and then breaking
   it is worse than diverging now. ⌃⌘ + VS Code's own letters collides with nothing in prose editing,
   nothing Chrome reserves on macOS (⌘1–9, ⌘T/W/N/Q, ⇧⌘N/T, ⌥⌘I/J/C…), nothing macOS reserves
   (⌃⌘F/Q/D/Space), and not VoiceOver's ⌃⌥. Every region gets one, so the "Top shelf has no shortcut"
   hedge is gone. **Headless Chromium has no browser chrome, so the harness proves the bindings reach
   the page, not that Ryan's Chrome lets them through: a one-minute manual check after the build,
   recorded in the report.** The region's name is `REGION_TITLES.top` = "Top shelf" everywhere,
   including this item (never "Menu bar"): `studio-regions.ts` exists to stop a third string.
5. **Theme persists under a new contracts key `themeKey()` → `cs:theme`, through the existing
   store.** The port is a string-keyed blob store that already holds the collapsed bits. It gets a
   named alias `PreferenceStore` (same shape) in a new `preferences.ts` so the layout file's "layout
   only" docblock stays true, and that docblock is amended to point at it. `useTheme` **never writes
   on mount**: read, apply, write only on change. The theme is applied in `main.tsx` before the first
   render, which is the earliest module code — **a first-paint flash of the light background for a
   dark-theme user on a light OS remains possible in the built bundle** (the stylesheet paints before
   any module runs). Accepted; the door is a blocking inline script in `index.html`, deliberately not
   taken now because it would read `localStorage` outside the composition root.
6. **Reset layout = remove this project's layout and collapsed keys, then `location.reload()`.** The
   panel library only reads a stored layout at mount. **Dated constraint (reviewer B): this must
   become a live reset before the editor holds unsaved state**, or it violates *Never lose work*.
   Recorded in friction notes with that trigger. Removes exact keys (`layoutKey` body/center,
   `collapsedKey` × 3); no conditional panel set exists today, so no suffixed layout key can exist —
   stated so the command is revisited if one appears.
7. **The top shelf stays 48px**; the bar centres in it. Slimming to a VS Code-like 36px changes a
   pinned size the harness asserts; a separate decision.
8. **Portability is enforced, not promised.** A new Nx tag `kind:portable` with the constraint
   `{ sourceTag: 'kind:portable', onlyDependOnLibsWithTags: ['kind:portable'] }`: no other project
   carries the tag, so any `@creator-studio/*` import from the package fails lint (constraints are
   ANDed; the studio, `type:app`/`scope:studio`, may still import the package). The eslint rule guards
   imports, not the manifest, so a package spec also reads `package.json` and asserts no
   `@creator-studio/*` in `dependencies`/`peerDependencies`. A `README.md` in the package is the
   extraction procedure and the CSS contract's documentation (see *Portability*).
9. **Styling: a plain-CSS skin with a custom-property contract, no Tailwind in the package.** The
   token lint flags any `var(--x)` not declared in tokens.css and any raw length; a portable skin
   needs both. Resolution, with the lint's own exemption: **one contract block, declared on `:root`**
   (menus render in a body portal and inherit from `body`, so a block on the bar would leave the
   portaled menu unstyled while the lint stays green), turning public properties into file-local
   `--_mb-*` with standalone fallbacks — `--_mb-bg: var(--menubar-bg, Canvas); /* token-ok: … */` —
   one `token-ok` per line with the reason; every other rule uses only `var(--_mb-*)` and passes
   clean (the lint harvests `--_` locals from the whole file before the exemption check). Colour
   fallbacks are CSS system colours (`Canvas`, `CanvasText`, `GrayText`, `Highlight`,
   `HighlightText`, `ButtonBorder`), which follow `color-scheme`; length fallbacks are `em`/`rem`;
   `--_mb-z: var(--menubar-z, 50)` is unitless and needs no exemption; `--_mb-max-h:
   var(--radix-menubar-content-available-height)` lives in the block too. The studio maps the contract
   from tokens on `:root` in `apps/studio/src/styles.css`, which passes rule 1 with no exemption.

## Design

### `packages/menubar` — `@creator-studio/menubar` (`type:ui`, `scope:shared`, `kind:portable`)

Thin compound components over Radix, headless-first: each renders the primitive with a stable
`data-menubar="<part>"` hook and a `className` passthrough; the skin targets the data hooks and
Radix's own `data-state` / `data-highlighted` / `data-disabled`.

```tsx
<Menubar aria-label="Studio menu" value? onValueChange? platform="mac" portalContainer={el?}>
  <Menubar.Menu label={<>View</>}>                 // Menu + Trigger + Portal + Content(align="start", sideOffset, loop)
    <Menubar.CheckItem checked onCheckedChange shortcut={{ key: 'b', ctrl: true, meta: true }}>Navigation</Menubar.CheckItem>
    <Menubar.Separator />
    <Menubar.Sub label="Theme">                     // Sub + SubTrigger(label + chevron) + Portal + SubContent
      <Menubar.RadioGroup value onValueChange>
        <Menubar.RadioItem value="system">System</Menubar.RadioItem>
      </Menubar.RadioGroup>
    </Menubar.Sub>
    <Menubar.Item onSelect disabled shortcut?>Reset layout</Menubar.Item>
    <Menubar.Label>…</Menubar.Label> <Menubar.Group>…</Menubar.Group>
  </Menubar.Menu>
</Menubar>
```

- `Menubar.Menu` owns the four-piece Radix chain so a consumer never assembles it: "click a title,
  the menu displays under it" is the default, not a recipe. `label` is a `ReactNode` (an icon or a
  badge fits; a mnemonic underline is a door). Content gets `data-menubar="content"` plus any
  `data-*` the consumer passes (the studio passes `data-region="top"`, see focus). `value` /
  `onValueChange` pass through to Radix Root so a consumer can close the bar programmatically.
  `portalContainer` and `platform` ride a package-internal context (Radix Root has neither prop).
- Behaviour read from Radix's shipped source (`@radix-ui/react-menubar@1.1.24/dist/index.mjs`): a
  title opens on pointer-down and toggles on Enter/Space (`:162-178`); hovering another title while
  any menu is open switches to it (`:168`); clicking an open title closes it, because the pointer-down
  lands outside the content and dismisses the layer (`:229`); the menu is non-modal (`:120`); on close
  focus returns to the trigger only when the menubar is fully closed and nothing outside was touched
  (`:216-222`); a mouse open does not highlight the first item, a keyboard open does (`:232-233`).
- **Every item reserves an indicator gutter** (`--_mb-indicator-width`), and `CheckItem`/`RadioItem`
  render `Menubar.ItemIndicator` (a ✓ / • glyph, `aria-hidden`) in it, so labels align whether or not
  anything is checked (VS Code's fixed column). Without this the menu would show no visual state at
  all, and nothing in the ARIA assertions would notice (reviewer B).
- **Typeahead:** every item forwards `textValue`, defaulting to its string children. Radix otherwise
  derives it from `textContent`, which would include the indicator and the shortcut and make typeahead
  state-dependent (reviewer A).
- `shortcut` is a descriptor: `{ key: 'b', meta?: true, alt?: true, shift?: true, ctrl?: true }`.
  Items render it right-aligned via `formatShortcut(shortcut, platform)` — mac glyph order ⌃⌥⇧⌘,
  `platform: 'mac' | 'other'` where `'other'` renders `Ctrl+Alt+Shift+Meta+B` — inside
  `aria-hidden`, and set `aria-keyshortcuts` via `serializeShortcut` (`Control+Meta+B`) on the item,
  so the name is read once.
- `useShortcuts(bindings)`: one window `keydown` listener registered once per mount and removed on
  unmount, reading the latest bindings through a ref so a new array identity never double-registers;
  exact modifier match; ignores editable targets (`input`, `textarea`, `contenteditable`) unless a
  binding says `global` — **this guard is load-bearing** for a writing app; `preventDefault()` on a
  match; `when?: () => boolean`. The same descriptor drives display and binding, so they cannot drift.
- Skin (`menubar.css`): the `:root` contract block; bar (`display:flex`, height from the container),
  trigger (padding, `data-state=open` highlight), content and subcontent (`z-index: var(--_mb-z)`,
  `max-height: var(--_mb-max-h)`, `overflow: auto`, border `--_mb-border-width`, radius, shadow from
  contract), item (gutter + label + shortcut columns, `data-highlighted`, `data-disabled`), separator,
  label, indicator, focus ring `--_mb-focus`/`--_mb-focus-ring` on `:focus-visible`.
- Files: `src/index.ts` (barrel: `Menubar`, `useShortcuts`, `formatShortcut`, `serializeShortcut`,
  types `MenubarProps`, `MenubarMenuProps`, `MenubarItemProps`, …, `Shortcut`, `ShortcutBinding`,
  `ShortcutPlatform`), `src/lib/menubar.tsx`, `src/lib/shortcuts.ts`, `src/lib/menubar.css`,
  `src/lib/menubar.spec.tsx`, `src/lib/shortcuts.spec.ts`, `src/lib/package.spec.ts` (manifest),
  `src/lib/menubar.stories.tsx`, `README.md`. `package.json` `exports` adds
  `"./menubar.css": "./src/lib/menubar.css"` (tokens' `./tokens.css` shape).
- Import comment, verbatim beside the Radix import:
  `// Radix, not Ark: Ark UI has no menubar; the bar-level roving focus and hover-switch live here.`

### Portability (what a second consumer does; the README says exactly this)

Copy `packages/menubar/` out (it ships as source: `private`, no build, TSX + one CSS file, like every
package here). `pnpm add @radix-ui/react-menubar` with React 19 peers; a bundler that handles TSX and
a CSS side-effect import; `import '@creator-studio/menubar/menubar.css'`; define the `--menubar-*`
properties on `:root` or accept the system-colour fallbacks. The README carries the contract table
(property · purpose · fallback). Caveat stated there and here: the package's specs run under this
repo's shared Vitest setup (`tools/src/vitest/setup.ts`, a config path, not an import); lifting the
package out means bringing the jsdom stubs with it.

### Studio composition (`apps/studio/src/app/`)

- `studio-commands.ts` — `useStudioCommands()`: one typed record built from `useCockpitRegion` for
  the four regions and `useTheme()`: `{ id, title, run, shortcut?, checked?, disabled? }`. Menus and
  shortcuts both read it. Titles come from `REGION_TITLES`.
- `studio-menus.tsx` — `StudioMenus`: the `<Menubar>` composition of decisions 3–4.
- `studio-toolbar.tsx` — `StudioToolbar` becomes: brand `Studio` · `<StudioMenus />` · spacer · the
  existing `RegionButton`s. Same landmark, same focus class. Calls `useShortcuts` with the commands
  that carry a shortcut.
- `use-theme.ts` — `useTheme(store)`: reads `themeKey()`, applies with `applyTheme` to
  `document.documentElement`, writes only on change. `main.tsx` applies the stored theme once before
  render.
- `studio-cockpit.tsx` — `useFocusHandoff`: "focus was inside the region" also counts
  `document.activeElement.closest('[data-region]')?.dataset.region === id`, because a menu item lives
  in a body portal, not in `#top`. Event order, verified against Radix and FocusScope source by
  reviewer A: `onSelect` runs synchronously with focus on the item → handoff marks pending → the
  collapse and the menu close commit together → the handoff effect focuses `Expand top shelf` →
  FocusScope's deferred unmount-focus finds a detached trigger and Radix prevents its body fallback.
  No `onCloseAutoFocus` override is needed. For View › Navigation the region is `top`, not `nav`,
  so nothing is pending and Radix returns focus to the still-mounted View trigger.
- **The strip-expand focus target changes, deliberately (reviewers A and B):** `useFocusHandoff`
  focuses the returned content's first control, which becomes the menubar's first title, `File`.
  `cockpit.mjs:447` is retargeted from `Top shelf` to `File` in the same wave and the change is
  named in the commit. The assertion count stays 73.
- `styles.css`: `@import '@creator-studio/menubar/menubar.css';` on line 3 (after tokens, before
  `@source` and any rule) and the `:root` bridge: bg → `--cs-surface`, fg → `--cs-ink`, muted →
  `--cs-ink-muted`, border → `--cs-border`, border-width → `--cs-line`, highlight-bg → `--cs-accent`,
  highlight-fg → `--cs-surface`, focus → `--cs-focus`, focus-ring → `--cs-focus-ring`, radius →
  `--cs-radius-sm`, font → `--cs-font-ui`, size → `--cs-text-sm`, pad/gap → `--cs-space-xs/sm/md`,
  motion → `--cs-motion-fast`. `.ladle/preview.css` **adds** the skin import (keeping its tailwind
  and tokens imports) and no bridge, so the package story shows the standalone look by construction;
  the studio story renders unbridged in Ladle (said in the story), and the app screenshot proves the
  bridged skin.

### Contracts

`packages/contracts/src/lib/preferences.ts`: `export type PreferenceStore = LayoutStore;` and
`export function themeKey(): string { return 'cs:theme'; }` with a docblock. `layout-store.ts`'s
"not for other data" docblock gains one line pointing at it. Both exported from `index.ts`; spec.

### Workspace

- Generate (invoke the `nx-generate` skill at build time; flags confirmed against `--help`):
  `pnpm nx g @nx/react:library menubar --directory=packages/menubar --importPath=@creator-studio/menubar --bundler=none --unitTestRunner=vitest --linter=eslint --style=css --component=false --tags=type:ui,scope:shared,kind:portable`.
  Then the friction-note fixes: `lib: ["dom","dom.iterable","es2022"]` in `tsconfig.lib.json`, stories
  excluded from the lib build and included in the spec build, `pnpm nx sync`. Add the `workspace:*`
  line to `apps/studio/package.json` only after the package exists (pnpm 11 kills every nx command
  otherwise).
- Root `eslint.config.mjs`: the `kind:portable` constraint. Package `eslint.config.mjs` mirrors
  `packages/shell`'s.
- Dev deps: `@testing-library/user-event` (14.6; Radix needs pointer events in jsdom).
  `tools/src/vitest/setup.ts` gains guarded stubs for `Element.prototype.scrollIntoView`,
  `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`; a friction note records them.
- Ladle resolves workspace CSS through pnpm's hoisted store
  (`node_modules/.pnpm/node_modules/@creator-studio/*`); wave 1's gate greps the built Ladle CSS for
  `[data-menubar` to prove the skin bundled, per the friction note that a green story build is not a
  rendered story. Tailwind's `@source '../../../packages'` already covers the package; it uses no
  utilities.

### Desktop-only, MacBook 14"

Design viewport **1512 × 982 at `deviceScaleFactor: 2`** (MacBook Pro 14", default scaling).
Recorded in AGENTS.md under *How it's built › App* ("desktop only; laid out for 1512 × 982 @2×;
hover and fine-pointer assumptions allowed; no responsive breakpoints; no mobile"). The menubar
harness runs at that size and scale; the cockpit harness keeps 1440 × 900 because its pixel
expectations derive from it. Menu type is `--cs-text-sm` (0.875rem ≈ 14px; VS Code's is 13px).

## Verification

Unit (`pnpm nx run-many -t typecheck lint test --skip-nx-cache`):
- package: roles (`menubar`, `menu`, `menuitem`, `menuitemcheckbox`, `menuitemradio`); a trigger
  click opens; Escape closes and focus returns to the trigger; a disabled item is not selectable;
  `Sub` opens a nested `menu`; `Label` and `Group` render their roles; `ItemIndicator` appears only
  when checked; `textValue` defaults to the label; `formatShortcut`/`serializeShortcut` table
  (`⌃⌘B` / `Control+Meta+B`, `⇧⌘Z` / `Shift+Meta+Z`, `'other'` → `Ctrl+Meta+B`);
  `useShortcuts`: runs on a match and prevents default, ignores a textarea target, ignores a wrong
  modifier set, `when: () => false` blocks, **unmount removes the listener, a new bindings identity
  does not double-fire**; `package.spec.ts`: no `@creator-studio/*` in the manifest's dependencies.
- studio: the top shelf holds a menubar with File/Edit/View and the four pressed buttons (extend
  `app.spec.tsx`; note its separator-count assertion holds only while menus are closed); View's
  checkbox items mirror region state; Theme › Dark stamps `data-theme`; commands spec (shortcuts
  unique, `checked` mirrors `!collapsed`, titles equal `REGION_TITLES`); contracts `themeKey` spec.
- token lint clean: only the contract block carries `token-ok`, each with a reason.

Browser — new `tools/src/verify/menubar.mjs` at 1512 × 982 @2×, dev and `--preview`. Runner design
(reviewer A): `tools/src/verify/lib.mjs` owns a memoized `ensurePreview()` that spawns `vite preview`
once per process and kills the process group, `createHarness({ viewport, deviceScaleFactor })`
returning `{ page, ok, sleep, errors, report() }` where `report()` returns the fail count instead of
exiting; each harness exports `run(harness)` with a CLI shim guarded by
`import.meta.url === pathToFileURL(process.argv[1]).href`; `all.mjs` runs both under one browser and
exits once. `cockpit.mjs` is converted to that shape with its 73 assertions unchanged except `:447`
(above) and the key allowlist (`:490`) widened to accept `cs:theme`. `verify:ui` becomes
`node tools/src/verify/all.mjs` because pnpm appends `--preview` only to the last command of a `&&`
chain. Assertions, none of which can pass with the feature absent:
1. `#top` contains a `menubar` with triggers File, Edit, View; no console or page errors.
2. Click View → a `menu` is visible, its box sits below the trigger and inside the viewport, it is
   *not* inside `#top` (portaled), **`document.elementFromPoint` at the centre of its last item
   resolves to that item** (not clipped), and **the content's computed `background-color` is not
   transparent** (the `:root` contract reached the portal).
3. Hover File while View is open → File open, View closed. Click File's title again → closed.
   Escape → closed, focus on File's trigger. Click the manuscript → closed. ArrowLeft from File →
   View (loop). Tab from a focused trigger paints a focus ring (outline probe, as `cockpit.mjs:420`).
4. View › Navigation shows a non-empty indicator while checked; select it → nav is a 48px rail, the
   toolbar button reports `aria-pressed=false`, the reopened item is unchecked with an empty
   indicator; select again → open. ⌃⌘B, ⌃⌘J, ⌃⌘I, ⌃⌘T toggle nav, context shelf, inspector, top
   shelf (and back; ⌃⌘T back via the strip's control). The Navigation item carries
   `aria-keyshortcuts="Control+Meta+B"` and shows `⌃⌘B`.
5. Keyboard: from File's trigger ArrowRight ×2 → View; ArrowDown opens with the first item
   highlighted; with Inspector *checked*, typeahead `i` highlights Inspector; Enter runs it.
6. File › New manuscript… is `data-disabled`; clicking it leaves the menu open (`data-state=open`)
   and no region moved.
7. View › Theme › Dark → `html[data-theme="dark"]`, survives a reload; System removes the attribute;
   Escape inside the Theme submenu closes only the submenu and focuses its trigger. (No assertion can
   see a first-paint flash; decision 5 says so.)
8. View › Top shelf → the shelf is the 32px strip and focus is on `Expand top shelf`; click it → the
   menubar is back and focus is on `File`.
9. Drag the nav wider, View › Reset layout → after the reload the nav is at its default share and no
   `cs:layout:`/`cs:collapsed:` key remains for the project.
10. Geometry at 1512: the three triggers share a `y`, the leftmost trigger starts after the brand, the
    rightmost toggle ends inside the viewport (a squashed flex row cannot pass); screenshot
    `screenshots/menubar-1512-view-open.png` with Navigation checked (untracked proof, headless).

Gate: `pnpm verify` exit 0 end to end (typecheck · lint · lint:tokens · test · stories:build · build ·
both harnesses on the built bundle). Stories screenshotted from `ladle preview` headlessly
(`BROWSER=none`), PNG paths in the report. Nothing opens on Ryan's screen. After the build, one
manual check by Ryan: the four ⌃⌘ bindings in his own Chrome.

## Build order (one implementer, review after each wave)

1. Package skeleton + `:root` contract block + skin + `Menubar` compound (indicator gutter, textValue,
   platform/portal context, controlled value) + shortcuts helpers + specs (incl. lifecycle and
   manifest) + stories (a standalone story, a matrix story rendering every part with one item
   checked, a dark story via `color-scheme`) + README; `kind:portable` tag and constraint; jsdom
   stubs; `user-event`. Gate green with the package unused; built Ladle CSS contains `[data-menubar`.
2. Contracts `preferences.ts`; studio commands, menus, toolbar, theme hook, focus-handoff tweak,
   bridge CSS, `main.tsx` theme apply; `app.spec` updates; `cockpit.mjs:447` retarget and `:490`
   allowlist. Gate green; cockpit harness re-read, not just re-run, still 73.
3. `lib.mjs` extraction + `cockpit.mjs` conversion to `run()` + `menubar.mjs` + `all.mjs`; AGENTS.md
   (Stage, App viewport, Primitives exception, Where things live, the portable-package convention:
   tag + contract block + README); friction notes (portal because panels clip; jsdom stubs; pnpm args
   to chained scripts; reset-by-reload's dated constraint; the ⌃⌘ scheme and why).
4. Two-reviewer gate on the code (divergent briefs), fixes, re-review of diffs; disposition under
   `references/reviews/2026-09-04-menubar/`, with this plan's review copied in as `plan-review.md`.

## Out of scope (seams, named so they are not blanks)

Help menu · File/Edit behaviour (Write milestone) · a command palette · mnemonics / Alt-to-focus /
`Menubar.Trigger` override slot · submenu hover-open delay and Tab-out-closes assertions (Radix
defaults, unasserted) · a live layout reset without reload (dated, see decision 6) · a pre-paint
theme script (decision 5) · a `PreferenceStore` adapter of its own · slimming the shelf to 36px ·
mobile or narrow layouts of any kind.

## Plan review (recorded before approval)

Two headless opus reviewers (`command claude -p … --model opus`, read-only tools), briefed
divergently: **A** hunted what is wrong or unbuildable against the real code and the Radix source;
**B** hunted what is missing in product, accessibility, portability and verification terms. Both
reports are in this session's scratchpad and are copied to
`references/reviews/2026-09-04-menubar/plan-review.md` in wave 3. Citations spot-checked by the
session: `cockpit.mjs:447` (focus label), `:484-491` (key allowlist), the hoisted-store resolution.

| # | Finding | Disposition |
|---|---|---|
| A-M1 / B-1 | **Material.** `cockpit.mjs:447` expects strip-expand to focus `Top shelf`; the first `<button>` in `#top` becomes the File trigger, so "still 73 green" was false. | **Fixed in plan.** First-control rule kept; `:447` retargeted to `File`, named as a deliberate harness edit; count unchanged. |
| A-M2 | **Material.** `cs:theme` fails the harness key allowlist (`:486-491`) if `useTheme` writes on mount. | **Fixed.** No write on mount, and the allowlist widened; both. |
| A-M3 | **Material.** `all.mjs` importing harnesses that `process.exit` and each spawn `vite preview --strictPort 5181` cannot work. | **Fixed.** Runner design rewritten: `lib.mjs` owns one preview and reporting, harnesses export `run()`, `all.mjs` exits once. |
| A-M4 / B-8 | **Material.** The `--_mb-*` contract block's selector was unstated; on the bar it would not reach the portaled menu, and the lint would stay green. | **Fixed.** Declared on `:root`; harness asserts a computed colour on the open content. |
| A-M5 | **Material.** Typeahead derives from `textContent`, so a checked indicator or shortcut breaks it. | **Fixed.** `textValue` forwarded, defaulting to the label; harness types `i` with Inspector checked. |
| A-M6 | **Material.** No z-index; a focused separator (`z-10`) would paint over the menu. | **Fixed.** `--_mb-z` (default 50) on content and subcontent. |
| B-2 | **Material.** No checkmark rendered anywhere; every assertion passed on ARIA state alone. | **Fixed.** `ItemIndicator` + reserved gutter on every item; indicator asserted checked/unchecked; screenshot with one item checked. |
| B-3 | **Material.** ⌘B is bold in a writing app; the plan shipped a shortcut it would have to break. | **Fixed.** ⌃⌘ + VS Code's letters for all four regions; rationale and the manual browser check recorded. |
| B-4 | **Material.** "No flash" was not delivered by a deferred module script. | **Corrected.** Claim dropped; the residual flash and its door are stated. |
| B-5 | **Material.** Portability had no exit procedure, no contract documentation, no manifest guard. | **Fixed.** README with extraction steps and the contract table; `package.spec.ts` manifest check; the shared-setup caveat stated. |
| A-m8 / B-6 | **Material (B) / Minor (A).** "Menu bar" vs "Top shelf" vs "Expand top shelf". | **Fixed.** `REGION_TITLES.top` everywhere; ⌃⌘T named for the shelf. |
| B-7 | **Material.** §2, §6, §10 could pass vacuously. | **Fixed.** `elementFromPoint`, menu-stays-open, and geometry assertions replace them. |
| B-9 | **Material.** `useShortcuts` lifecycle untested; `Sub`/`Label`/`Group` untested. | **Fixed.** Lifecycle specs and per-part specs added to the unit list. |
| B-10 | **Material.** Reset-by-reload will violate *Never lose work* once the editor holds state. | **Recorded** as a dated constraint in decision 6 and the friction notes. |
| A-m1 | `@import` must precede rules in `styles.css`. | Fixed: line 3. |
| A-m2 / B-20 | "preview.css imports the skin only" read as destructive; resolution path assumed. | Fixed: "adds"; hoisted-store resolution verified; wave 1 greps the built CSS. |
| A-m3 / B-13 | `portalContainer` is not a Radix Root prop; no controlled state. | Fixed: package context; `value`/`onValueChange` pass through. |
| A-m4 | `themeKey` contradicts the layout docblock. | Fixed: `preferences.ts` with `PreferenceStore` alias; docblock amended. |
| A-m5 | `setPointerCapture` missing from the jsdom stubs. | Fixed. |
| A-m6 | Reset removes exact keys; suffixed layout keys are possible in principle. | Fixed: dependency on "no conditional panel set" stated. |
| A-m7 | The harness cannot prove browser-level shortcut availability. | Fixed: manual check by Ryan named in the gate. |
| A-m9 | Bridge lacked border and focus-ring widths. | Fixed: `--cs-line`, `--cs-focus-ring`. |
| A-m10 | "The spec imports only the package" overstated portability. | Fixed: caveat in *Portability*. |
| B-11 | `formatShortcut` mac-only with no seam. | Fixed: `platform` parameter and `<Menubar platform>` context. |
| B-12 | `label: string` is configuration. | Fixed: `ReactNode`; the Trigger override slot stays a door. |
| B-14 | Click-open-closes and submenu-Escape unasserted. | Fixed: added to §3 and §7; delay and Tab-out deferred explicitly. |
| B-15 | No focus-ring probe on the bar. | Fixed: §3. |
| B-16 | One story file for eight parts under-specified. | Fixed: standalone, matrix, dark stories named. |
| B-17 | `app.spec` separator count fragile once a menu opens in a spec. | Noted in the unit list. |
| B-18 | DPR unstated. | Fixed: `deviceScaleFactor: 2`, recorded in *Desktop-only*. |
| B-19 | Too-tall menus unhandled. | Fixed: `max-height` from Radix's available-height var + scroll, in the skin. |
| B-21 | Duplicate accessible names deliberate but unstated. | Fixed: decision 2. |

Accepted risks, on the record: the first-paint theme flash (B-4); reset-by-reload until the editor
lands (B-10); browser-level availability of ⌃⌘B/J/I/T proven manually, not by the harness (A-m7).

Clean passes A and B named: every Radix part and prop used exists in 1.1.24 (`Content` `align`
default `start`; `SubContent` drops `side`/`onCloseAutoFocus` by design); the body portal is required
(`cockpit.tsx:231`); the `token-ok` contract block and the `:root` bridge pass the lint for the
reasons given (thirteen bridge tokens resolved by A against `tokens.css`); the `kind:portable`
constraint blocks workspace imports and does not block the studio; the focus handoff event order;
pnpm's argument appending; `themeKey` on the blob store is structurally sound; all cited friction
notes respected.
