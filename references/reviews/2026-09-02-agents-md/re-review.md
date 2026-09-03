The rewrite holds up on most rows, but four claimed or implied fixes don't survive checking — including one new factual error the fix itself introduced.

# Re-review — AGENTS.md rewrite, 2026-09-02

Read-only pass against `disposition.md`, both reviewer files, `AGENTS.md` (123 lines), `CLAUDE.md`, `references/friction-notes.md`, and the live `herdr` binary.

## Resolved

| Finding | Citation in new `AGENTS.md` |
|---|---|
| **A1, B13** — false review claim | `STATUS.md` absent (`ls` → *No such file or directory*); trace exists at `references/reviews/2026-09-02-agents-md/`, committed in `8d92c0c`. |
| **A2, B2** — dev port | `AGENTS.md:52-53` — "Vite pins `port: 5180, strictPort: true` (5173 and its fallback 5190 belong to the reference app)". In *How it's built*, as B2 demanded. |
| **A3, B3** — enforcement vs open question | `AGENTS.md:47-48` — "pnpm workspaces + Nx with inferred targets; package boundaries enforced by `@nx/enforce-module-boundaries` tags (`type:app`, `type:pkg`)". No Nx open question remains (only 3 questions, `:119-123`). The contradiction is gone. |
| **A4** — Non-goals unlabelled | `AGENTS.md:30` — "*Assumed, not stated by Ryan — one sentence reverses any of these.*" |
| **B9** — enforced vs reviewed not split | `AGENTS.md:71` "**Enforced — a gate fails the build.**" / `:76` "**Reviewed — judgment; cite the line when you flag it.**" Split is real. (A5's other half is not — finding 1.) |
| **B1** — no names | `AGENTS.md:50-51` — "scope `@creator-studio/*`; directory name = package name (`packages/shell` → `@creator-studio/shell`). The app is `apps/studio`." |
| **B4** — token file/lint | `AGENTS.md:61-63` — "`packages/tokens/src/tokens.css` as Tailwind v4 `@theme` custom properties. `pnpm lint:tokens` (ported from the reference app's `scripts/check-tokens.mjs`)". |
| **B5** — gates with no commands | `AGENTS.md:71-72` — "`pnpm verify` runs, from the root and in order: `typecheck · lint · lint:tokens · test · stories:build · build`." |
| **B6** — `Panel` collision | `AGENTS.md:54-56` alias `import { Panel as ResizablePanel }`; `:77-78` compound example is now `Card`, `Card.Header`, `Card.Body`. Both halves applied. |
| **B7** — layout persistence | `AGENTS.md:56-57` — "`localStorage` under `cs:layout:<projectId>`, independent of manuscript storage. Persistence ships with the skeleton." |
| **B8** — feature-scoped store | `AGENTS.md:64-65` — "a React context + reducer colocated with the feature, exported from its `index.ts`. No global store." |
| **B10** (geometry half) | `AGENTS.md:97-99` — "Check geometry with `herdr pane layout --pane "$HERDR_PANE_ID"`; split a wide pane `right`, a tall one `down`, never the same direction twice". |
| **B11** — readiness | `AGENTS.md:101-103` — `pane run` → `herdr pane wait-output <id> --match "Local:" --timeout 60000` → `curl … http://localhost:5180`. |
| **B12** — typing into foreign panes | `AGENTS.md:104-106` — "Only type into panes you created. Check `herdr pane list --workspace "$HERDR_WORKSPACE_ID"` and `herdr agent list` before targeting anything else." |
| **A8** (authority half only) | `AGENTS.md:93-94` — "The skill at `~/.claude/skills/herdr/SKILL.md` is the authority". |
| **A6** — "directory is empty" | `AGENTS.md:36` — "**Planning.** Git initialised; governance files only; no code." |
| **A7, B20** — root decision | `AGENTS.md:47` "this directory is the root (open question 3)" ↔ `:122-123` "**Default: root.**" Cross-ref number is correct. |
| **A9** — ROADMAP order settled | `ROADMAP.md` absent; order now at `AGENTS.md:120-121` under "Bold is the default that gets built if unanswered" (`:117`). |
| **B16** — Radix/Ark | `AGENTS.md:59-60` — "Ark UI by default; Radix only where Ark has no equivalent". |
| **B17** — registry command | `AGENTS.md:112` — "`~/.claude/scripts/proj/bin/proj get creator-studio-ui`". |
| **B18** — triple enumeration | `AGENTS.md:87` — "The global rules in `~/.claude/CLAUDE.md` apply in full." No list. `CLAUDE.md` carries no global-rule enumeration either (8 lines, two harness bullets). |
| **B14** (mislabelled as accepted risk) | Actually fixed: `AGENTS.md:40` — "Two-reviewer gate (global rules) before anything writer-facing is built." |

## Not resolved or regressed

**1. MATERIAL — `AGENTS.md:69-87`: the Conventions section still carries no assumption label, and the disposition claims it does.**

The table says of A5/B9: *"Fixed: split into Enforced and Reviewed; whole section marked challengeable."* The split happened; the label did not. `grep -n "Assumed\|Challenge\|not stated"` returns markers at lines 14, 19, 30, 45, 117, 123 — nothing between 69 and 87.

The asymmetry A5 argued from is now **sharper** than in the reviewed draft. *Who it's for* (`:14`), *Core experiences* (`:19`), *Non-goals* (`:30`) and *How it's built* (`:45` — "Defaults chosen from Ryan's established stack. Challenge any of them.") are all labelled. *Conventions* — which now holds the hardest invented rule in the file, `AGENTS.md:74`:

> Every export from a package's `index.ts` has a story and a test.

— is stated flat, under a heading reading "**Enforced — a gate fails the build.**" A builder reads that as binding. Ryan asked for "clean coded/reusable/compositional"; a story-and-test gate per export, and the ported token lint, are considerably more than that.

This also swallows **A11**, whose substance ("the gate list depends on tooling that is itself unresolved") is filed in an accepted-risk row about a different subject and never addressed. `:45` opens the tooling to challenge; nothing tells a reader that `:71-74`'s gate list moves when that tooling does.

*Fix:* insert after `AGENTS.md:69`, matching the voice of `:45`:
> This section is this file's reading of "clean coded / reusable / compositional", several rules ported from the reference app. The gate list assumes the tooling under *How it's built* and shrinks if that changes. Challenge any of it.

**2. MATERIAL — `AGENTS.md:89-106`: A8's load-bearing half is missing — nothing forbids running bare `herdr`.**

The disposition row reduces A8 to "skill authority", which was only half the finding. The skill's actual prohibition, `~/.claude/skills/herdr/SKILL.md:42`:

> Do not run bare `herdr` for discovery; it launches or attaches the TUI. Do not probe a mutating nested command by omitting arguments. Commands such as `herdr workspace create` are valid with defaults and will execute.

Neither sentence appears in `AGENTS.md`. That matters here specifically because `CLAUDE.md:6-7` routes agents to *this section* — "Read the *Herdr workspace* section of AGENTS.md before starting any process or splitting any pane" — so an agent can follow the chain and never open the skill. Worse, `AGENTS.md:93` actively points at the binary — "always read IDs from `herdr` JSON" — which is the exact context in which a cold agent types `herdr` and takes over Ryan's terminal.

*Fix:* append to `AGENTS.md:94`, before the bullets:
> Never run bare `herdr` — it launches or attaches the TUI. Print group help by running the group alone (`herdr pane`, `herdr agent`), and never probe a mutating subcommand by omitting its arguments; several execute with defaults.

**3. MATERIAL — `AGENTS.md:49` pins pnpm 10; this machine runs pnpm 11, and B19 said so.**

> Node 22 LTS, pnpm 10.

Live check: `node --version` → `v22.22.2` ✓, `pnpm --version` → **`11.22.0`**. B19's verified text was "Node 22, pnpm 11" and its proposal repeated it. The fix landed a number contradicting the finding it claims to close. A `packageManager: pnpm@10` pin makes corepack fetch a second pnpm on day one of the milestone — friction at exactly the step B19 was protecting.

B19 also asked for the *mechanism* (`packageManager` + `engines`, optionally `.nvmrc`); `:49` states versions only.

*Fix:* `AGENTS.md:49` → "Node 22 LTS, pnpm 11 — pinned via `packageManager` and `engines` in the root `package.json`."

**4. MATERIAL — `STATUS.md` and `ROADMAP.md` were trashed, and nothing records that this was deliberate — so the global rules will recreate them.**

Both files are gone (confirmed by `ls`), and both fixes depend on their absence (A1, A9). But `~/.claude/CLAUDE.md`'s *Persistent notes* section names them as the fixed homes for current state and planned work, and closes: "**If a repo lacks the file, create it.**" `AGENTS.md:86-87` then says those global rules "apply in full", and *Where things live* (`:110-113`) lists only `AGENTS.md`, `CLAUDE.md`, `friction-notes.md`, `references/reviews/`, the registry and transcripts.

A cold agent obeying the file it was handed recreates both — and reintroduces exactly the duplicated, unlabelled ground truth that A1 and A9 were about. The deletion is sound; the silence about it is the defect.

*Fix:* append to `AGENTS.md:113`:
> No `STATUS.md` or `ROADMAP.md` here on purpose: *Stage* is the current state and *Open questions* holds the unsettled order. Do not create them — duplicated ground truth is what the 2026-09-02 review caught.

**5. MINOR — `AGENTS.md:81-84`: B21 is marked Fixed but the finding is untouched, and a verified pointer was lost.**

The disposition says "moved under Conventions as its own paragraph". It was already inside Conventions (under a *Process* sub-heading); it is now inside Conventions as a paragraph. B21's complaint was the *section*: "A cold agent scanning *Where things live* for external artifacts will not find it." `AGENTS.md:108-113` still lists no external artifact. The reference app remains findable only by reading Conventions to the end.

The rewrite also dropped `docs/mental-model.md`, which B21 named as one of "the two most important reading instructions in the file" and reviewer A verified (13,834 bytes — still present, confirmed just now).

*Fix:* add to *Where things live* (`:113`): "reference app `/Users/ryanpederson/Downloads/finalproject/lost-lantern-studio` — read `docs/footguns.md` and `docs/mental-model.md` before shell or token code", and leave the "Reference, not source" posture paragraph where it is.

**6. MINOR — `AGENTS.md:97-99`: three long-running processes, two permitted directions, no escape hatch.**

> Long-running processes (dev server, test watcher, Ladle) get their own pane. … split a wide pane `right`, a tall one `down`, **never the same direction twice**

The sentence names three processes and then forbids the only way to place the third. B10's proposal supplied the exit — a new tab — and it was dropped. A cold agent hits the wall at process three and either breaks the rule (B10's original four-column mess, in Ryan's own workspace) or improvises.

Verified live: `herdr tab create [--workspace <workspace_id>] [--cwd PATH] [--label TEXT] [--env KEY=VALUE] [--focus] [--no-focus]` exists.

*Fix:* append to `:99` — "if a third background process is needed, put it in a new tab (`herdr tab create --cwd "$PWD" --no-focus`), not a third column."

**7. MINOR — `AGENTS.md:101-103`: the diagnosis command was dropped along with the readiness fix.**

The reviewed draft had `herdr pane read <id> --source recent-unwrapped --lines 120`, which reviewer A verified against the live signature and the skill's log recommendation (SKILL.md:178). The rewrite replaced it with `wait-output` + `curl`. Both are better for the happy path, but when `wait-output` times out at 60s the agent now has no documented way to see *why* — and the file's own visual-QA rule (`:86`) sends it to screenshot a port that may never have opened.

*Fix:* append to `:103` — "On timeout, read the pane before assuming failure: `herdr pane read <id> --source recent-unwrapped --lines 120`."

**8. MINOR — new internal inconsistency: `AGENTS.md:59-60` files an exception in a README that no rule requires.**

> Radix only where Ark has no equivalent, noted in that component's README.

The reviewed draft mandated "a story, a test, and a one-paragraph README" per reusable component. The rewrite's Enforced list (`:74`) is "a story and a test" — README dropped. `grep -n README` returns exactly one hit, `:60`. The one place the file asks you to write something down is the one artifact it no longer asks you to create.

*Fix:* either restore READMEs to `:74`, or change `:60` to "noted beside the import".

**9. MINOR — `references/friction-notes.md:11` asserts a Vite config that does not exist.**

> This repo's Vite config pins 5180 strict.

Present indicative about a repo with no `apps/`, no `packages/`, no Vite config — the modality half of A2, which the fix corrected in `AGENTS.md` (where `:45`'s "Defaults chosen…" reframes the whole section as spec) but not here. Friction notes are read as durable fact.

*Fix:* "This repo's Vite config **must** pin 5180 strict; it lands with the skeleton."

## Accepted risks — judgment

**A10 (North star success criterion): conclusion sound, stated reason false.** The rewrite deleted the explicit "'Great' means…" construction; `:5-10` is now vision prose in vision voice, and a North star that reads as aspiration needs no assumption marker. That alone carries the disposition.

The reason given — *"the file opens every section to challenge"* — is not true of the artifact. Markers exist at `:14`, `:19`, `:30`, `:45`; North star, Stage and Conventions have none. That matters beyond A10, because the same false premise is what makes finding 1 look closed: the table asserts the Conventions section is "marked challengeable" on the strength of a blanket property the file does not have.

**A11 / B14 / B15: two of the three are fine; the third is misfiled.**

- **B14** ("reviewed" undefined) is genuinely *fixed*, not accepted — `:40` cites the two-reviewer gate and `:87` gives the global path. Harmless mislabel.
- **B15** (is an empty cockpit writer-facing?) is defensible. "empty cockpit" at `:39` plus "before anything writer-facing is built" at `:40` bounds it well enough for a MINOR. But the reasoning's word *explicitly* overstates: no line says the skeleton is not writer-facing, and the collapse/swap/pin boundary B15 asked for is still unstated while `:21` lists those affordances under **Arrange**. A builder could reasonably ship collapse with the skeleton. One clause on `:39` would close it.
- **A11** is not judged at all. The row's reasoning speaks only to "reviewed" and writer-facing; A11's actual ask — label the gate list as dependent on assumed tooling — appears nowhere in the disposition or the artifact. It is not an accepted risk, it is an unaddressed finding, and it is the same hole as finding 1.

## Checked and clean

- **Herdr commands, live binary.** `herdr pane` help confirms `pane layout [--pane ID|--current]`, `pane wait-output <pane_id> (--match TEXT | --regex PATTERN) … [--timeout MS]`, `pane list [--workspace <workspace_id>]`, `pane run <pane_id> <command>`, and `pane split [--current] --direction right|down [--cwd PATH] [--no-focus]` — every flag at `AGENTS.md:98-105` exists with that spelling. `herdr agent` help confirms `agent list`. `herdr --help` confirms `herdr server stop` is real, so the prohibition at `:106` names a live capability. I ran no bare `herdr` and no mutating command.
- **`--pane "$HERDR_PANE_ID"` form.** `pane layout` accepts `--pane ID|--current`; the env var is populated in this session, so `:98` runs as written.
- **Open-question cross-references.** `:47` is the only numeric cross-ref in the body and points at question 3 (`:122-123`), which is the root question. No stale numbering survived the renumber from five questions to three.
- **B7's cross-ref hazard.** `:57` says "independent of manuscript storage" without a number — correct, since manuscript storage moved from question 3 to question 1.
- **Name derivation is closed.** `:50-51`'s rule (directory name = package name) plus `apps/studio` yields `@creator-studio/studio` deterministically; no second reading available.
- **`pnpm verify` vs the milestone.** `:40`'s "`pnpm verify` is green" and `:71-72`'s six-task list are the same gate stated once, in two places, consistently. Reviewer A's finding-11 duplication hazard is gone with `ROADMAP.md`.
- **Duplication against `~/.claude/CLAUDE.md`.** Only two restatements remain — `:40` (two-reviewer gate) and `:86` (Playwright screenshot at a stated path). Both are one clause, both are load-bearing locally, neither enumerates the global file. B18's failure mode does not recur.
- **`CLAUDE.md` thinness.** 8 lines, points to AGENTS.md first, adds only harness notes (`HERDR_ENV=1`, the Agent-tool iTerm2 failure). No project shape leaked in. Its Agent-tool claim is backed by `friction-notes.md:5-9`.
- **Reference-app claims still true.** `docs/footguns.md` (29,726 bytes) and `docs/mental-model.md` (13,834 bytes) both exist at the path given at `:82`.
- **Stage accuracy.** `:36` "Git initialised; governance files only; no code" matches the tree: one commit (`8d92c0c`), seven files, no `apps/` or `packages/`.
- **v4 API surface.** `:54` names the library and version and routes to `footguns.md` before shell code; the reviewed draft's `Group`/`Panel`/`Separator` enumeration is gone, but the pointer plus `friction-notes.md:12-13` covers a cold builder adequately. Not a finding.
