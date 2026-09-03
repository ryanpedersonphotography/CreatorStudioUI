# Friction notes

Footguns and lessons that must survive between sessions. Add to the top; never delete.

- **2026-09-02** — pnpm 11 runs a dependency-status check before every `pnpm nx …`; if any workspace
  package declares `workspace:*` on a package that does not exist yet (or was just removed), every
  nx command dies with a pnpm stack trace. Remove the dependency line, run the generator, put it back.
- **2026-09-02** — pnpm 11 appends placeholder `allowBuilds:` lines ("set this to true or false") to
  `pnpm-workspace.yaml` during `nx add`; a second real block then fails YAML parsing as a duplicate
  key. Keep one `allowBuilds` block and delete the placeholders.
- **2026-09-02** — Nx 23's React library generator ships `tsconfig.lib.json` without the `dom` lib;
  any DOM type in a UI package fails typecheck until `lib: ["dom", "dom.iterable", "es2022"]` is added.
  Stories are excluded from the lib build and included in the spec build so they typecheck unemitted.
- **2026-09-02** — jsdom has no `ResizeObserver`; react-resizable-panels constructs one at mount and
  every render test dies with "n is not a constructor". `tools/vitest/setup.ts` stubs it.
- **2026-09-02** — Playwright's library and the `npx playwright` CLI use separate browser builds;
  after `pnpm add -Dw playwright`, run `pnpm exec playwright install chromium` once.
- **2026-09-02** — The Agent tool fails here with "Failed to create iTerm2 split pane": the harness's
  agent-teams spawner (`teammateMode: auto` in `~/.claude/settings.json`) opens iTerm2 splits, and this
  session runs in a Herdr pane. For fresh-context subagents use headless
  `command claude -p "<brief>" --model <tier> --allowedTools "Read,Glob,Grep,..."` writing to a file,
  or a Herdr pane via `herdr agent start`.
- **2026-09-02** — Port 5173 (and fallback 5190) are held by the Lost Lantern reference app in
  `~/Downloads/finalproject/lost-lantern-studio`. This repo's Vite config must pin 5180 strict; it lands with the skeleton.
- **2026-09-02** — react-resizable-panels v4 is a rewrite; v2 snippets and most LLM recall do not run.
  The Shell2 kit's list is the one to read: `/Users/ryanpederson/Dev/Shell2/shell-widgets/docs/footguns.md`.
- **2026-09-03** — Footgun 24 in that list (a collapse hands its space to the immediate neighbour, and
  `preserve-pixel-size` does not stop it) does not bite the studio cockpit only because every pinned
  or collapsible region sits beside a relative panel (`center` or `main`). Put a second pinned rail
  next to a pinned one and the exemption ends; that is when `holdPixelSizes` / `useRepinPanels` from
  the kit come in, not before.

- **2026-09-03** — Imperative `collapse()`/`expand()`/`resize()` return nothing and fire no `onResize`
  when the group has no slack (every panel already at its minimum). The studio body needs
  nav 160 + center 320 + inspector 200 px plus separators before a toggle can act; narrower than that
  the toolbar buttons do nothing. `usePanelToggle` reads the group back and returns `false` from
  `hide()`/`show()` in that case, so a caller can tell. Raising any minimum raises the threshold.
- **2026-09-03** — Ladle 5.1 builds with its own bundled Vite 6, and `@vitejs/plugin-react` 6 peers on
  Vite 8, so inside Ladle the React plugin does nothing. JSX then follows esbuild's tsconfig lookup,
  and `.ladle/components.tsx` sits outside every project tsconfig: it compiled classic and the built
  stories rendered blank with "React is not defined" while `pnpm stories:build` stayed green. The
  Ladle Vite config names `esbuild.jsx: 'automatic'` for that reason. A green story build is not a
  rendered story; screenshot the built output (`ladle preview`) when stories change.

