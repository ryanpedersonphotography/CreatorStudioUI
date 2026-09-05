# Friction notes

Footguns and lessons that must survive between sessions. Add to the top; never delete.

- **2026-09-04** — **Dated constraint: Reset layout reloads the page.** The panel library reads a
  stored layout only at mount, so `View › Reset layout` removes this project's two layout keys and
  three collapsed bits and calls `location.reload()`. That is acceptable only while nothing on the
  page holds unsaved state. **Before the editor holds a draft, it must become a live reset** (the
  shell re-keys or re-mounts its groups) or it violates *Never lose work*. `layoutKeys()` in
  `apps/studio/src/app/studio-commands.ts` is the list to keep in step if a panel ever renders
  conditionally (a suffixed layout key would appear).
- **2026-09-04** — Menus portal to `document.body` because every cockpit panel is
  `overflow-hidden` (`packages/shell/src/lib/cockpit.tsx`); a dropdown rendered in place is clipped
  to the 48px shelf. Two consequences: the skin's contract properties must be declared on `:root`
  (a portaled menu inherits from `body`, not from the bar), and the focus handoff cannot use
  `#top.contains(activeElement)` alone — the studio's dropdowns carry `data-region="top"` and the
  handoff checks `activeElement.closest('[data-region]')`.
- **2026-09-04** — Radix menus in jsdom: `Element.prototype` lacks `scrollIntoView`,
  `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, all of which Radix calls;
  `tools/src/vitest/setup.ts` stubs them. A submenu cannot be *clicked* into in jsdom: leaving the
  sub-trigger row with no geometry has no grace area to cross, so Radix closes the submenu before
  the click lands — open it with ArrowRight and choose with Enter. Radix's default Escape inside a
  submenu closes the whole bar; `Menubar.Sub` overrides it to close one level (APG), so the
  package spec asserts that, not the Radix default.
- **2026-09-04** — react-resizable-panels registers a capture-phase `pointerdown` on the document
  that hit-tests every separator and, when one is under the pointer, focuses it and prevents the
  default. jsdom rects are all zero, so every separator is under every click and a Radix trigger
  (which yields to a prevented event) never opens inside the real cockpit. App-level specs open
  menus by keyboard (`focus()` + Enter); pointer flows are proven in the package spec and the
  browser harness. Radix's roving focus moves on a `setTimeout`, so a harness sleeps ~100ms after an
  arrow key before reading `activeElement`; a hover-open timer (100ms) started by the click's own
  pointer move can reopen a submenu closed within that window — wait it out before pressing Escape.
- **2026-09-04** — pnpm appends script arguments only to the *last* command of a `&&` chain, so
  `pnpm verify:ui --preview` inside `pnpm verify` reached only the final harness. `verify:ui` is now
  one command, `node tools/src/verify/all.mjs`, which runs every harness under one browser.
- **2026-09-04** — Region shortcuts are ⌃⌘B / ⌃⌘J / ⌃⌘I / ⌃⌘T, deliberately not VS Code's ⌘B
  family: the Write milestone's prose editor needs ⌘B and ⌘I for bold and italic, and a shortcut
  shipped now that the editor must break is worse than one that differs now. Headless Chromium has
  no browser chrome, so the harness proves the bindings reach the page, not that Chrome on macOS
  lets them through — that is a manual check in Ryan's own browser. The bindings live in
  `StudioShortcuts`, rendered by the preset outside every panel, so a collapsed top shelf does not
  take the keyboard with it.

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

- **2026-09-04** — A custom property declared on `:root` cannot read a variable an element sets on
  itself. `var()` resolves where the declaring rule applies, so `--_mb-max-h:
  var(--radix-menubar-content-available-height, 80vh)` in the menubar's `:root` contract block
  only ever saw the fallback, and every menu got `80vh` (785px at the design viewport) instead of
  the space Radix measured under its title (reviewers A and B, code review). Anything Radix or
  floating-ui sets inline on the floating element (`--radix-*-available-height/width`,
  `--radix-*-transform-origin`) has to be read in the rule for that element, `token-ok`'d there.
  The harness now asserts the computed cap is not the fallback.
- **2026-09-04** — Two AA misses in the tokens, both caught by review, not by the harness that
  existed. Text on the accent fill: `--cs-surface` on `--cs-accent` was 3.49:1 in the light theme;
  `--cs-on-accent` (night in both themes) is the token for it, 5.31:1 light and 7.30:1 dark. Muted
  ink: `--cs-p-ash` at 62% lightness was 3.55:1 on white, so every muted label, shortcut hint and
  heading failed in the light theme; it is 50% now (5.85 on white, 5.51 on paper, 4.90 on linen).
  The menubar harness measures the highlighted row, a muted shortcut and a group heading in both
  themes from their computed colours (canvas readback turns oklch into RGB; the probe walks up to
  the nearest painted ancestor for the background, because a transparent one reads as black and
  passes anything). Measure a new text/surface pair before shipping it; the harness's `contrast()`
  is the tool.
- **2026-09-04** — Mutating a CSS file and running a harness against the running dev server in the
  same breath can test the *old* CSS: the first page load beat Vite's file watcher, and the
  mutation looked green. Give the watcher a second (`sleep 2`) after the edit, and grep the file
  to confirm the mutation landed, before trusting a red-or-green from the dev server.

- **2026-09-04** — Ladle 5's documented story-loaded signal photographs the spinner. The visual
  snapshot recipe waits on `[data-storyloaded]`, but in 5.1.1 the attribute is on `<html>` from
  about 50ms while the loading ring is still in the DOM until about 380ms (sampled every 50ms on
  the built preview), so `toHaveScreenshot` captured a blank page with the ring. The mount signal
  that holds is the ring leaving: `locator('.ladle-ring').waitFor({ state: 'detached' })`, then a
  child under `#ladle-root`. `tools/src/visual/stories.visual.mts` does that.
