# CreatorStudioUI — a writer's cockpit: one screen that keeps the whole work in view and in reach

## North star

A writer's cockpit: manuscript, plan, cast, and notes on one screen, arranged the way the writer
thinks, never more than a gesture away. Open it and you are writing within seconds; nothing on
screen competes with the prose until it is asked for.

The code is a product too: small, composable, reusable parts that another package or another agent
can pick up without reading the whole repo. A component that only works in one place is a defect.

## Who it's for

Ryan first; long-form fiction writers second (novelists, serial writers). *Assumed from the intent
and sibling projects — Lost Lantern, story-engine, Creator-World.*

## Core experiences

*Assumed from the intent. Reorder, cut, or add.*

- **Arrange the cockpit** — resize, collapse, swap, and pin panels; the layout comes back exactly as left.
- **Write** — a focused manuscript editor: chapters and scenes, distraction-free mode, comfortable typography.
- **See the shape** — a structure surface (board and/or map) beside the prose and bound to it.
- **Keep the cast and world in reach** — characters, places, and notes as cards that open beside the text.
- **Never lose work** — local-first, saved as it happens.
- **Switch appearance** — system / light / dark from one token set.

## Non-goals

*Assumed, not stated by Ryan — one sentence reverses any of these.* Not collaborative, not a
publishing platform, not AI-writes-for-you, not a Scrivener / Notion / Obsidian clone. No backend of
its own: the UI is the product and backends plug in behind ports (see *How it's built*).

## Stage

**Cockpit stands (2026-09-03).** `apps/studio` boots on port 5180 and composes the writer's cockpit:
five regions from three nested cockpits (top shelf, navigation, manuscript surface, context shelf,
inspector), with a rail or strip state on every edge (nothing vanishes), a pinned top shelf, and sidebars that hold their width when the
window resizes. Layout persists through the `contracts` port and the `adapters/local` adapter, proven
by `pnpm verify:ui` (a Playwright harness against the dev server or, with `--preview`, the built
bundle); `packages/tokens` holds the design tokens; `pnpm verify` is green from the root.

**Next milestone — Write:** the manuscript editor surface inside the cockpit. Nothing writer-facing
lands without the two-reviewer gate.

## How it's built

The front end is the product; stack choices below are provisional and the backend is deliberately
undecided. Challenge any of them.

- **Backend-agnostic by construction.** UI packages never import a backend SDK. Data flows through
  typed ports in `packages/contracts`; adapters in `packages/adapters/*` implement them; only
  `apps/studio` wires an adapter to a port. The skeleton ships `adapters/local` (in-memory +
  localStorage). Boundary tags enforce it: `type:ui` and `type:feature` may not depend on `type:adapter`.
- **Monorepo** — this directory is the root (open question 3). pnpm workspaces + Nx with inferred
  targets; package boundaries enforced by `@nx/enforce-module-boundaries` with type tags
  (`type:app` · `type:feature` · `type:ui` · `type:contract` · `type:adapter` · `type:util`).
  Node 22 LTS, pnpm 11 — pinned via `packageManager` and `engines` in the root `package.json`.
- **Names** — scope `@creator-studio/*`; directory name = package name (`packages/shell` →
  `@creator-studio/shell`). The app is `apps/studio`.
- **App** — React 19 + TypeScript strict + Vite + Tailwind v4. Vite pins `port: 5180, strictPort: true`
  (5173 and its fallback 5190 belong to the reference app). Browser first; Electron is a later door.
- **Shell** — react-resizable-panels v4. Import the library's panel as
  `import { Panel as ResizablePanel } from "react-resizable-panels"` so our own `Panel` compound stays
  free. Layout state is serialised by the library and written through the `LayoutStore` port under
  `cs:layout:<projectId>:<group>`; the shell strips the library's own key prefix so the store never
  learns which library is underneath.
- **Editor** — ProseMirror via `@handlewithcare/react-prosemirror`. Not in the skeleton.
- **Primitives** — Ark UI by default; Radix only where Ark has no equivalent, with a one-line
  comment beside the import saying why.
- **Styling** — every design value lives in `packages/tokens`: CSS in `src/tokens.css` (`--cs-p-*`
  primitives, `--cs-*` semantics, an `@theme inline` bridge into Tailwind utilities) and typed lengths
  such as `cockpitSizes` in `src/lib/sizes.ts`. `pnpm lint:tokens` (ported from the reference app)
  fails on any raw colour or length anywhere else. Panel sizes always carry a unit.
- **State** — local first. When components in one feature share state: a React context + reducer
  colocated with the feature, exported from its `index.ts`. No global store.
- **Stories and tests** — Ladle from `.ladle/` at the root across all packages; Vitest + Testing
  Library for units, with the shared `tools/src/vitest/setup.ts` (jsdom lacks `ResizeObserver`);
  the Playwright harness `tools/src/verify/cockpit.mjs` against the running app or the built bundle.

## Conventions

This section is this file's reading of "clean coded / reusable / compositional", several rules
ported from the reference app. The gate list assumes the tooling under *How it's built* and shrinks if
that changes. Challenge any rule here the same way.

**Enforced — a gate fails the build.** `pnpm verify` runs, from the root and in order:
`typecheck · lint · lint:tokens · test · stories:build · build · verify:ui --preview` (the last is the browser harness against the built bundle). Boundaries: packages import each
other only through `index.ts`, and never import apps (the matrix lives in the root
`eslint.config.mjs`; a `type:ui` file importing an adapter fails lint). No raw values outside the
token package. TS strict, no `any`. Every export from a package's `index.ts` has a test; every component export
also has a story.
After adding or removing a project, run `pnpm nx sync` so TS project references follow.

**Reviewed — judgment; cite the line when you flag it.** Composition over configuration: children and
slots, compound components (`Card`, `Card.Header`, `Card.Body`), not boolean-prop piles. Headless
first: behaviour in hooks, appearance in thin wrappers. State stays close. One component, one file,
one job. Exported props are named `<Component>Props`.

**Reference, not source.** The Lost Lantern studio at
`/Users/ryanpederson/Downloads/finalproject/lost-lantern-studio` — Board / Map / Draft surfaces on a
react-resizable-panels v4 shell with a single token file. Read its `docs/footguns.md` before writing
shell code (v4 is a rewrite; v2 snippets and most LLM recall do not run). Port ideas; do not copy code.
The panel-shell reference is `/Users/ryanpederson/Dev/Shell2/shell-widgets`: `packages/shell/rrp/src`
holds the `AppShell`, toggle hook and separator this cockpit's are ported from, and its
`docs/footguns.md` is the list of panel-library traps to read before touching the shell.

Visual work is proven by a Playwright screenshot at a stated path. The global rules in
`~/.claude/CLAUDE.md` apply in full.

## Herdr workspace

Development happens inside Herdr, a terminal multiplexer of workspaces, tabs, and panes that
recognises the agents running in them. This project's workspace is labelled `CreatorStudioUI`
(id `wC` today — always read IDs from `herdr` JSON). The skill at `~/.claude/skills/herdr/SKILL.md`
is the authority; the essentials:

- Never run bare `herdr` — it launches or attaches the TUI. Print a group's help by running the group
  alone (`herdr pane`, `herdr agent`); never probe a mutating subcommand by omitting its arguments,
  because several execute with defaults.
- Guard first: `test "${HERDR_ENV:-}" = 1`. If it fails you are outside Herdr — say so and stop.
- Long-running processes (dev server, test watcher, Ladle) get their own pane. Check geometry with
  `herdr pane layout --pane "$HERDR_PANE_ID"`; split a wide pane `right`, a tall one `down`, never the
  same direction twice: `herdr pane split --current --direction <dir> --cwd "$PWD" --no-focus`, then
  read the id from `.result.pane.pane_id`. A third background process goes in a new tab
  (`herdr tab create --cwd "$PWD" --no-focus`), not a third column.
- Start and confirm: `herdr pane run <id> "pnpm dev"` →
  `herdr pane wait-output <id> --match "Local:" --timeout 60000` →
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:5180`. On timeout, read the pane before
  assuming failure: `herdr pane read <id> --source recent-unwrapped --lines 120`.
- Only type into panes you created. Check `herdr pane list --workspace "$HERDR_WORKSPACE_ID"` and
  `herdr agent list` before targeting anything else. Never close what you did not create; never run
  `herdr server stop`. Other workspaces (story-engine, Creator-World) are other projects.

## Where things live

`AGENTS.md` (this file) · `CLAUDE.md` (pointer) · `apps/studio` (composition root: the one place an
adapter meets a port) · `packages/{contracts,shell,tokens}` · `packages/adapters/local` ·
`tools/src/lint/check-tokens.mjs` · `tools/src/verify/` · `.ladle/` · `screenshots/` (untracked proof) ·
`references/friction-notes.md` (footguns that must survive sessions) · `references/reviews/`
(review-gate records) · registry entry
`~/.claude/scripts/proj/bin/proj get creator-studio-ui` · transcripts
`~/.claude/projects/-Users-ryanpederson-NewDev-CreatorStudioUI/` · reference app
`/Users/ryanpederson/Downloads/finalproject/lost-lantern-studio` (read `docs/footguns.md` and
`docs/mental-model.md` before shell or token code).

No `STATUS.md` or `ROADMAP.md` here on purpose: *Stage* is the current state and *Open questions*
holds the unsettled order. Do not create them — duplicated ground truth is what the 2026-09-02 review
caught.

## Open questions

Bold is the default that gets built if unanswered.

1. **First real backend adapter** — undecided on purpose; `adapters/local` carries the MVP. Candidates
   when the time comes: plain files in a project folder, a local database, a remote service.
2. **Surface order** — **Write + Arrange**, then structure, then cast and world.
3. **Is this directory the monorepo root**, or one package inside a wider Creator Studio monorepo
   later? **Default: root.**
