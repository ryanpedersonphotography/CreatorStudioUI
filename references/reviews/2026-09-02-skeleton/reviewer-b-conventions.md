# Adversarial review — CreatorStudioUI skeleton (`e62743f`)

Reviewer brief: convention compliance + next-milestone gaps. Read-only; no files written. Everything below is quoted from the working tree or from build output I inspected; where I reason rather than execute, I say so.

---

## 1. MATERIAL — the entire Ladle configuration is gitignored, so `pnpm verify` is not reproducible from a clone

`.gitignore:54`

```
.ladle
```

`git ls-files .ladle` returns **nothing**. `git check-ignore -v .ladle/config.mjs` confirms `.gitignore:54:.ladle`. All four files — `config.mjs`, `components.tsx`, `preview.css`, `vite.config.mts` — exist on your disk and in no commit.

Why it matters: `package.json:14` makes `stories:build` a step in `pnpm verify`, and `AGENTS.md` lists `.ladle/` under *Where things live* as if it ships. On a fresh clone Ladle falls back to its defaults — story glob `src/**/*.stories.*` from cwd, no `viteConfig`, no Tailwind, no `tokens.css` — so `stories:build` either finds zero stories or builds them unstyled, and passes either way. The gate that is supposed to enforce "every component export has a story" is the one gate that silently evaporates. This is also the mechanism by which the *next* milestone's editor stories would look green and be blank.

Fix: that ignore line was meant for Ladle's build cache, not its config. Replace `.ladle` with `.ladle/.cache` (and keep `dist/ladle` covered by the existing `dist` rule), then `git add -f .ladle`.

---

## 2. MATERIAL — the shell has no context, so `Cockpit.Panel` cannot be given collapse/pin without a breaking API change

`packages/shell/src/lib/cockpit.tsx:80-92`

```tsx
function CockpitPanel({ id, defaultSize, minSize, maxSize, children, className }: CockpitPanelProps) {
  return (
    <ResizablePanel
      id={id}
```

This is the answer to your question 2. The compound API is genuinely composable in *arrangement* — children in, order preserved, no boolean-prop pile — but it is closed over four decisions the "Write + Arrange" milestone needs, and three of them are unfixable from outside the package.

**a. No shared context.** The reference app solves exactly this at `AppShell.tsx:37` (`const ShellContext = createContext<ShellRegions | null>(null)`) and `useShell()`, because a collapse button lives in a *different* component from the panel it collapses. `usePanelToggle` returns `panelProps: Pick<PanelProps, "panelRef" | "onResize">` to be spread onto the Panel — our `CockpitPanel` accepts neither `panelRef` nor `onResize`, so there is no way to attach a handle. Footgun 5 Cause A also applies: `collapse()` is a silent no-op without `collapsible`, which we don't forward either.

**b. Panel DOM ids are unnamespaced.** `cockpit.tsx:83` passes `id={id}` straight through; the library writes it to the DOM (`<div data-panel id="panel-id-prop">`), which is why `tools/verify/persistence.mjs:18` can use `page.locator('#nav')`. The Group id *is* sanitised and namespaced (`cockpit.tsx:61`, `domId(id)`) — the panels are not. Two `<Cockpit>` on one page emit duplicate `#nav`/`#main`/`#inspector`. The reference app calls this out explicitly ("two `<AppShell>` instances on one page would otherwise emit seven pairs of duplicate ids"). `AGENTS.md` says "a component that only works in one place is a defect"; today the cockpit is that component.

**c. `orientation` is hardcoded.** `cockpit.tsx:62` `orientation="horizontal"`, and `cockpit.tsx:98` hardcodes `cursor-col-resize` to match. A manuscript with a notes drawer under it is the reference app's `center` group — vertical. Footgun 3 ("a vertical Group renders as nothing") means this is not a prop you want a caller discovering by trial.

**d. No `panelIds`, so conditional panels restore the wrong layout — silently.** `cockpit.tsx:57`:

