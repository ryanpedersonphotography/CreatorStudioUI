# Adversarial correctness review — `/Users/ryanpederson/NewDev/CreatorStudioUI/AGENTS.md`

Reviewer brief: correctness only. Eleven findings, five MATERIAL. Every Herdr command in the file is
valid; every reference-app claim about libraries, docs, port, and surfaces is true. The failures are
concentrated in three places: a false review claim in `STATUS.md`, present-tense assertions about
files that do not exist, and two whole sections of invented policy that carry no assumption label
while their neighbours do.

---

## 1. MATERIAL — `STATUS.md:5` claims a review that had not happened and left no record

> `- AGENTS.md written and reviewed; no code yet.`

`AGENTS.md:94` says the global rules in `~/.claude/CLAUDE.md` "apply in full". Those rules state that
a review is "**On the record.** Reviewer, findings, and disposition get written down — beside the
artifact or in the report. A review that left no trace didn't happen." No such trace exists anywhere
in this repo: `ls -la` shows only `AGENTS.md`, `CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `.gitignore`,
and `references/friction-notes.md`; `friction-notes.md` records two footguns and no findings; there is
no review file and no git history (`git log` → `fatal: your current branch 'main' does not have any
commits yet`). The same global file reserves the word *reviewed* as a citation, not an adjective.
This review is the first pass on the artifact, which makes the claim false at the moment it was
written, and it is the kind of claim a later session will consume as ground truth.

**Proposed replacement:**
```
- AGENTS.md written; adversarial review pending (no findings recorded yet).
```
Once findings exist, replace with a pointer: `- AGENTS.md reviewed <date> — findings and disposition
in references/agents-md-review.md.`

---

## 2. MATERIAL — `AGENTS.md:119-120` asserts a Vite config that does not exist, and names no port

> `- **Port 5173 belongs to the reference app** while it runs from Downloads. This repo's dev server pins`
> `  its own strict port in the Vite config so the two never collide.`

