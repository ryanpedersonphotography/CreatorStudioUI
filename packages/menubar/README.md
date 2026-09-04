# @creator-studio/menubar

A menu bar the way an IDE draws one: titles across a bar, click one and its menu drops under it,
hover across titles while any menu is open, keyboard all the way. Thin compound parts over
[Radix Menubar](https://www.radix-ui.com/primitives/docs/components/menubar) plus a shortcut
descriptor that both prints beside an item and binds a key.

It has **no workspace dependencies**, enforced two ways: the `kind:portable` boundary tag in the
root eslint config rejects any `@creator-studio/*` import, and `src/lib/manifest.spec.ts` rejects
one in `package.json`.

## Use

```tsx
import { Menubar, useShortcuts } from '@creator-studio/menubar';
import '@creator-studio/menubar/menubar.css';

const toggleNav = { key: 'b', ctrl: true, meta: true };

function Bar() {
  useShortcuts([{ shortcut: toggleNav, run: () => nav.toggle() }]);
  return (
    <Menubar aria-label="Studio menu">
      <Menubar.Menu label="View">
        <Menubar.CheckItem checked={!nav.collapsed} onCheckedChange={nav.set} shortcut={toggleNav}>
          Navigation
        </Menubar.CheckItem>
        <Menubar.Separator />
        <Menubar.Sub label="Theme">
          <Menubar.RadioGroup value={theme} onValueChange={setTheme}>
            <Menubar.RadioItem value="dark">Dark</Menubar.RadioItem>
          </Menubar.RadioGroup>
        </Menubar.Sub>
        <Menubar.Item onSelect={reset}>Reset layout</Menubar.Item>
      </Menubar.Menu>
    </Menubar>
  );
}
```

- `Menubar` — the bar. Give it an `aria-label`. `value` / `onValueChange` control which menu is
  open; `platform` (`'mac'` | `'other'`) sets how shortcuts print; `portalContainer` moves the
  menus out of the document body.
- `Menubar.Menu` — one title (`label`, any ReactNode) and its dropdown. Extra props land on the
  dropdown, which is how a consumer tags it (`data-region="top"`).
- `Menubar.Item`, `Menubar.CheckItem`, `Menubar.RadioGroup` + `Menubar.RadioItem`,
  `Menubar.Sub`, `Menubar.Separator`, `Menubar.Label`, `Menubar.Group` — Radix's parts. Every
  item reserves an indicator gutter so labels align; a `shortcut` prints right-aligned
  (`aria-hidden`) and sets `aria-keyshortcuts`; `textValue` defaults to a string label so
  typeahead ignores the mark and the shortcut.
- `useShortcuts(bindings)` — one window `keydown` listener for the component's lifetime. A binding
  is `{ shortcut, run, when?, global? }`; it does not fire inside a text field unless `global`.
- `formatShortcut`, `serializeShortcut`, `matchesShortcut` — the helpers behind the above.

Menus render in a body portal, so the bar can sit inside anything that clips.

## The CSS contract

`menubar.css` styles the parts through `data-menubar="<part>"` hooks and reads its values from
`--menubar-*` custom properties **declared on `:root`** (menus live in a portal and inherit from
`body`, so a bar-scoped value would never reach them). Every property has a standalone fallback:
colours are CSS system colours, which follow `color-scheme`, so the bar renders with none set.

| Property | Purpose | Fallback |
| --- | --- | --- |
| `--menubar-bg` | menu background | `Canvas` |
| `--menubar-fg` | text | `CanvasText` |
| `--menubar-muted` | shortcuts, labels, disabled rows | `GrayText` |
| `--menubar-border` | menu border and separators | `ButtonBorder` |
| `--menubar-border-width` | their thickness | `1px` |
| `--menubar-highlight-bg` | open title, highlighted row | `Highlight` |
| `--menubar-highlight-fg` | text on a highlight | `HighlightText` |
| `--menubar-focus` | keyboard focus ring colour | `Highlight` |
| `--menubar-focus-ring` | its width | `2px` |
| `--menubar-radius` | corners | `0.25rem` |
| `--menubar-font` | family | `ui-sans-serif, system-ui, sans-serif` |
| `--menubar-size` | font size | `0.875rem` |
| `--menubar-pad-x`, `--menubar-pad-y` | title and row padding | `0.5rem`, `0.25rem` |
| `--menubar-gap` | label-to-shortcut distance | `1.5rem` |
| `--menubar-indicator-width` | the check column | `1.25em` |
| `--menubar-min-width` | menu width floor | `14rem` |
| `--menubar-shadow` | menu shadow | a soft `rgb(0 0 0 / 0.18)` |
| `--menubar-motion` | title highlight transition | `120ms` |
| `--menubar-z` | menu stacking | `50` |

Menus cap their height at the space Radix measures below the title
(`--radix-menubar-content-available-height`, set on the open menu itself; `80vh` when nothing sets
it) and scroll inside that.

## Taking it out of this repo

The runtime is four files: `src/index.ts`, `src/lib/menubar.tsx`, `src/lib/shortcuts.ts`,
`src/lib/menubar.css`. Everything else in the folder (config, specs, stories) is wired to this
monorepo and is listed below so nothing is a surprise.

1. Copy `packages/menubar/` somewhere; it ships as source (TSX + one CSS file, no build step).
2. `pnpm add @radix-ui/react-menubar` beside React 19 and React DOM 19. That is the only runtime
   dependency; the manifest declares nothing else on purpose.
3. Use a bundler that handles TSX and a CSS side-effect import, then
   `import '@creator-studio/menubar/menubar.css'` (or the file path) once. Imports inside the
   package use `.js` extensions on `.ts`/`.tsx` sources (`./lib/menubar.js`), the Node16 module
   resolution this repo uses; a bundler or TypeScript with `moduleResolution: bundler` or `node16`
   handles it, plain Node does not.
4. Set the `--menubar-*` properties on `:root`, or accept the fallbacks.
5. Replace the repo wiring, or drop the files that need it:
   - `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json` all `extends ../../tsconfig.base.json`
     (strict, `jsx: react-jsx`, `module: nodenext`); inline those options or point at your own base.
   - `vite.config.mts` names the shared test setup `../../tools/src/vitest/setup.ts` and uses
     `@vitejs/plugin-react`; the setup stubs `scrollIntoView` and the three pointer-capture methods
     on `Element.prototype`, which jsdom lacks and Radix calls. Bring those four no-op stubs.
   - `eslint.config.mjs` extends the root config (`../../eslint.config.mjs`), which carries the
     `kind:portable` boundary rule; outside this repo the rule has nothing to enforce, so any flat
     config will do.
   - The specs and stories need dev dependencies this repo hoists at the root: `vitest`, `jsdom`,
     `@testing-library/react`, `@testing-library/user-event`, `@vitejs/plugin-react`, and
     `@ladle/react` for the stories. Add them, or trash `*.spec.*` and `*.stories.*`.
   - `src/lib/manifest.spec.ts` guards this repo's `@creator-studio/*` scope; keep it only if you
     rename the scope it checks.