```tsx
const layout = useDefaultLayout({ id, storage: asLayoutStorage(store) });
```

The library's own type (`react-resizable-panels.d.ts:461-467`) documents `panelIds` as *the* mechanism for "Groups that contain conditionally-rendered Panels", warning "Panel ids must match the Panels rendered within the Group during mount **or the initial layout will be incorrect**." Footguns 11 and 12 are both about this. "Collapse/pin" plus "distraction-free mode" is conditional panels by definition.

**Concrete fix, and it is cheap now.** Four additions inside `cockpit.tsx`, no caller changes:

1. A `CockpitContext` carrying `{ layoutKey }`, provided by `Cockpit`; `CockpitPanel` reads it and renders `id={`${domId(layoutKey)}-${id}`}` for the DOM while keeping `id` as the caller's stable handle. Do this **before** any layout is persisted in anger — changing panel ids later invalidates every saved layout, since the library keys the saved layout by panel id (footgun 4).
2. `orientation?: 'horizontal' | 'vertical'` on `CockpitProps`, defaulted to `horizontal`, put on the context, and read by `CockpitSeparator` to pick `cursor-col-resize` / `cursor-row-resize`. Then a nested vertical group is just `<Cockpit group="center" orientation="vertical">` inside a panel — which already works, because `group` already namespaces the key (`contracts/src/lib/layout-store.ts:18`).
3. `panelIds?: string[]` on `CockpitProps`, forwarded to `useDefaultLayout`.
4. Widen `CockpitPanelProps` with `collapsible`, `collapsedSize`, `panelRef`, `onResize`, `disabled`, `groupResizeBehavior` — pass-throughs, not new concepts.

Do (1) and (2) now regardless; (3) and (4) are the milestone's work but cost nothing to reserve. One thing you should *not* port yet: the reference's `usePanelToggle` is 150 lines of hard-won library behaviour (footguns 5, 6, 22). Port it when you build the controls, not speculatively — but port it, don't re-derive it.

Also note footgun 10 lands the moment pinning arrives: every Group needs one relative panel or `preserve-pixel-size` quietly stops working, with no error. Today all three panels are percent-sized so it's dormant.

---

## 3. MATERIAL — typography is entirely outside the token system, and the next milestone is a prose editor

`apps/studio/src/app/app.tsx:34`

```tsx
<h2 className="text-sm font-ui font-medium uppercase tracking-wide text-ink-muted">{title}</h2>
```

From the built bundle `apps/studio/dist/assets/index-n_F5B6vN.css`:

```css
.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}
```

`--text-sm` is **Tailwind's** default (0.875rem), not ours — `tokens.css` declares no `--text-*` namespace at all. Same for `font-medium`, `tracking-wide`, and every `--spacing`-multiple utility. `AGENTS.md` claims "every design value lives in `packages/tokens`"; for type, weight and tracking that is currently false, and `check-tokens.mjs` cannot see it (finding 4).

Why it matters for "Write": prose typography *is* the feature. A manuscript surface needs a measure (`max-width` in `ch`), a prose line-height, a prose size ramp, and a paragraph rhythm — none of which exist. `--cs-font-prose` (`tokens.css:58`) gives you a family and nothing else, and `font-prose` is currently applied to a `<section>` with no text in it (`app.tsx:33`).