- **2026-09-04** — A push made with the workflow's own `GITHUB_TOKEN` does not start CI by itself.
  The `visual-baselines` job commits regenerated PNGs to the branch it was dispatched on; on an
  already-open pull request that push creates a `pull_request` run that sits at `action_required`
  with no jobs (run 33943368076). `gh api -X POST repos/<owner>/<repo>/actions/runs/<id>/approve`
  releases it (verified on that run), or any push by a person starts a fresh run; a pull request
  opened *after* the dispatch gets its run from the `opened` event, and `gh workflow run CI --ref
  <branch>` works once `ci.yml` is on `main`. A personal token would avoid all of it and was not
  worth a secret.
- **2026-09-04** — `persist-credentials: false` and a treeless checkout (`filter: tree:0`) do not
  mix on a private repo: git fetches trees lazily from the promisor remote, that fetch has no
  credentials once they are dropped, and `nx affected`'s `git diff` dies with "could not read
  Username for 'https://github.com'" (run 33943280968). CI keeps the dropped credentials and
  takes the full clone; the repo is small.
- **2026-09-04** — Ladle stamps `data-theme` on `<html>` from its own `theme` setting, "light" by
  default even under a dark OS preference, and the tokens' dark media rule is
  `:root:not([data-theme='light'])`, so a dark colour-scheme emulation alone renders every story
  light (the first `stories-dark` baselines were byte-identical to the light ones; `menubar--dark` still is, by design: the story sets its own colour scheme on its wrapper). Pass
  `&theme=dark` in the story URL and assert the page's computed `color-scheme`.
- **2026-09-04** — Visual baselines are the runner's rendering, not the Mac's. The UI font stack
  is system fonts, so glyphs differ per OS and Playwright suffixes snapshots `-linux`/`-darwin`.
  Only CI compares (`ignoreSnapshots: !CI`), `*-darwin.png` is gitignored so a local `CI=1` run
  cannot commit Mac images, and the runner is pinned to `ubuntu-24.04` in both workflows because
  moving the image is a baseline change.
- **2026-09-04** — Branch protection is a paid feature on a private personal repository. Creating the
  `main` ruleset returned HTTP 403 "Upgrade to GitHub Pro or make this repository public", so the
  required `verify` check cannot be enforced on this repo as it stands; `.github/ruleset-main.json`
  is the config to apply (`gh api -X POST repos/<owner>/<repo>/rulesets --input .github/ruleset-main.json`)
  the day the plan changes. Until then the gate is advisory, and the merge procedure in the `ci.yml` header (AGENTS.md points at it) is the
  guard. Also: this account's `gh` token cannot read check runs (`gh pr checks` and
  `statusCheckRollup` return 403 on a personal access token), so read CI results with
  `gh run list --branch <branch>` and `gh run view <id>`.
  Applied on 2026-09-05 (ruleset 22338497) when Ryan chose to make the repo public: `verify` is required on
  `main`, a direct push of an untested commit is refused, and pull requests merge with `gh pr merge --auto`.
- **2026-09-04** — A `minHeight: '100%'` wrapper in a Ladle story collapses to its content: `#ladle-root`
  has no definite height in preview mode, so the `Dark` menubar story's "dark page" was a 28px strip
  over 950px of white, and its baseline was 8KB of green that read as dark coverage (reviewer B). Use
  `100dvh` for a story that wants the page, and open a menu (`defaultValue`) when the menu surface is
  the point, or the baseline photographs a closed bar.
