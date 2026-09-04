# Plan review — top shelf → menu bar (2026-09-04)

Two headless opus reviewers read the plan at `~/.claude/plans/tidy-gathering-hickey.md` before approval, read-only,
briefed divergently. Dispositions live in the plan's last section (copied into `disposition.md` here once the build
is reviewed). Reports verbatim below.

---

# Reviewer A — correctness / buildability

Six material findings, ten minor. Two of them break assertions the plan explicitly promises will stay green.

---

# Reviewer A — adversarial review of `tidy-gathering-hickey.md`

**Verdict: buildable, but three claims in it are false against the real code and two design blanks would produce silently-broken output.**

## What I checked

- **Radix menubar API** — `https://unpkg.com/@radix-ui/react-menubar@latest/dist/index.d.ts` (109 lines, v1.1.24) and `.../dist/index.mjs`; `https://unpkg.com/@radix-ui/react-menu@latest/dist/index.d.ts` + `.mjs`; `https://unpkg.com/@radix-ui/react-focus-scope@latest/dist/index.mjs`; npm registry for published versions/peers.
- **Panel clipping** — `packages/shell/src/lib/cockpit.tsx:231` (panel className), `:293` (separator `focus-visible:z-10`).
- **Token lint** — `tools/src/lint/check-tokens.mjs:85,103,105-108,111-124`, walked rule by rule; resolved every `--cs-*` the plan's bridge names against `packages/tokens/src/tokens.css` using the lint's own `@theme`-stripping (`:63-65`).
- **Nx boundaries** — `eslint.config.mjs:18-69`; tags on all five projects from their `package.json` `nx.tags`.
- **Focus** — `apps/studio/src/app/studio-cockpit.tsx:163,173-207`; `studio-toolbar.tsx:12-21`; `studio-rails.tsx:21`; `studio-regions.ts:9-14`.
- **Harness** — `tools/src/verify/cockpit.mjs:23-51,63-101,413-455,484-496`; `package.json:5-16`.
- **Contracts** — `packages/contracts/src/lib/layout-store.ts:1-42`, `src/index.ts:1`.
- **Also** — `packages/tokens/src/lib/theme.ts`, `apps/studio/src/{main.tsx,styles.css,app/app.tsx}`, `.ladle/{config.mjs,preview.css,components.tsx,vite.config.mts}`, `tools/src/vitest/setup.ts`, `packages/shell/vite.config.mts:12`, `AGENTS.md`, `references/friction-notes.md`.

---

## Findings

### M1 — Material. "Cockpit harness still 73" is false; `cockpit.mjs:447` will fail.

Plan line 218: *"Gate green; cockpit harness still 73."* Plan line 123 puts `<StudioMenus />` **before** the `RegionButton`s.

`useFocusHandoff` focuses `#top`'s *first* match of `FOCUSABLE` (`studio-cockpit.tsx:163,192`), which begins `'button, …'`. Radix's `MenubarTrigger` renders `Primitive.button` with `type="button" role="menuitem"` (`mb.mjs:148-152`) — a real `<button>`, so the CSS selector matches it. First focusable in `#top` becomes **File**.

`cockpit.mjs:447` asserts `focusedLabel() === 'Top shelf'`, and `focusedLabel` (`:97`) falls back to `textContent` → `'File'`.

**Fix:** in wave 2, change `cockpit.mjs:447` to expect the menubar's first trigger and say so in the plan — or give the region toggles a `data-region-toggle` attribute and have `useFocusHandoff` prefer it before falling back to `FOCUSABLE`. Recommend the latter: it keeps "expanding a region returns you to that region's control" true regardless of what else lands in the shelf later.

Verified *not* broken: `cockpit.mjs:413` (`#top button` `.last()` → Tab → `Resize navigation`) survives, because the triggers sit before the RegionButtons. `cockpit.mjs:195,204,208,385,403,441,451` use exact accessible names that the menubar does not duplicate, and Radix triggers are `role="menuitem"` so `getByRole('button')` never sees them.