"pins its own strict port in the Vite config" is present indicative about a file in a repo that has
no `apps/`, no `packages/`, and no Vite config — the same file says so at line 49. `references/friction-notes.md:5-6`
states the same fact in the correct modality ("This repo's dev server **must** pin a different strict
port"), so the two siblings disagree on whether this is done or required.

Worse for correctness: no port number is given, which makes the instruction unactionable at the moment
it will be needed. The collision hazard is real — `lsof -nP -iTCP:5173 -sTCP:LISTEN` shows
`node` PID 34450 listening on `127.0.0.1:5173` right now, and `curl` returns `200` from
`http://localhost:5173/`. Note also that the reference app's own `README.md` claims 5190 as its
documented overflow port (`if taken: pnpm dev --port 5190`), so 5190 is not a safe pick either.

**Proposed replacement:**
```
- **Port 5173 belongs to the reference app** while it runs from Downloads, and 5190 is its documented
  fallback. This repo's dev server must pin `port: 5175, strictPort: true` in its Vite config so the
  two can never collide. Not yet configured — it lands with the skeleton milestone.
```

---

## 3. MATERIAL — `AGENTS.md:83` asserts an enforcement guarantee that open question 1's other branch cannot deliver

> `  Apps compose packages; packages never import apps. Enforced by tooling, not by discipline.`

Open question 1 (`AGENTS.md:137-139`) is explicitly unresolved and describes its non-default branch as:
"Versus plain pnpm workspaces — simpler to stand up, but **boundaries hold only by discipline**."
So the Conventions section states as a settled constraint the exact property the file elsewhere says
is contingent on an unanswered decision. An agent reading only "Conventions & constraints" — which is
where a builder will look — will believe boundary enforcement is guaranteed regardless of how Ryan
answers.

**Proposed replacement:**
```
- **A package is a boundary.** Packages import each other only through their public `index.ts`.
  Apps compose packages; packages never import apps. Enforced by tooling if open question 1 resolves
  to Nx (lint tags); by review discipline if it resolves to plain pnpm workspaces.
```

---

## 4. MATERIAL — `AGENTS.md:38-45` "Non-goals" is asserted as settled fact; Ryan specified none of it

Ryan's verbatim intent was: *"build a writer's studio/cockpit UI that uses react/clean coded/reusable/compositional
code practices. we will do it inside of a monorepo that we will build. create a project agents file
around this idea and concept and please note we are doing this inside of a herdr workspace."*

Nothing in that establishes any of the following, all of which are written flat, with no assumption
marker and no entry in *Open questions*:

> `- Not a collaboration or publishing platform. One writer, one machine.`
> `- Not an AI-writes-for-you product. Assistance, if any, is a later door, never the core.`
> `- Not a rebuild of Scrivener, Notion, or Obsidian. Take what is good; do not chase parity.`
> `- No backend or accounts in the near term.`

This is the most load-bearing section in the file — non-goals forbid whole feature classes, and a
builder will treat them as a hard boundary. The contrast with the file's own discipline elsewhere is
the tell: `AGENTS.md:19-20` ("*Assumed from the intent and Ryan's sibling projects…*"), `:24`
("Assumed from the intent."), and `:58` ("Assumed defaults drawn from Ryan's established stack.") are
all correctly labelled. Non-goals got no such marker despite resting on strictly less evidence.

**Proposed replacement — insert after the `## Non-goals` heading:**
```
Assumed, not stated. Ryan named none of these; they are inferred from the "writer's cockpit" framing
and his sibling projects. Any one of them is a single sentence away from being reversed — say so and
it moves.
```

---

## 5. MATERIAL — `AGENTS.md:74-90` "Conventions & constraints" asserts invented policy as fact, including a build-failing gate

The whole section carries no assumption label. Some of it is a fair reading of "clean coded/reusable/compositional".
Several items are not — they are ports from the reference app or fresh inventions, stated as binding rules:

> `- **No raw values.** The token lint fails the build on any raw value outside the token file.`

> `- **Every reusable component ships with** a story, a test, and a one-paragraph README stating what`
> `  it composes and what it deliberately does not do.`

> `- **State stays close.** Local state first; a feature-scoped store when several components share it;`
> `  no global store by default.`

The token-lint rule is the sharpest problem: it commits the project to a build-failing gate, and it is
imported wholesale from the reference app (`scripts/check-tokens.mjs`, per that repo's `README.md`)
rather than derived from anything Ryan said. `AGENTS.md:99-103` correctly labels that app as
"**Reference, not source**" and says "Port ideas deliberately; do not copy code across" — this section
ports its policy without the deliberation the file asks for. The three-artifact rule per component and
the no-global-store rule are likewise unasked-for and unlisted as open questions.

**Proposed replacement — insert after `### Code shape — the part that matters most`:**
```
Ryan asked for "clean coded / reusable / compositional". The specific rules below are this file's
reading of that phrase, several of them ported from the Lost Lantern reference app. Composition,
headless-first, package boundaries, and strict TypeScript are direct restatements of the intent. The
build-failing token lint, the story+test+README requirement per component, and the no-global-store
default are stronger than anything Ryan said — challenge any of them and they change.
```

---

## 6. MINOR — `AGENTS.md:49` "The directory is empty" is false and self-contradicting

> `**Planning, greenfield.** The directory is empty: no code, no monorepo, no git history yet.`

`ls -la /Users/ryanpederson/NewDev/CreatorStudioUI` returns `.git/`, `.gitignore`, `AGENTS.md`,
`CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `references/`. The file contradicts itself twelve lines from
the end: `AGENTS.md:126-128` lists four of those files as living in this directory. "No git history"
is defensible — the repo is initialized on `main` with zero commits — but "the directory is empty" is
not, and a fresh agent that believes it may scaffold over the governing docs.

**Proposed replacement:**
```
**Planning, greenfield.** No code, no monorepo, no packages. Git is initialized on `main` with no
commits yet; the only files present are this one and its siblings (CLAUDE.md, ROADMAP.md, STATUS.md,
references/, .gitignore).
```

---

## 7. MINOR — `AGENTS.md:61` states the monorepo-root decision flat, breaking the cross-reference pattern the same bullet block uses

> `- **Monorepo** — this directory is the root. pnpm workspaces: `apps/` for runnable apps, `packages/``

The very next sentence cross-references its open question — "via Nx (open question 1)" — and line 64
does the same ("(open question 4)"). But "this directory is the root" is stated as fact even though it
is open question 2 (`AGENTS.md:140-141`). The inconsistency is what makes it a defect: a reader who has
learned the file's convention that unmarked claims are settled will read this one as settled.

**Proposed replacement:**
```
- **Monorepo** — this directory is the root (open question 2). pnpm workspaces: `apps/` for runnable
  apps, `packages/` for everything reusable. Task orchestration and package-boundary enforcement via
  Nx (open question 1).
```

---

## 8. MINOR — the Herdr section omits the one prohibition that costs a session if violated, and does not name the skill as authority

`AGENTS.md:105-122` is a correct but partial restatement of `~/.claude/skills/herdr/SKILL.md`. Every
command it quotes is valid (see *Checked and clean*), but it drops the skill's explicit warning:
"Do not run bare `herdr` for discovery; it launches or attaches the TUI." That omission is load-bearing
here specifically because `CLAUDE.md:6-7` routes agents to *this section* — "Read the *Herdr workspace*
section of AGENTS.md before starting any process or splitting any pane" — so an agent may follow the
chain and never read the skill. The skill also states "The installed binary is the authority for
command syntax", which this file should defer to rather than replace.

`AGENTS.md:118` ("Never run `herdr server stop`") is stricter than the skill's conditional wording,
which is fine — stricter is not a contradiction.

**Proposed replacement — add after line 112's `HERDR_ENV` check:**
```
- The `herdr` skill (`~/.claude/skills/herdr/SKILL.md`) and the installed binary are the authority for
  syntax; the commands below are the common cases, not the full surface. Never run bare `herdr` for
  discovery — it launches or attaches the TUI. Print a group's help by running the group alone
  (`herdr pane`, `herdr agent`), and never probe a mutating subcommand by omitting its arguments.
```

---

## 9. MINOR — `ROADMAP.md:8-10` presents open question 5's unanswered default as a settled sequence

> `2. **Write + Arrange** — the manuscript editor surface inside a persisted panel layout.`
> `3. **Structure** — a board and/or map surface bound to the manuscript.`
> `4. **Cast and world** — character, place, and note cards that open beside the text.`

This ordering is exactly open question 5's default (`AGENTS.md:145`: "**Which surfaces ship first.**
**Write + Arrange**, then structure, then cast and world"), but `ROADMAP.md` carries no signal that it
is an unanswered default. The two files are internally consistent on content and inconsistent on
status, and `ROADMAP.md` is the one a builder will open when picking up the next item.

**Proposed replacement — add under `ROADMAP.md:3`:**
```
Items 2-4 follow open question 5's default order in AGENTS.md; Ryan has not ruled on it, and answering
it reorders them.
```

---

## 10. MINOR — `AGENTS.md:7-8` defines the product's success criterion, unlabelled

> `"Great" means a writer opens it, everything is exactly where they left it, and they are writing`
> `within seconds. Nothing on screen competes with the prose for attention until it is asked for.`

A specific, testable definition of success that Ryan did not give. It is a good one and it does real
work (it justifies the layout-persistence requirement at line 26-27), but the North star section has no
assumption marker while three later sections do. Simplest fix is one clause.

**Proposed replacement:**
```
"Great" — assumed, not stated — means a writer opens it, everything is exactly where they left it, and
they are writing within seconds.
```

---

## 11. MINOR — `AGENTS.md:51-54` asserts a milestone definition and a hard build gate as settled

> `**Next milestone — the skeleton stands.** The monorepo scaffold exists, one app boots, one reusable`
> `shell package renders an empty cockpit with resizable panels, and every quality gate (typecheck,`
> `lint, token lint, unit tests, stories build, app build) runs green from the root. Nothing`
> `writer-facing is built before that skeleton has been reviewed.`

A sensible engineering default, but the six-gate list and the "nothing writer-facing before review"
rule are inventions, and the gate list depends on tooling that is itself unresolved (the token lint is
finding 5; "stories build" presumes Ladle, an assumed default from line 71-72). It is now duplicated
into `ROADMAP.md:5-7`, so it has become ground truth in two files without ever being labelled.

**Proposed replacement — append to the paragraph:**
```
The gate list assumes the tooling defaults under *How it's built*; it shrinks if those change.
```

---

# Checked and clean

Each of these was run or read and produced no finding.

**Herdr — command syntax, verified against both the skill and the live binary**

- `HERDR_ENV` is `1` in this session; `herdr` resolves to `/opt/homebrew/bin/herdr`. `AGENTS.md:112`'s
  guard `test "${HERDR_ENV:-}" = 1` is character-for-character the skill's check at
  `~/.claude/skills/herdr/SKILL.md:13`.
- `herdr --help` — confirms the top-level groups `workspace`, `tab`, `pane`, `agent`, `worktree`,
  `session`, `notification`, `integration` exist as the skill and `AGENTS.md` assume. I did not run
  bare `herdr`, and ran no mutating command.
- `herdr pane` — `AGENTS.md:116` `herdr pane split --current --direction right --cwd "$PWD" --no-focus`
  matches the live signature `herdr pane split [<pane_id>|--pane ID|--current] --direction right|down
  [--ratio FLOAT] [--cwd PATH] … [--focus] [--no-focus]`. Every flag used exists.
- `herdr pane` — `AGENTS.md:117` `herdr pane run <id> "pnpm dev"` matches `herdr pane run <pane_id> <command>`.
- `herdr pane` — `AGENTS.md:117` `herdr pane read <id> --source recent-unwrapped --lines 120` matches
  `herdr pane read <pane_id> [--source visible|recent|recent-unwrapped] [--lines N] …`; `recent-unwrapped`
  is a real source value, and the skill recommends it for logs (SKILL.md:178).
- `AGENTS.md:116`'s "read the new pane id from `.result.pane.pane_id`" matches SKILL.md:88 and :106
  verbatim.
- `herdr workspace` — `herdr workspace close <workspace_id>` exists, so `AGENTS.md:118`'s prohibition on
  closing workspaces you did not create refers to a real capability, and matches SKILL.md:192.
- `herdr agent` — checked for any claim in `AGENTS.md` about agent commands. There are none, so nothing
  to contradict; the file confines itself to pane commands, which is correct for "run a dev server".
- `herdr workspace list` — the workspace labelled `CreatorStudioUI` has `workspace_id: "wC"` and is the
  focused one. `AGENTS.md:109`'s "`wC` at the time of writing" is **true**, and its caveat "always read
  IDs from `herdr` JSON output, never assume them" matches SKILL.md:191. Confirmed independently against
  the injected caller context: `HERDR_WORKSPACE_ID=wC`, `HERDR_TAB_ID=wC:t1`, `HERDR_PANE_ID=wC:p1`.
- `AGENTS.md:121`'s "Other workspaces on this machine (story-engine, Creator-World)" — `workspace list`
  returns labels `story-engine-v1` (`w2`), `Creator-World-GoLang` (`wA`), `story-engine-v2` (`wB`).
  Accurate.

**Reference app — `/Users/ryanpederson/Downloads/finalproject/lost-lantern-studio`**

- `package.json` dependencies vs `AGENTS.md:63-72`: `react ^19.2.0` ✓ · `react-resizable-panels ^4.12.2`
  ✓ (v4 as claimed) · `@handlewithcare/react-prosemirror ^3.2.7` ✓ with the `prosemirror-*` family ✓ ·
  `@ark-ui/react ^5.39.0` and seven `@radix-ui/react-*` packages ✓ (the "Radix / Ark UI" claim at line 68)
  · `tailwindcss ^4.3.3` + `@tailwindcss/vite` ✓ (Tailwind v4) · `vite ^7.1.0` ✓ · `typescript ^5.9.0` ✓.
- `docs/footguns.md` — **exists**, 29,726 bytes. `docs/mental-model.md` — **exists**, 13,834 bytes.
  Both paths in `AGENTS.md:101-102` resolve.
- `vite.config.ts` — `server: { port: 5173, strictPort: true }`. The port claim in `AGENTS.md:119` and
  `friction-notes.md:5-6` is **true and strict**.
- Port occupancy independently confirmed live: `lsof -nP -iTCP:5173 -sTCP:LISTEN` → `node` PID 34450 on
  `127.0.0.1:5173`; `curl http://localhost:5173/` → `200`. `friction-notes.md:5`'s present-tense claim
  holds right now.
- "Board / Map / Draft surfaces" (`AGENTS.md:100`) — `README.md:5-8` reads "three swappable working
  surfaces (kanban **Board**, React Flow **Map**, ProseMirror **Draft**)". `src/studio/README.md` exists
  (11,646 bytes) and describes the same three. **Accurate.**
- "single-token-file design system" (`AGENTS.md:100`) — `README.md` names `src/styles/tokens.css` as
  "The only file allowed to hold a raw value", enforced by `scripts/check-tokens.mjs`. Accurate.
- `AGENTS.md:66`'s v4 API names `Group` / `Panel` / `Separator` — verified against the *installed*
  package, not the docs: `node_modules/react-resizable-panels/package.json` reports `"version": "4.12.2"`,
  and its `dist/*.d.ts` declares `Group`, `Panel`, `Separator`, `useDefaultLayout`, `usePanelRef`,
  `useGroupRef`. Reference source imports match (`src/shell/AppShell.tsx:2`, `src/shell/ShellSeparator.tsx:1`).
- `AGENTS.md:66`'s "v2 snippets do not run" — `docs/footguns.md:10,21` documents exactly this
  (`PanelGroup is not exported`; "If you see `PanelGroup`, `PanelResizeHandle`, `direction=`, `autoSaveId=`").
  `friction-notes.md:7-8` states the same. Consistent across all three.

**Registry**

- `grep 'creator-studio-ui' ~/.claude/PROJECT_REGISTRY.md` → heading at line 7, `**Path:** /Users/ryanpederson/NewDev/CreatorStudioUI`
  at line 10. **Slug and path both match `AGENTS.md:130`.**
- `proj get creator-studio-ui` → returns `creator-studio-ui — CreatorStudioUI`, `status: active`,
  `stage: planning`, `path: /Users/ryanpederson/NewDev/CreatorStudioUI`. The command form quoted in
  `AGENTS.md:130` is valid: `proj --help` lists `get` under top-level project, and `proj get --help`
  confirms the positional signature `proj get <slug>`. The registry's `stage: planning` agrees with
  `AGENTS.md:49` and `STATUS.md:3`.

**Global-rule compatibility — `~/.claude/CLAUDE.md`**

- `AGENTS.md:94-95`'s summary ("review gate, verification, `trash` not `rm`, no time estimates") — all
  four are real sections of the global file, stated accurately, none inverted.
- Searched `AGENTS.md` for anything the global file forbids: no `rm`/`rmdir` instruction, no time or
  effort estimate anywhere (`ROADMAP.md` is correctly ordered-not-scheduled), no schemeless URL (the
  only URL-shaped strings are filesystem paths).
- Persistent-notes routing (global: lessons → `references/friction-notes.md`, planned work → `ROADMAP.md`,
  current state → `STATUS.md`, conventions → `AGENTS.md`/`CLAUDE.md`) matches `AGENTS.md:126-128` exactly,
  and all four files exist at those paths.
- Registry discipline (global: never hand-edit the markdown; use `proj`) — `AGENTS.md:130` quotes only
  a read command. Compliant.

**Other**

- `~/.claude/projects/-Users-ryanpederson-NewDev-CreatorStudioUI/` — directory **exists**, so the
  transcript path at `AGENTS.md:131` resolves.
- `CLAUDE.md` (all 8 lines) checked against `AGENTS.md`: it claims only that sessions run in a Herdr
  pane with `HERDR_ENV=1` (**true**, verified above), points at the Herdr section (which exists at
  `AGENTS.md:105`), and points at the global rules. No contradiction with `AGENTS.md` beyond the
  routing gap noted in finding 8.
- `ROADMAP.md:5-7` item 1 vs `AGENTS.md:51-54`: the skeleton description and the "reviewed before
  anything writer-facing" gate match between the two files. Consistent (the shared status-labelling
  problem is finding 11, not a divergence).
- `STATUS.md:3` "Stage: Planning, greenfield" vs `AGENTS.md:49` and the registry's `stage: planning` —
  all three agree.
- `STATUS.md:6` "Open decisions are listed at the bottom of AGENTS.md with their defaults" — true;
  `AGENTS.md:133-145` is the last section and every one of the five questions names a bold default.
- `AGENTS.md` open questions cross-referenced against the body: OQ1 ↔ line 62 ✓ present, OQ4 ↔ line 64
  ✓ present, OQ3 ↔ line 34-35 ✓ present ("The storage format is an open question below"), OQ5 ↔ no body
  cross-ref but no conflicting body assertion either. Only OQ2 lacks its cross-reference — finding 7.
