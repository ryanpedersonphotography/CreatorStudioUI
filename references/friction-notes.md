# Friction notes

Footguns and lessons that must survive between sessions. Add to the top; never delete.

- **2026-09-04** — `pnpm nx g @nx/react:library` takes the *directory* as its positional argument
  (`nx g @nx/react:library [directory]`); pass the project name separately
  (`--directory=packages/menubar --name=menubar --importPath=@creator-studio/menubar`). A name in
  the positional slot plus `--directory` sets two directories. With `--component=false` the
  generator forces `style: none`, so `--style=css` is inert; it still writes `.babelrc` and a Jest
  README stub that no sibling package keeps, and an empty `src/index.ts` that `isolatedModules`
  rejects until it says `export {};`.
- **2026-09-04** — Under Vitest's jsdom environment `import.meta.url` is a `file:` URL but the
  global `URL` is the environment's: `new URL('../../package.json', import.meta.url)` resolves
  to `http:` and `node:fs` throws "The URL must be of scheme file". Specs that read files use
  `resolve(import.meta.dirname, …)` (see `packages/menubar/src/lib/manifest.spec.ts`).
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
  `collapse()`/`expand()` in that case, so a caller can tell. Raising any minimum raises the threshold.
- **2026-09-03** — Ladle 5.1 builds with its own bundled Vite 6, and `@vitejs/plugin-react` 6 peers on
  Vite 8, so inside Ladle the React plugin does nothing. JSX then follows esbuild's tsconfig lookup,
  and `.ladle/components.tsx` sits outside every project tsconfig: it compiled classic and the built
  stories rendered blank with "React is not defined" while `pnpm stories:build` stayed green. The
  Ladle Vite config names `esbuild.jsx: 'automatic'` for that reason. A green story build is not a
  rendered story; screenshot the built output (`ladle preview`) when stories change.
- **2026-09-04** — On mount the panel library validates a *stored* layout (percentages) against
  constraints derived from the *current* group size, without the pixel correction it applies on live
  resizes. Any collapsible panel whose stored share lands under `(collapsedSize + minSize) / 2` at the
  new size mounts collapsed: a pinned 48px shelf stored as 5.3% of a 900px window on any window under
  ~750px, a nav dragged to its 160px minimum at 1440px (11.1%) on any window under ~935px. Live
  resizing never shows it, and a rail-sized `collapsedSize` raises every midpoint, which is what
  exposed it. Two fixes: the root group is session-only (`Cockpit` without a `store`), and the
  persisted regions remember whether the user collapsed them under `cs:collapsed:<project>:<panel>`
  (`CollapsedMemory` on `usePanelToggle`), reconciled on mount and only ever reopening. That memory
  records intent only: the toggles, and layout changes the library attributes to the user
  (`onLayoutChanged`'s `isUserInteraction`, relayed by the cockpit as `onUserLayout`). Never
  `onResize`: it also fires when a window squeeze rails the nav below ~700px wide, and recording that
  as a collapse made the squeeze permanent (reviewer D). The rule tightened again under reviewer F:
  a user layout change (drag, separator key, double-click reset) records **only a reopen**, never a
  collapse. A collapse reached that way is either a panel's own drag — sizing, not a deliberate hide
  — or a *neighbour's* growth railing this panel on a narrow window (a nav reset at 600px wide rails
  the inspector); recording the neighbour's squeeze as intent made a panel the user never touched a
  permanent rail. Only the toolbar toggle (`collapse()`) records a hide, and only when it acted — a
  failed expand records nothing either, so a window-caused rail the user tried and failed to reopen
  does not become permanent (reviewer G, F1a). The cost, recorded as a decision (Ryan's to overrule):
  a layout the user *drags or keys* into — shutting a panel by dragging its edge or a neighbour's, or
  arrow-keying a separator — is not remembered. On the next mount, at any window size including the
  same one, the shut panel reopens at its minimum and the neighbour it made room for snaps back. Only
  a control collapse persists. The door if that is too much: attribute a drag to the panel whose
  separator the user held so its own drag-collapse records while a collateral squeeze does not — more
  plumbing, not taken. The library's `onlySaveAfterUserInteractions` would keep the degraded share
  but stop saving toggle collapses, which the bit would then have to restore on mount; also not
  taken. The harness seeds the clamp cases (§5b shelf at 740px tall, §5c nav at 900px wide), the
  squeeze (§1b) and the collateral reset (§6a′ nav reset at 600px railing the inspector).
- **2026-09-04** — A control that unmounts itself on activation (a toolbar button that collapses the
  shelf it lives in; an expand button inside a rail) drops keyboard focus to the document. The preset
  wraps each toggle so that when focus was inside the region at the call, it moves to the new
  content's first control, or its landmark. Harness §8c holds the four transitions.

- **2026-09-04** — Reviewer agents "jacked the screen": not Playwright (`playwright-cli open` is
  headless by default) but Ladle. `ladle serve` and `ladle preview` call their own `openBrowser`
  unless Vite's `server.open` / `preview.open` is `false` or `"none"`, so every reviewer that started
  Ladle opened a tab in the user's Chrome. `.ladle/vite.config.mts` now sets both to `false`; agents
  that start any server also export `BROWSER=none`, which Ladle's opener honours.