### M2 — Material. `cs:theme` trips the cockpit harness's key allowlist.

`cockpit.mjs:486-491` asserts every localStorage key is `cs:collapsed:default:*` or one of `root`/`body`/`center` layout keys. `cs:theme` (plan decision 5) matches neither. Whether it fires depends entirely on whether `useTheme` writes on mount — plan line 127 says *"reads `themeKey()`, applies with `applyTheme` …, writes on change"*, which is ambiguous about the mount write.

**Fix:** state in the plan that `useTheme` never writes on mount (read-then-apply only), **and** widen `cockpit.mjs:490` to tolerate `k === 'cs:theme'`. Do both — relying on the first alone makes a future refactor break an unrelated harness.

### M3 — Material. `all.mjs` as described cannot work: `process.exit` and a hard-coded `--strictPort 5181`.

Plan lines 185-189. Two blockers in the file being extracted from:

- `cockpit.mjs:496` calls `process.exit(fail ? 1 : 0)`, and `:33,46,109` exit too. `all.mjs` **importing** both harnesses dies after the first.
- `cockpit.mjs:35` spawns `pnpm exec vite preview --port 5181 --strictPort`; `:51` does `preview?.kill()`, which signals the **pnpm wrapper**, not necessarily the vite child. Two harnesses as sequential child processes race an orphaned vite still holding 5181, and `--strictPort` makes that fatal rather than a fallback.