Fix: add a `--cs-p-text-*` ramp and `--cs-text-*` semantics to `tokens.css`, bridge them in `@theme inline` as `--text-*` (which *overrides* Tailwind's defaults rather than sitting beside them), and add the three the editor will need immediately: `--cs-prose-measure` (e.g. `68ch`), `--cs-prose-leading`, `--cs-prose-size`. While you're there: `@theme inline` does not disable Tailwind's default palette, so `bg-red-500` and `text-2xl` compile today. If you want the token package to be the only source, add `--color-*: initial;` and `--text-*: initial;` at the top of the theme block.

---

## 4. MATERIAL — `check-tokens.mjs` does not catch raw values in `className`, which is where nearly all of this repo's design values live

`scripts/check-tokens.mjs:116-122`

```js
const isStyleLine = isCss || /style=\{\{|^\s*[\w-]+:\s*['"`]?[\d.]/.test(line);
if (isStyleLine && !/^\s*@media|^\s*@keyframes|^\s*\d+%/.test(line)) {
  for (const m of line.matchAll(LENGTH)) {
```

The length rule only fires on CSS lines and inline-`style` lines. A `className` string is neither. The value that slips through, already in the tree — `packages/shell/src/lib/cockpit.stories.tsx:14`:

```tsx
<div className="h-[80vh] border-line border-border">
```

Confirmed emitted in both bundles: `.h-\[80vh\]{height:80vh}`. The `UNIT_STRING` rule (line 71) doesn't catch it either — it requires a quote or `${` immediately before the digits, and `h-[80vh]` has a bracket. So `p-[12px]`, `mt-[1.5rem]`, `w-[240px]`, `duration-[350ms]` and `text-[15px]` all pass the gate today. Combined with finding 3, the rule that `AGENTS.md` describes as "fails on any raw colour or length anywhere else" is doing roughly half its stated job.

Credit where due: the **colour** half is airtight. `COLOR` (line 67) is checked unconditionally on every line of every file, so `text-[#ff0000]` and a stray `oklch(...)` are both caught. And rule 2 (`--cs-p-*` outside tokens.css, line 111) and rule 1 (undefined `var()`, line 107, with `@theme` correctly excluded from the declared set at line 63) are both sound.

Fix: add a third detector for Tailwind arbitrary values — scan every non-tokens line for `-\[[^\]]*\]` and run `LENGTH`/`COLOR` on the bracket contents, regardless of `isStyleLine`. That is a five-line change and it closes the class of leak that matters most given this repo styles almost exclusively through utilities.

---

## 5. MATERIAL — "every `index.ts` export has a test" is listed as an *enforced gate* but nothing enforces it, and it is already violated

`AGENTS.md`, *Conventions* → *Enforced — a gate fails the build*:

> Every export from a package's `index.ts` has a test; every component export also has a story.

`package.json:14` runs `typecheck · lint · lint:tokens · test · stories:build · build`. None of those six checks export-to-test coverage. It is an honour rule filed under "Enforced", which is the one place a rule must not be aspirational — the review gate downstream will read it as already-checked.

Already violated: `packages/tokens/src/index.ts:1` exports `THEMES` and `ThemeRoot`. `grep -rn "THEMES" --include='*.spec.*'` across `packages` and `apps` returns nothing; `theme.spec.ts:2` imports only `applyTheme, parseTheme, THEME_ATTRIBUTE`. `THEMES` is the array a theme-picker will map over in the next milestone, and nothing asserts its contents or its order.

Fix: either add a real check (a small script that parses each `index.ts`'s named exports and greps the package's specs for each identifier — the same shape as `check-tokens.mjs`, added to `verify`), or move the line out of *Enforced* into *Reviewed*. Do not leave it where it is. Given you asked to dial documentation down and get things done: write the 40-line script, because then the sentence in AGENTS.md becomes redundant and can be deleted.

---

## 6. MATERIAL — the separator has no visible focus state and no way to be labelled, in the milestone that is *about* the separator

`packages/shell/src/lib/cockpit.tsx:94-103`

```tsx
function CockpitSeparator({ className }: { className?: string }) {
  return (
    <ResizableSeparator
      className={joinClasses(
        'w-separator shrink-0 cursor-col-resize bg-border transition-colors duration-(--cs-motion-fast) hover:bg-accent data-[resize-handle-active]:bg-accent',
```

Two gaps, both quoted from the reference's footgun 20:

**No focus indicator.** The library makes separators keyboard-focusable and drives `data-separator="focus"` from its own `onFocus`/`onBlur`. This class list styles `hover:` and `data-[resize-handle-active]:` and nothing for focus. A keyboard user arrow-keying the layout gets no indication of which boundary they are on. `--cs-focus` exists for exactly this and has zero consumers (see finding 10).

**No way to label it.** The props type is `{ className?: string }`. Footgun 20 notes `aria-label`, `aria-labelledby` and `aria-describedby` "pass straight through `{...rest}` untouched. **Set one whenever a Group has more than one `Separator`**". `apps/studio/src/app/app.tsx:19` and `:23` are two separators in one group, both unlabelled, both announced identically. The next milestone adds more.

Fix: declare and export `CockpitSeparatorProps` (see finding 12) with `aria-label`, `id`, `disabled` and `elementRef`; add `data-[separator=focus]:outline focus-visible:outline` bound to a new `--cs-focus-ring` width token. Don't accept `role`, `tabIndex` or `ref` — the library rejects them at the type level.

---

## 7. MATERIAL — the `LayoutStore` port is missing `removeItem`, which blocks "reset layout" and makes a remote adapter awkward

`packages/contracts/src/lib/layout-store.ts:12-15`

```ts
export interface LayoutStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
```

Answering your question 3 in three parts.

**Is the wiring contained?** Yes, verified. `grep -rn "adapter-local"` across `apps`, `packages`, `.ladle`, `tools`, `scripts` returns exactly one import: `apps/studio/src/app/app.tsx:2`. The boundary matrix backs it up — `eslint.config.mjs:44-51` gives `type:ui` only `['type:ui','type:contract','type:util']`, so shell importing an adapter fails lint. `cockpit.stories.tsx:6-11` builds its own bag rather than reaching for the adapter, which is the convention behaving correctly under pressure. This part of the design is working.

**Could a future adapter implement it?** A plain-files adapter, yes, with an in-process cache. A remote adapter, technically yes, but the port has no *hydration seam*: the store is constructed synchronously at module scope (`app.tsx:10`) and the library reads it during render. A remote adapter would return stale or empty layout on first paint with no way to signal readiness, and retrofitting that means touching the composition root and probably suspending the shell. That is the one thing worth reserving now — and it belongs on the **adapter**, not the port: give `adapters/local` a no-op `hydrate(): Promise<void>` and have `app.tsx` await it before `createRoot().render`. Ten lines, and the shape exists before a second adapter needs it.

**The missing method.** `removeItem` is absent, so "reset this panel group to defaults" — a natural companion to collapse/pin, and what double-clicking a separator already does in-memory — cannot be expressed through the port. You'd have to write a sentinel value and teach the shell to interpret it, which puts library semantics back into the store. Add `removeItem(key: string): void` now; it is one line in the interface, three in each adapter, and it is a breaking change to every adapter once there is more than one.

**Is the port too narrow to be the pattern data follows?** It is narrow, and that is correct — but for a reason worth writing down rather than assuming. `LayoutStore` is a *string blob keyed by a string*, which is the right shape for layout and the wrong shape for manuscripts (which need queries, ordering, partial updates and change notification). Do **not** generalise it into a `Repository<T>` now; a premature generic repository is worse than two honest ports. What you should generalise now is the *convention*, in one sentence in AGENTS.md: one port per capability, named for the capability, synchronous only where a library forces it, hydration on the adapter. That costs a line and prevents the next agent from either widening `LayoutStore` into a god-object or inventing an unrelated shape for the manuscript port.

---

## 8. MATERIAL — the test that proves the key-prefix shim can pass without the shim ever running

`packages/shell/src/lib/cockpit.spec.tsx:32-46`

```tsx
it('reads a remembered layout through the port under the cs:layout key', () => {
  const store = memoryStore();
  store.setItem('cs:layout:demo:root', JSON.stringify({ nav: 30, main: 70 }));
  render(…);
  // The library prefix never reaches the store: only our key exists.
  expect(store.keys()).toEqual(['cs:layout:demo:root']);
});
```

The store is seeded with one key, then the assertion checks that it still holds one key. That passes whether or not `getItem` was ever called, whether or not the unprefix shim at `cockpit.tsx:47-53` ran on the read path, and whether or not the restored layout was applied — the seeded `{nav: 30, main: 70}` is never asserted against rendered geometry. It catches exactly one failure mode: a *write* landing under a prefixed key during mount. Under `ResizeObserver` stubbed to a no-op (`tools/vitest/setup.ts:5-9`), whether any write happens at mount at all is not something this test establishes. (I reasoned this from the assertion's shape rather than instrumenting a run — the logic holds regardless of what the library does.)

This matters because the shim is the single load-bearing piece of the backend-agnostic claim: it is what keeps the library's identity out of the store.

The real proof does exist — `tools/verify/persistence.mjs:39` asserts `keys.length === 1 && keys[0] === 'cs:layout:default:root'` after an actual drag, which is a genuine end-to-end check. But `package.json:15` puts it behind `verify:slice`, outside `pnpm verify`, and it needs a running server. So the contract is defended by a script nobody runs in CI and by a unit test that can't fail for the right reason.

Fix: in the unit test, spy on `getItem` and assert it was called with `'cs:layout:demo:root'` and never with a `react-resizable-panels:`-prefixed key — that tests the shim directly and needs no layout maths. Separately, decide whether `verify` should start the app and run the slice; if not, say so in AGENTS.md so the next agent doesn't assume `pnpm verify` covers persistence.

---

## 9. MINOR — `border-line` is a dead class and `--spacing-line` has no consumer

`packages/shell/src/lib/cockpit.stories.tsx:14`

```tsx
<div className="h-[80vh] border-line border-border">
```

Neither built bundle emits a `.border-line` rule — I grepped both `dist/ladle/assets/index-_648Tspl.css` and `apps/studio/dist/assets/index-n_F5B6vN.css` for any block containing `border-line` and got nothing, while `.w-separator{width:var(--cs-separator-hit)}` *is* emitted from the same `--spacing-*` namespace. Tailwind v4 resolves `w-*` through `--spacing-*` but border *width* is not a `--spacing-*` consumer, so `--spacing-line` (`tokens.css:105`) is unreachable and the story's border never renders.

Fix: `border` + `border-border`, and either drop `--spacing-line` from the theme bridge or move it to a namespace that border widths actually read.

## 10. MINOR — `--cs-focus` is declared in three places and used in none

`tokens.css:45`, `:72`, `:85`, bridged at `:100` (`--color-focus: var(--cs-focus)`). `grep -rn "focus"` across all source `.tsx`/`.ts`/`.css` under `apps`, `packages` and `.ladle` returns only those token declarations — no `focus-visible:`, no `outline`, nowhere. There is also no focus *ring width* or *offset* token, only a colour, so the first component that needs one will invent a raw value or reach for Tailwind's default. Pairs with finding 6; fix them together.

## 11. MINOR — two components in one file, and props that aren't `<Component>Props`

`apps/studio/src/app/app.tsx:31`

```tsx
function Region({ title, prose = false }: { title: string; prose?: boolean }) {
```

`AGENTS.md`: "One component, one file, one job." `app.tsx` holds `App` and `Region`. `Region` is also a `prose` boolean prop standing in for what will become two different surfaces — the exact "boolean-prop pile" the conventions warn about, in embryo. It is placeholder scaffolding, so this is small, but it is the file the editor lands in next: `Region` should either become `apps/studio/src/app/region.tsx` with an exported `RegionProps`, or be deleted when the real surfaces arrive. Deleting is better.

The compound-component file `cockpit.tsx` holding `Cockpit`, `CockpitPanel` and `CockpitSeparator` is **not** a violation of the same rule — `AGENTS.md` names `Card` / `Card.Header` / `Card.Body` as the ideal, and a compound API split across files loses the thing that makes it one API.

## 12. MINOR — `CockpitSeparatorProps` doesn't exist

`packages/shell/src/lib/cockpit.tsx:94` uses an inline `{ className?: string }`, and `packages/shell/src/index.ts:1` exports `CockpitPanelProps` and `CockpitProps` but no separator type. The convention says exported props are named `<Component>Props`; a caller wrapping `Cockpit.Separator` (which they will, to add a keyboard handler for collapse — the reference does exactly that on its `ShellSeparator`) has no type to extend. Declare `CockpitSeparatorProps` and export it alongside the other two.

## 13. MINOR — package name breaks the stated directory-equals-name rule

`AGENTS.md`: "directory name = package name (`packages/shell` → `@creator-studio/shell`)". `packages/adapters/local/package.json:2` is `@creator-studio/adapter-local` with nx name `adapter-local`. Neither `adapters/local` nor `adapters-local`. The name is fine; the *rule* is now wrong, and rules that are wrong get ignored wholesale. Amend the rule to cover the grouped case in six words, or rename. Amending is cheaper.

Also `packages/shell/package.json` is the only manifest of the four missing `"type": "module"` — harmless under bundler resolution, but it is the kind of asymmetry that costs an hour when something eventually reads it.

## 14. MINOR — orphaned `.babelrc` requesting a polyfill that isn't installed

`packages/shell/.babelrc` sets `"useBuiltIns": "usage"`, which instructs `preset-env` to inject `import "core-js/modules/…"` statements. `ls node_modules | grep '^core-js'` finds nothing. Nx generator leftover; `@vitejs/plugin-react` will pick up a `.babelrc` in the package root. It isn't breaking today, but it is a latent unresolved-import waiting for a syntax target change. Delete it, or add `core-js` and mean it.

## 15. MINOR — the theme API has no consumer anywhere

`packages/tokens/src/index.ts:1` exports `applyTheme`, `parseTheme`, `THEME_ATTRIBUTE`, `THEMES`. `grep -rn "applyTheme\|parseTheme\|THEME_ATTRIBUTE"` across `apps/studio/src` and `.ladle` returns nothing. Dark mode currently works only through `@media (prefers-color-scheme: dark)` (`tokens.css:76-88`); the `[data-theme]` path at `:64` is exercised by unit tests and by nothing else. "Switch appearance — system / light / dark" is a listed core experience whose entire mechanism is unproven end to end. Not a blocker for Write + Arrange, but the screenshots at `screenshots/cockpit-dark.png` prove the media query, not `applyTheme`. Worth one line in *Stage* saying so, so nobody reads the token exports as a shipped feature.

---

## 16. MINOR — documentation weight (your question 5)

Four specific redundancies, in order of how much they cost:

**a. `AGENTS.md` *Herdr workspace* — ~20 lines restating a skill it names as the authority.** The section itself says "The skill at `~/.claude/skills/herdr/SKILL.md` is the authority", then reproduces the essentials anyway, and `CLAUDE.md:6-7` points at *this section* rather than at the skill. Three hops to reach one source. Two of those lines are genuinely project-specific and cannot live in a generic skill: the workspace label `CreatorStudioUI`, and the fact that long-running processes here mean the 5180 dev server, the Ladle server on 61000, and the Vitest watcher. Keep those two. Cut the rest to "Herdr rules: `~/.claude/skills/herdr/SKILL.md`, read it before starting a process."

**b. `references/friction-notes.md:23-24` is stale.** "This repo's Vite config must pin 5180 strict; **it lands with the skeleton**." It landed — `apps/studio/vite.config.mts:7`, which carries the same explanation as a code comment. The durable fact is "5173 and 5190 belong to the reference app"; the instruction is spent.

**c. `friction-notes.md:14-15` duplicates `tools/vitest/setup.ts:1-4` almost verbatim** — both say jsdom lacks `ResizeObserver` and react-resizable-panels constructs one at mount. The setup file is the one a cold agent hits first, and it's the one that can't drift. Cut the note to a pointer.

**d. `CLAUDE.md:13-30` — the Nx auto-block is 18 of the file's 32 lines**, and it is generic guidance ("NEVER guess CLI flags", "prefix nx commands with the package manager") that duplicates the `nx-workspace` and `nx-generate` skills. It regenerates if deleted, so this is a note rather than an action: the human-authored part of `CLAUDE.md` is lines 1-8, and that ratio is worth knowing when you judge whether the docs are "dialled down."

What is **not** redundant and should stay: `AGENTS.md` *Where things live* earns its keep for the three entries you cannot get from `ls` — the registry id, the transcript folder, and the reference-app path. The `references/reviews/2026-09-02-agents-md/` set is four files where `disposition.md` is the durable one, but the governance rule asks for the record, so leave it.

## 17. MINOR — harness notes (your question 6)

`CLAUDE.md:8` and `friction-notes.md:18-22` both say the Agent tool cannot spawn here (iTerm2 split failure) and give the headless `claude -p` workaround with an `--allowedTools` list. The note is specific, dated, and names the cause (`teammateMode: auto`), which is what a cold agent needs. **I did not test it** — spawning an agent was outside my brief, and my own session lists agent types as available, which proves nothing about whether the split succeeds. Flagging only that it is a claim with a mechanism that could have been fixed in `~/.claude/settings.json` since 2026-09-02 and would then be silently misleading; it deserves a re-check the next time someone actually needs a subagent, not a speculative edit now.

The rest of the Herdr guidance in `AGENTS.md` is accurate against the skill's shape as described and sufficient for a cold start — the guard (`test "${HERDR_ENV:-}" = 1`), the never-run-bare-`herdr` rule, the split-direction rule, and the start-and-confirm sequence with `wait-output` then `curl` are all concrete enough to follow without the skill open. The `wC` id is correctly hedged with "always read IDs from `herdr` JSON".

---

## Checked and clean

Rules and files I checked that need no change:

- **Backend-agnostic wiring is real, not aspirational.** `grep -rn "adapter-local"` across `apps`, `packages`, `.ladle`, `tools`, `scripts` yields exactly one import site: `apps/studio/src/app/app.tsx:2`. `packages/shell` depends only on `@creator-studio/contracts` and `@creator-studio/tokens` (`packages/shell/package.json`).
- **Boundary matrix enforces the claim.** `eslint.config.mjs:18-69`: `type:ui` → `['type:ui','type:contract','type:util']` excludes `type:adapter`; `type:contract` → contracts and utils only; `type:adapter` → contracts and utils only. Tags verified present on all five manifests (`contracts` `type:contract`, `shell` `type:ui`, `tokens` `type:util`, `adapter-local` `type:adapter`, `studio` `type:app`), and `pnpm nx show projects` returns all five.
- **"Packages import each other only through `index.ts`" is enforced by resolution, not just convention.** Every package manifest defines an `exports` map with only `"."`, `"./package.json"` (and `"./tokens.css"` for tokens), so deep imports fail at resolve time.
- **The Group id / storage key separation is correct.** I read `react-resizable-panels.d.ts:485-498`: `useDefaultLayout` returns only `{defaultLayout, onLayoutChange, onLayoutChanged}` and no `id`. So `cockpit.tsx:60-61` spreading `{...layout}` and then setting `id={domId(id)}` cannot clobber the storage key — the DOM id and the persistence key are genuinely independent. Footgun 13 (spreading clobbers your handlers) does not apply: nothing after the spread is a handler.
- **Sizes always carry a unit, and it's typed.** `packages/tokens/src/lib/sizes.ts:2` `type PanelSize = \`${number}%\` | \`${number}px\`` with `satisfies Record<string, PanelSize>` at line 14, and `sizes.spec.ts:5-9` asserts the regex at runtime too. Belt and braces, correctly — the library treats a bare number as pixels and a unitless string as percent (footgun 2), and this type forbids both.
- **The token colour rule is airtight.** `check-tokens.mjs:113-114` runs `COLOR` on every line of every non-tokens file unconditionally, independent of the `isStyleLine` gate that weakens the length rule. Rule 1 (`:105-108`) resolves every `var(--…)` against the declared set, with `@theme` blocks correctly stripped at `:63` so a `var(--color-x)` from the bridge can't be mistaken for a cascade token. Rule 2 (`:111`) catches `--cs-p-*` outside the token package. `srcDirs` (`:41-51`) does recurse one level, so `packages/adapters/local/src` is genuinely in scope.
- **The primitive/semantic/`@theme inline` split is coherent for colour and spacing.** `tokens.css:11-62` declares primitives then semantics; `:64-88` overrides only semantics for dark, in both the `[data-theme]` and `prefers-color-scheme` paths, with matching value sets — I diffed the two blocks line by line and they agree on all eight properties plus `color-scheme`. `@theme inline` (`:92-112`) points at semantics, so a theme flip re-colours utilities with no rebuild, which the comment at `:90-91` correctly explains. My complaint in finding 3 is about what's *missing* from the split (type), not about the split itself.
- **Every component export has a story.** `packages/shell/src/index.ts:1` exports one component (`Cockpit`, with `.Panel`/`.Separator` attached); `cockpit.stories.tsx:13-34` exercises all three in one story. `packages/tokens` and `packages/contracts` export no components. Subject to finding 1 — the story exists, the config that finds it isn't committed.
- **Every `index.ts` export has a test, except `THEMES` and `ThemeRoot`.** Checked all four barrels: `contracts` (`layoutKey` at `layout-store.spec.ts:4`, `LayoutStore` at `:14`), `adapter-local` (both factories at `layout-store.local.spec.ts:4,17`), `shell` (`Cockpit` at `cockpit.spec.tsx:15`), `tokens` (`applyTheme`, `parseTheme`, `THEME_ATTRIBUTE` covered; `cockpitSizes` at `sizes.spec.ts:4`). Only the two named in finding 5 are uncovered.
- **Headless-first, state-stays-close.** No global store anywhere; `cockpit.tsx` holds no `useState`, deferring all layout state to the library, and the only state seam is the injected `store`. `AGENTS.md`'s "React context + reducer colocated with the feature" has no violation because there are no features yet — though finding 2 is the point where a context becomes mandatory.
- **The adapter's failure handling is genuinely defensive and genuinely tested.** `layout-store.local.ts:17-36` wraps both methods in try/catch and falls back to memory when no storage exists; `layout-store.local.spec.ts:30-48` covers the throwing-storage and no-storage paths, not just the happy one. This is the file most likely to be a stub in a skeleton and isn't.
- **`tools/vitest/setup.ts`** correctly guards with `typeof globalThis.ResizeObserver === 'undefined'` rather than clobbering, and is wired into both `apps/studio/vite.config.mts:36` and `packages/shell/vite.config.mts:16`.
- **No `any` in any source file** — grepped `apps/*/src` and `packages/**/src`; the only assertions are the narrowly-scoped `as Theme` in `theme.ts:24` (guarded by the `includes` check on the same line) and the `as HTMLElement` in `main.tsx:6`.
- **Port 5180 is pinned strict** in both `server` and `preview` (`apps/studio/vite.config.mts:12-21`), with the reason as a comment at `:6`, matching `AGENTS.md` and `friction-notes.md`.
- **No build output is tracked.** `git ls-files | grep -cE 'dist/|out-tsc/'` returns `0`; the working tree is clean apart from the untracked review directory and the `.ladle` problem in finding 1.
