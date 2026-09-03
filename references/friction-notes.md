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
  The reference app's `docs/footguns.md` is the list.