**Fix:** `lib.mjs` owns (a) a memoized `ensurePreview()` that spawns once per process and kills the process *group*, and (b) an `ok`/`report()` that returns a fail count. Each harness becomes `export async function run(ctx)` with the CLI shim guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`; `all.mjs` awaits both and exits once. The plan must say this — "extracted to `lib.mjs` … unchanged in behaviour" reads as a pure move and is not one.

Verified correct: the plan's *reason* for `all.mjs` holds. pnpm appends extra args to the end of the resolved script string, so `"node a.mjs && node b.mjs"` invoked as `pnpm verify:ui --preview` yields `node a.mjs && node b.mjs --preview` — only the last command sees it. `package.json:14` already relies on that shape.

### M4 — Material. Decision 9 never names the selector the `--_mb-*` contract block sits on.

Plan line 64: *"one contract block at the top of `menubar.css` declares element-scoped locals."* The plan spotted the portal problem for the **public** `--menubar-*` bridge (line 71) but not for its own locals. Radix portals Content to `document.body`; if the block sits on the Root (`[data-menubar]`), the portaled `[data-menubar="content"]` and `[data-menubar="subcontent"]` inherit no `--_mb-*` and render with every property invalid. **The token lint passes either way**, so nothing catches it before the screenshot.

**Fix:** state the selector explicitly — `:root { --_mb-…: var(--menubar-…, …); }`, or a selector list covering every portaled part. Add a harness assertion that reads `getComputedStyle` of the open menu's background and asserts it is not `rgba(0, 0, 0, 0)`.

### M5 — Material. Typeahead (harness §5) breaks on checked items.

Radix derives an item's typeahead string from the DOM: `textValue: textValue ?? textContent` where `textContent = (menuItem.textContent ?? '').trim()` (`menu.mjs:434,442`). The plan renders the shortcut inside the item (line 102-103), and CheckboxItems get an indicator. A leading check glyph makes the string `"✓Navigation⌘B"` — first-letter typeahead becomes **state-dependent**, and `i` for Inspector stops working the moment Inspector is checked.

**Fix:** `Menubar.Item` / `CheckItem` / `RadioItem` forward `textValue`, defaulted to the string children. Harness §5 should type `i` with Inspector checked, not unchecked.

### M6 — Material. No z-index anywhere in the plan.

Radix ships no z-index; it is the consumer's job. `cockpit.tsx:293` puts `focus-visible:z-10` on separators. A focused separator paints above an `auto`-z fixed portal that overlaps it.

**Fix:** `--_mb-z: var(--menubar-z, 50)` in the contract block, applied to content and subcontent. A bare integer passes the token lint — `LENGTH` (`check-tokens.mjs:69`) requires a unit suffix.

### m1 — Minor. `@import` placement in `apps/studio/src/styles.css`.

CSS requires `@import` before any other rule. `styles.css:6-16` already has `html, body` rules. **Fix:** the menubar import goes on line 3, after the tokens import and before `@source`.

### m2 — Minor. "`.ladle/preview.css` imports the skin only" is a destructive instruction as written.

`.ladle/preview.css:1-2` already imports `tailwindcss` and `@creator-studio/tokens/tokens.css`, which every existing story depends on. **Fix:** rephrase to "*adds* the skin and no `--menubar-*` bridge, so the package story falls through to the system-colour defaults."

### m3 — Minor. `portalContainer` needs a package-internal context.

`MenubarProps` (mb.d.ts) is `PrimitiveDivProps + value/defaultValue/onValueChange/loop/dir` — there is no `portalContainer`. The plan's snippet puts it on `<Menubar>` while the Portal lives inside `Menubar.Menu`. **Fix:** say the package carries its own React context for it.

### m4 — Minor. `themeKey` contradicts `layout-store.ts`'s own docblock.

`layout-store.ts:8-13`: *"Deliberately narrow… Layout is opaque UI state, not domain data; manuscript and cast data will get their own typed ports rather than reuse this one."* **Fix:** either put `themeKey` in `preference-store.ts` re-exporting the structural type, or amend that docblock in the same edit. Reusing the store is fine; leaving the file claiming otherwise is not.

### m5 — Minor. jsdom stub list is incomplete.

Plan line 158 lists `scrollIntoView`, `hasPointerCapture`, `releasePointerCapture`. **Add `Element.prototype.setPointerCapture`** — user-event's pointer sequences call all three.

### m6 — Minor. Reset removes exact keys; §9 asserts a prefix sweep.

`layoutKey` can carry appended panel ids (`layout-store.ts:22-31`) and `cockpit.mjs:490` already tolerates them. No conditional panel set exists today, so the exact removes suffice — **state that dependency**, or enumerate by prefix so the command stays true when one appears.

### m7 — Minor. Harness §4 cannot prove the ⌥⌘B claim.

Headless Chromium has no browser-level chrome shortcuts, so §4 passing says nothing about Ryan's Chrome, where ⌥⌘B is Bookmark Manager. **Fix:** drop the parenthetical from decision 4 or mark it a manual check.

### m8 — Minor. Three names for one region.

Decision 4 says `Menu bar`; `REGION_TITLES.top` is `'Top shelf'` (`studio-regions.ts:10`); the strip control is `Expand top shelf` (`studio-rails.tsx:21`, lowercased). Harness §8 mixes two of them. **Fix:** pick one, or state the mapping in the plan.

### m9 — Minor. Bridge omits border-width and focus-ring width.

Plan lines 137-139 map colour, radius, font, size, spacing, motion — no lengths for the menu border or focus ring. `--cs-line` and `--cs-focus-ring` exist and are the mappings.

### m10 — Minor. The portability claim needs a caveat.

Plan line 179: *"The package spec imports only the package (a portability check that runs)."* The spec still depends on `tools/src/vitest/setup.ts` via `setupFiles` (precedent `packages/shell/vite.config.mts:12`). It's a config path, not an import, so Nx boundaries stay clean — but "lift it out and the spec runs" is not true.

---

## Clean passes — what I specifically verified

**Radix API (decision 1, design §1).** Every part and prop the plan names exists in 1.1.24. `Root` `loop` ✓ (`MenubarProps`), `Portal` `container` ✓ (`MenuPortalProps`), `Content` `align`/`sideOffset`/`loop`/`onCloseAutoFocus` ✓ (`MenubarContentProps = Omit<MenuContentProps,'onEntryFocus'>`; `sideOffset` via `PopperContentProps`), `CheckboxItem` `checked`/`onCheckedChange` ✓, `RadioGroup` `value`/`onValueChange` ✓, `RadioItem` `value` ✓, `Sub`/`SubTrigger`/`SubContent` ✓ (note `SubContent` drops `side` and `onCloseAutoFocus` by design). Root renders `role="menubar"` (`mb.mjs:82`). Hover-switch is built in (`mb.mjs:168-174`, `onPointerEnter` opens when another menu is open). 1.1.24 is published; peers `react ^19`; every runtime dep is `@radix-ui/*`. `MenubarMenu` has no `label` prop — the plan's is its own wrapper API, which is consistent with "owns the four-piece chain."

**Panel clipping (check 2).** `cockpit.tsx:231` gives every panel `overflow-hidden`, and `#top` is 48px. A body portal is genuinely required, not a preference.

**Token lint (check 3).** Both halves pass, for the reasons the plan gives. The contract block works because `locals` is harvested from the whole file at `check-tokens.mjs:85` *before* the `token-ok` skip at `:103`, so `var(--_mb-*)` resolves on every subsequent line while the `var(--menubar-*, Canvas)` declarations and their system-colour fallbacks sit on skipped lines. The `:root` bridge passes rule 1 with no exemption: I resolved all thirteen tokens it names — `--cs-surface`, `--cs-ink`, `--cs-ink-muted`, `--cs-border`, `--cs-accent`, `--cs-focus`, `--cs-radius-sm`, `--cs-font-ui`, `--cs-text-sm`, `--cs-space-xs/sm/md`, `--cs-motion-fast` — against `tokens.css` cascade declarations, `@theme` blocks stripped exactly as `:63` does. The lint never inspects the left-hand side of a declaration, so `--menubar-bg:` itself is unchecked.

**Nx boundaries (check 4).** The constraint does what decision 8 claims and breaks nothing. menubar as source carries `kind:portable`; constraints are ANDed, so an `@creator-studio/contracts` import satisfies `type:ui` and `scope:shared` but fails `kind:portable` → lint error. It does **not** block the studio: `apps/studio` is `type:app` + `scope:studio` only, so the `kind:portable` constraint never applies to it as a source, and `type:app → type:ui` (`eslint.config.mjs:26-33`) plus `scope:studio → ['*']` (`:62`) both permit the import. `scope:shared` interplay is inert — the package imports no workspace project by design. External npm imports (`react`, `@radix-ui/react-menubar`) are unaffected: `onlyDependOnLibsWithTags` governs workspace projects, and no `bannedExternalImports`/`allowedExternalImports` is configured.

**Focus event order (check 5).** The `closest('[data-region]')` extension is sufficient, and the plan's hedge about `onCloseAutoFocus` is unnecessary — drop it. Exact order for View › Menu bar:

1. Radix dispatches `menu.itemSelect`; your `onSelect` runs **synchronously**, with `document.activeElement` still the menu item in the body portal.
2. `noting()` (`studio-cockpit.tsx:177-183`) evaluates `#top.contains(activeElement)` → **false** today; with `data-region="top"` on Content and the `closest` check → **true**. `pending.current = true`.
3. `topToggle.collapse()` returns true; React schedules the update.
4. Radix sees `defaultPrevented === false` → `onClose()` → menubar value `''`. Same batch.
5. One commit: `#top` swaps to `<Strip>` (toolbar, menubar and File/Edit/View triggers unmount) **and** MenuContent unmounts.
6. Passive effects flush. FocusScope's cleanup only *schedules* `setTimeout(…, 0)` (`focus-scope/dist/index.mjs:94`) — it focuses nothing yet.
7. In that same flush, `useFocusHandoff`'s effect (`studio-cockpit.tsx:187-204`, dep `toggle.collapsed`) focuses `Expand top shelf`. ✓
8. Next macrotask: the timer dispatches `AUTOFOCUS_ON_UNMOUNT`. `MenubarContent`'s handler (`mb.mjs:216-222`) reads `menuContext.triggerRef.current` — **null**, React detached it at step 5 — so its `.focus()` is a no-op, and `event.preventDefault()` at `:222` runs unconditionally, suppressing FocusScope's `focus(previouslyFocusedElement ?? document.body)` fallback at `:99`.

Focus stays on `Expand top shelf`. The same mechanism correctly does *nothing* for View › Navigation: `closest('[data-region]')` yields `'top'`, not `'nav'`, so `pending` stays false and Radix returns focus to the still-mounted View trigger — which is the behaviour you want.

**pnpm `--preview` (check 6, first half).** Verified against `package.json:14`; the plan's reasoning is correct and `all.mjs` is the right shape. Only its implementation is underspecified (M3).

**`themeKey` on `LayoutStore` (check 7).** Structurally sound — the port is a string-keyed blob store (`layout-store.ts:14-19`) and `createBrowserLayoutStore` satisfies it. The only issues are the docblock contradiction (m4) and the harness allowlist (M2), not the design.

---

# Reviewer B — gaps / parity / accessibility / portability

# Reviewer B — plan review: `tidy-gathering-hickey.md`

## WHAT I CHECKED

- **Plan, end to end** — decisions 1–9, Design, Studio composition, Contracts, Workspace, Desktop-only, Verification §§1–10, Build order, Out of scope (`tidy-gathering-hickey.md:1-235`).
- **AGENTS.md conventions the plan must satisfy** — Primitives (`AGENTS.md:69-70`), Styling/token rule (`:71-74`), "every index export has a test; every component export a story" (`:91-92`), Composition over configuration / Headless first (`:108-111`), headless-only browser verification (`:95-106`), core experiences *Write* and *Switch appearance* (`:23,26`), *Never lose work* (`:25`).
- **Token lint mechanics against decision 9** — `token-ok` line exemption (`tools/src/lint/check-tokens.mjs:103`), file-local `--_*` allowance (`:85,107`), LENGTH/COLOR rules (`:67-71,111-122`). Decision 9's exemption mechanism does work as described: a `token-ok` line is skipped whole, and `--_mb-*` matches the locals regex.
- **The 73-assertion cockpit harness** the plan promises to leave intact — `button()` helper (`cockpit.mjs:96`), `focusedLabel()` (`:97`), §5b `Top shelf` button count (`:221`), §8 Tab-from-toolbar (`:416-418`), §8c focus handoff (`:441-449`), final key sweep (`:tail`).
- **`useFocusHandoff`** — region containment test and first-focusable pick (`studio-cockpit.tsx:179,192`), and `FOCUSABLE` (`:163`).
- **Naming invariant** the plan touches — `REGION_TITLES` and its "cannot drift" comment (`studio-regions.ts:5-14`), toolbar composition (`studio-toolbar.tsx:12-21`).
- **App spec** the plan extends (`app.spec.tsx:14-35`), studio story that renders the toolbar (`studio-cockpit.stories.tsx:16-27`).
- **Portability surface** — `packages/shell/package.json` and `packages/tokens/package.json` (`private: true`, `main: ./src/index.ts`, no build), root `package.json` scripts, `.ladle/preview.css:1-4`, `.ladle/vite.config.mts`.
- **Theme path** — `applyTheme`/`parseTheme` (`packages/tokens/src/lib/theme.ts:17-25`), `color-scheme` declarations (`tokens.css:77,89,102`), and `apps/studio/index.html:13` (`<script type="module">`).
- **Friction notes** for footguns the plan must respect (`references/friction-notes.md:5-13,38-43,73-82`) — the plan cites all of them correctly.

Confirmed sound, so I am not filing findings on them: the `token-ok` contract-block trick, the `kind:portable` boundary tag as a *workspace-import* guard, the `aria-keyshortcuts="Meta+B"` value, keeping the region toggles (harness §5b/§7 depend on `Top shelf`, `Navigation` etc. as *buttons* — the menu items' `menuitemcheckbox` role does not collide), and the pnpm-11 `workspace:*` ordering in Workspace.

---

## FINDINGS

### 1 — MATERIAL · The cockpit harness will not stay 73 green; §8c breaks on the first focusable

`useFocusHandoff` focuses `panel.querySelector(FOCUSABLE)` — the first `<button>` in `#top` (`studio-cockpit.tsx:192`, `:163`). Today that is the `Top shelf` toggle, and `cockpit.mjs:447` asserts exactly that: `expanding from the strip moves focus into the returned toolbar` → `focusedLabel() === 'Top shelf'`. The plan puts menus **left of** the toggles (`studio-toolbar.tsx` rewrite, plan line 123), so the first `<button>` becomes the `File` trigger and `focusedLabel()` returns `File`. Radix's roving tabindex does not save you: `FOCUSABLE` matches `button` unconditionally.

The plan asserts the opposite twice ("the 73-assertion cockpit harness stays valid", line 23; "cockpit harness still 73", line 219).

**Fix:** decide and state it — either `useFocusHandoff` targets the region's *named* control (`#top [aria-label="Top shelf"], #top button`) and `cockpit.mjs:447` keeps its expectation, or the assertion is retargeted to `File` in the same wave and the change is recorded as a deliberate harness edit, not a silent one. Add to wave 2's gate: "cockpit harness re-read, not just re-run."

### 2 — MATERIAL · No checkmark. Nothing in the plan renders one, and nothing would catch its absence

The compound API (lines 82–95) has no `ItemIndicator` part, and the skin section names no check glyph and no reserved left gutter. VS Code's menus align every label against a fixed indicator column so checked and unchecked items don't jitter. Every listed assertion passes with zero visual feedback: §4 checks `aria-pressed` on the *toolbar button* and "the item reads unchecked on reopen" (an ARIA state), and the unit list checks roles only. **This is the assertion set's worst vacuous pass** — a writer would see a menu where nothing indicates what's on.

**Fix:** add `Menubar.ItemIndicator` (or render it inside `CheckItem`/`RadioItem` unconditionally), reserve a `--_mb-indicator-width` gutter on every item including plain `Item`, and assert in the harness that the Navigation item's indicator is non-empty when checked and empty when not — plus a screenshot with one item checked.

### 3 — MATERIAL · ⌘B is bold. This is a writing app

`Navigation ⌘B` is VS Code's binding, and the plan's justification is that vscode.dev intercepts it (decision 4). But AGENTS.md's next milestone is *Write* — a ProseMirror manuscript editor (`AGENTS.md:23,43,68`) — where ⌘B is bold to every writer alive. `useShortcuts` ignoring editable targets means that the moment the editor lands, the menu will display `⌘B` beside Navigation while ⌘B does nothing of the sort in the surface the user spends all day in.

The plan never names the collision. It is the single most user-visible product defect here.

**Fix:** state the collision and its resolution in the plan and in AGENTS.md. Either (a) accept it and record that the editable-target guard is load-bearing, non-negotiable, and that the menu must eventually show the shortcut as unavailable while the editor has focus, or (b) recommended — bind the regions to `⌥⌘1/2/3` or `⌘1/2/3` now, which collides with nothing in a prose app and costs one line of the descriptor table. Do not ship a shortcut you plan to break.

### 4 — MATERIAL · The "no flash" claim is not delivered

Decision 5 says the theme is "applied synchronously in the composition root before first render, so no light-then-dark flash." `apps/studio/index.html:13` loads `/src/main.tsx` as `<script type="module">`, which is deferred to after HTML parse. In the built bundle the stylesheet is a `<link>` in `<head>`, so the browser paints the default light background (`tokens.css:77`) before any module runs. A user with `cs:theme=dark` on a light OS gets exactly the flash the plan promises to avoid.

**Fix:** either drop the claim, or add a small blocking inline `<script>` in `index.html` that reads `cs:theme` and stamps `data-theme` before first paint — and record it as a *deliberate second place localStorage is touched*, which cuts against AGENTS.md:51-54's "only `apps/studio` wires an adapter to a port" (index.html isn't the composition root). Also: verification §7 asserts the attribute survives a reload but never asserts the absence of a flash; no assertion here can, so say so rather than implying coverage.

### 5 — MATERIAL · The portability promise has no exit procedure

`kind:portable` proves the package doesn't *import* workspace code. It does not make the package usable outside. Following `packages/shell`/`packages/tokens`, the package will be `private: true`, `main: "./src/index.ts"`, bundler none — raw TSX and untranspiled CSS. A second consumer cannot install it, and the plan never says what they'd actually do.

**Fix:** add a short *Extraction* subsection and a package `README.md` stating: copy `packages/menubar/` out; `pnpm add @radix-ui/react-menubar` with React 19 peers; the consumer's bundler must handle TSX and a CSS side-effect import; `import '@creator-studio/menubar/menubar.css'`; define the `--menubar-*` properties on `:root` or accept the CSS system-colour fallbacks. The README *is* the CSS contract's documentation — right now the contract exists only inside `menubar.css` comments. Add a one-line manifest check (or a test) that the package's `dependencies` contain no `@creator-studio/*`; the eslint rule guards imports, not the manifest.

### 6 — MATERIAL · Two names for one region: "Menu bar" in the menu, "Top shelf" everywhere else

Decision 4 names the View item `Menu bar`. `studio-regions.ts:5-8` exists precisely to stop this: "One name per region, shared by the toolbar's buttons, the compact states' expand controls … so they cannot drift." A screen-reader user toggling a checkbox called "Menu bar" watches a landmark called "Top shelf" disappear and gets a button called "Expand top shelf". `cockpit.mjs:221,401` and `app.spec.tsx:16` all bind to `Top shelf`.

**Fix:** name the item `REGION_TITLES.top` like everything else, or rename the region across `studio-regions.ts` and all three consumers. Do not introduce a third string.

### 7 — MATERIAL · Three of the ten browser assertions can pass vacuously

- **§2 "its last item is visible (not clipped by the 48px shelf)"** — cannot fail. The same assertion also proves the content is portaled to `<body>`, and a body-portaled element is by construction outside `#top`'s box, so nothing can clip it. `boundingBox()` returns the layout box regardless of any ancestor's `overflow`. **Fix:** `document.elementFromPoint(centre of last item)` must resolve to that item or a descendant.
- **§10 `scrollWidth <= clientWidth`** — a flex row squashes or ellipsises children rather than overflowing, so this holds while the bar looks broken. **Fix:** assert all three trigger boxes share a `y`, and that the rightmost toggle's right edge is inside 1512 with the leftmost trigger's left edge after the brand.
- **§6 "clicking it changes nothing and raises nothing"** — no observable. **Fix:** assert the menu is *still open* after clicking the disabled item (Radix's behaviour, and VS Code's) and that no command ran.

### 8 — MATERIAL · The `--_mb-*` contract block must be declared on `:root`, and the plan says "element-scoped"

Decision 9 calls the locals "element-scoped", and decision 9's last line correctly notes menus portal to `<body>`. If the contract block lands on `[data-menubar="root"]`, the portaled `Content`/`SubContent` inherit nothing and every `var(--_mb-*)` in the menu resolves to the initial value — an unstyled menu with a correctly-styled bar. The plan gets the `--menubar-*` bridge placement right and then leaves the `--_mb-*` block's selector unstated.

**Fix:** state that the contract block is declared on `:root` in `menubar.css`, and add a harness assertion reading a computed colour off the open menu's content (not just the bar) so a portal-scoped regression is caught.

### 9 — MATERIAL · The most likely real defect has no test: `useShortcuts` listener lifecycle

Everything else in the package is Radix. `useShortcuts` is the one hand-written behaviour, and the classic failure is a listener registered per render or not removed on unmount — a command firing twice, or firing after the component is gone. The unit list tests matching, `preventDefault`, textarea-ignoring and wrong-modifier — all with the hook mounted once.

**Fix:** add specs for (a) unmount removes the listener (dispatch a matching keydown after unmount, expect no call), (b) re-rendering with a new `bindings` array identity does not double-fire, (c) `when: () => false` blocks. Also missing entirely: `Menubar.Sub`, `Menubar.Label` and `Menubar.Group` have no unit tests, against AGENTS.md:91 ("every export from a package's `index.ts` has a test").

### 10 — MATERIAL · `Reset layout` reloads; AGENTS.md promises never to lose work

Decision 6 is a defensible shortcut *today* because nothing in the app holds unsaved state. It stops being defensible the moment the Write milestone lands (`AGENTS.md:25,43`), and a reload with an unsaved buffer is exactly the failure the north star forbids.

**Fix:** record it as a dated constraint in the plan and in `references/friction-notes.md` — "`Reset layout` reloads; this must become a live reset before the editor holds unsaved state" — so the door in decision 6 has a trigger, not just an existence.

---

### Minor

11. **`formatShortcut` is mac-only with no seam.** "Platform is `'mac'` only for now; Windows/Linux rendering is a door" (line 104) — a door with no hinge, in the package whose entire selling point is portability. Fix: `formatShortcut(shortcut, platform: 'mac' | 'other' = 'mac')` and a `platform` prop on `<Menubar>` feeding context. One parameter now, no refactor later.

12. **`label` as a `string` prop is configuration.** `Menubar.Menu label="View"` / `Menubar.Sub label="Theme"` (lines 83, 86) cannot hold an icon, a badge, or a mnemonic underline, and AGENTS.md:108 asks for children and slots. Fix: type `label` as `ReactNode`, and let a `Menubar.Trigger` child override it when a consumer needs full control — keeping the zero-assembly default that decision makes the API good.

13. **No controlled open state.** Radix Root exposes `value`/`onValueChange`; the plan's `MenubarProps` doesn't. A consumer cannot close the bar programmatically. Fix: pass both through.

14. **Four VS Code behaviours are unasserted:** clicking an already-open trigger closes it; Escape inside the Theme submenu closes only the submenu and returns focus to its trigger; the submenu's hover-open delay; Tab out of the bar closes the menu. All are Radix defaults, so these are cheap regression guards rather than build work — add the first two to §3, defer the rest explicitly.

15. **No focus-ring assertion for the bar.** `cockpit.mjs:420` sets the precedent (`keyboard focus paints a ring`). The bridge maps `--menubar-focus → --cs-focus`, but nothing proves a keyboard user can see where they are. Add one outline probe on a focused trigger.

16. **Stories obligation is under-specified.** One `menubar.stories.tsx` (line 111) against AGENTS.md:92's "every component export also has a story" — the barrel exports eight parts. State that the story file carries a story per part (or a matrix story that renders all of them), the way `studio-cockpit.stories.tsx` does.

17. **`app.spec.tsx:24-32` is fragile.** It asserts `getAllByRole('separator')` has exactly one nameless member. `Menubar.Separator` renders `role="separator"`. Safe while menus are closed; any future spec that opens View breaks it. Note the coupling when extending the spec.

18. **DPR is unstated.** A MacBook 14 runs 1512 logical at `deviceScaleFactor: 2`. The harness defaults to 1, so the screenshot at line 207 is not what the target user sees (hairline borders in particular). Fix: `newPage({ viewport: {width: 1512, height: 982}, deviceScaleFactor: 2 })` and say so in the Desktop-only section.

19. **No statement of what a too-tall menu does.** View has eight rows and fits, so this is a seam, not a bug — but the skin needs a `max-height` from `--radix-menubar-content-available-height` plus scroll, or the first long menu overflows the viewport silently. Add it to *Out of scope* explicitly, or to the skin.

20. **`.ladle/preview.css` resolution is assumed.** It currently imports `@creator-studio/tokens/tokens.css` (`preview.css:2`) and there is no root `node_modules/@creator-studio`. Adding the menubar skin there depends on the same resolution path working for a package created later in the same wave; worth a line in wave 1's gate, since a silently unresolved CSS import shows up as an unstyled story, not an error.

21. **Duplicate accessible names are deliberate but unstated.** After this change, "Navigation" names both a toolbar `button` and a `menuitemcheckbox` in the same landmark. That's fine and matches VS Code, but decision 2 should say so — it is the kind of thing a later reviewer flags as an accident.
