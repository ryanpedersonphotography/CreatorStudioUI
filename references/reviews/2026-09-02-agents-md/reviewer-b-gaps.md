# Adversarial review — `/Users/ryanpederson/NewDev/CreatorStudioUI/AGENTS.md`

Read as a cold agent told: *"stand up the skeleton milestone described in the Stage section."* Verified against `/Users/ryanpederson/.claude/skills/project-kickoff/SKILL.md` ("AGENTS.md shape"), `/Users/ryanpederson/.claude/skills/herdr/SKILL.md`, the four sibling stubs, and the live machine state (`herdr workspace list`, `proj get`, the reference app's `vite.config.ts` and `package.json`).

**Verdict: the file is well-shaped and product-first, but the skeleton milestone as written is not buildable without inventing at least eight decisions, and two of its rules contradict each other.**

---

## 1. MATERIAL — `AGENTS.md:51-52`, `AGENTS.md:61-62` — the milestone names three artifacts and none of them has a name

> "The monorepo scaffold exists, one app boots, one reusable shell package renders an empty cockpit with resizable panels"

> "pnpm workspaces: `apps/` for runnable apps, `packages/` for everything reusable."

**Gap.** The file never states the npm scope prefix, the app directory name, the shell package name, or the product name a user would see. `CreatorStudioUI` is a repo title and `creator-studio-ui` is a registry slug; neither is asserted as the scope.

**Why a builder goes wrong.** Every one of these is baked into import specifiers on day one and is expensive to change once a second package exists. Agent A creates `apps/studio` importing `@creator-studio/shell`; agent B resuming next session creates `packages/cockpit-shell` under `@csui/*`. Both satisfy the file. This is the single highest-probability divergence in the whole document, and it lands at step one of the only milestone.

**Belongs as a stated default, not an open question** — names are cheap and reversible, but only if there is exactly one.

**Proposed addition, under *How it's built*:**
> - **Names.** Scope prefix `@creator-studio/*`. The app is `apps/studio` (package `@creator-studio/studio`); the shell package is `packages/shell` (`@creator-studio/shell`). Every package's directory name is its unscoped package name.

---

## 2. MATERIAL — `AGENTS.md:119-120` — the strict dev port is stated as a rule with no value, in a section a builder writing Vite config will not read

> "**Port 5173 belongs to the reference app** while it runs from Downloads. This repo's dev server pins its own strict port in the Vite config so the two never collide."

**Verified:** `/Users/ryanpederson/Downloads/finalproject/lost-lantern-studio/vite.config.ts` does pin `port: 5173, strictPort: true`. The constraint is real. The value for *this* repo is absent.

**Why a builder goes wrong.** Two failure modes. First, an agent invents a port; the next session invents a different one, and every screenshot path, Playwright command, and `curl` health-check in the friction notes and handoffs drifts. Second — worse — the fact lives under *Herdr workspace*, so an agent writing `apps/studio/vite.config.ts` reads *How it's built*, sees Vite, and never scrolls to line 119. `references/friction-notes.md:5-6` repeats the same constraint and also declines to name a port, so the redundancy resolves nothing.

**Proposed:** name it and move the config half of the rule into *How it's built*:
> - **App** — React 19 + TypeScript (strict) + Vite + Tailwind v4. Dev server pins `port: 5180, strictPort: true` (5173 is held by the reference app; strict so a collision fails loudly instead of silently drifting).

Leave a one-line cross-reference in the Herdr section rather than the rule itself.

---

## 3. MATERIAL — `AGENTS.md:83` vs `AGENTS.md:137-139` — the file contains two rules that cannot both hold

> "**A package is a boundary.** Packages import each other only through their public `index.ts`. Apps compose packages; packages never import apps. Enforced by tooling, not by discipline."

> "Versus plain pnpm workspaces — simpler to stand up, but boundaries hold only by discipline."

**Why a builder goes wrong.** If Ryan answers open question 1 with the non-default, the *Conventions* section still says "enforced by tooling, not by discipline" — an unsatisfiable convention. If he does not answer, the default (Nx) applies, but `AGENTS.md:61-62` hedges it as "(open question 1)", so an agent may reasonably scaffold plain pnpm workspaces first "to keep it simple until Ryan answers" and ship a skeleton whose lint gate cannot enforce the file's most load-bearing structural rule. Either way the milestone's "lint runs green" is satisfied while the boundary rule is silently inert.

**Proposed:** make the enforcement mechanism part of the milestone, not part of the open question. Rewrite `AGENTS.md:83` last sentence to:
> Enforced by Nx `enforce-module-boundaries` with tags (`type:app`, `type:pkg`) plus each package's `exports` field. If open question 1 resolves against Nx, this rule downgrades to a reviewer check and that downgrade gets written into this file — it does not silently lapse.

And drop the "(open question 1)" hedge from `AGENTS.md:62`, since the skeleton cannot be built neutrally with respect to it.

---

## 4. MATERIAL — `AGENTS.md:69-70`, `AGENTS.md:88` — "the token file" and "the token lint" are named as if they exist; neither has a location, format, or implementation

> "**Styling** — one design-token file; no raw colour, spacing, radius, or type values anywhere else; a lint gate enforces it."

> "**No raw values.** The token lint fails the build on any raw value outside the token file."

**Gap.** Where does the file live — `packages/tokens/tokens.css`, or an app-level `src/tokens.css`? What format — Tailwind v4 `@theme` custom properties, or a TS object compiled to CSS? What *is* the lint — an ESLint rule, a Stylelint config, or a script?

**Why a builder goes wrong.** "token lint" is one of six gates the milestone requires green, so the agent must produce a working one. With nothing stated it will write a throwaway regex script, and the token file will land inside the app rather than in a package — which quietly violates `AGENTS.md:82` the moment a second app or package needs tokens.

Prior art exists and the file doesn't point at it: the reference app ships `scripts/check-tokens.mjs` and `pnpm lint:tokens` (verified in its `package.json`).

**Proposed:**
> - **Styling** — Tailwind v4. All design values live in `packages/tokens/src/tokens.css` as `@theme` custom properties; nothing else in the repo may contain a raw colour, spacing, radius, or type value. `pnpm lint:tokens` (port the reference app's `scripts/check-tokens.mjs`, then extend) fails the build on any violation and is part of the skeleton milestone.

---

## 5. MATERIAL — `AGENTS.md:52-54`, `AGENTS.md:96-97` — six quality gates are the milestone's acceptance criterion and none has a command

> "every quality gate (typecheck, lint, token lint, unit tests, stories build, app build) runs green from the root"

> "Quality gates run from the root and are green before anything is called done: typecheck · lint · token lint · unit tests · stories build · app build."

**Why a builder goes wrong.** "Green from the root" is the definition of done for the *entire* first milestone, and it is unverifiable as written: the reviewing agent has no command to run, and the building agent must invent six script names plus decide whether there is an aggregate. Two agents will produce `pnpm test` vs `pnpm test:unit`, `pnpm stories:build` vs `pnpm build:ladle`, and the handoff between them breaks on a typo.

Stating them also resolves a second ambiguity: "stories build from the root" implies Ladle is configured at the root across workspaces, not per-package — which is a real architectural choice the file currently leaves silent.

**Proposed, in *Conventions & constraints → Process*:**
> Root scripts, all runnable from the repo root: `pnpm typecheck` · `pnpm lint` · `pnpm lint:tokens` · `pnpm test` · `pnpm stories:build` · `pnpm build`. `pnpm verify` runs all six in order and is the single command that decides whether a milestone is green.

---

## 6. MATERIAL — `AGENTS.md:66` vs `AGENTS.md:79-80` — `Panel` means two different things, in the first package the agent will write

> "**Shell** — react-resizable-panels v4 (`Group` / `Panel` / `Separator`)."

> "Reach for compound components (`Panel`, `Panel.Header`, `Panel.Body`) before variants."

**Why a builder goes wrong.** These are eight lines and one section apart, and both are about the shell package. The library exports `Panel`; the convention holds up a *different* `Panel` with sub-components as the house example. An agent building `packages/shell` will either shadow the library's export, or write `Panel.Header` expecting react-resizable-panels to provide it, or spend a cycle working out that the file means two things. This is the one collision guaranteed to be hit during the skeleton milestone.

**Proposed:** change the convention's example to a name the shell does not already own —
> Reach for compound components (`Card`, `Card.Header`, `Card.Body`) before variants.

— and, if the shell genuinely wraps the library's `Panel`, state the aliasing convention explicitly: `import { Panel as ResizablePanel } from "react-resizable-panels"`.

---

## 7. MATERIAL — `AGENTS.md:26-27` — layout persistence is a headline experience with no mechanism, and is not in Open questions

> "**Arrange the cockpit** — resize, collapse, swap, and pin panels; the layout persists per project and comes back exactly as left."

**Gap.** Nothing states where layout state is stored. Open question 3 covers **manuscript** storage only ("Plain files in a project folder ... versus a local database") — a builder will plausibly read it as covering all persistence and then block on an unanswered question, or wire layout into a manuscript store that does not exist yet.

Compounding it: the milestone says the shell "renders an empty cockpit with resizable panels" without saying whether persistence is in scope for the skeleton. `react-resizable-panels` v4 offers layout serialization out of the box, so an agent will likely implement *something* — the question is what key and what backing store.

**Proposed** — add to *How it's built* as a stated default (it is cheap and swappable, so it should not consume an open question):
> - **Layout state** — serialized by `react-resizable-panels` and stored in `localStorage` under `cs:layout:<projectId>`, independent of manuscript storage (open question 3). Persistence is **in scope** for the skeleton: the empty cockpit must survive a reload.

---

## 8. MATERIAL — `AGENTS.md:84` — "a feature-scoped store" has no concrete meaning and no library, in a file that names a library for every other layer

> "**State stays close.** Local state first; a feature-scoped store when several components share it; no global store by default. Cross-feature communication goes through explicit, typed contracts."

**Why a builder goes wrong.** Three readings all satisfy this sentence: React Context + `useReducer` per feature; a Zustand store instantiated per feature; Jotai atoms scoped to a feature module. The file names react-resizable-panels, ProseMirror, Radix/Ark, Tailwind, Ladle, Vitest, RTL, Playwright — and then goes silent exactly where the *code-shape* section says the most consequential decisions live. "Explicit, typed contracts" is likewise undefined: a TS interface, an event bus, a props contract?

**Proposed:**
> - **State stays close.** Local state first. When several components in one feature share state, a feature-scoped React context + reducer, colocated with the feature and exported through its `index.ts`; reach for Zustand only when a feature's store outgrows a reducer, and say so in that feature's README. No global store. Cross-feature communication is a typed function or hook exported from a package's `index.ts` — never a shared mutable object.

---

## 9. MATERIAL — `AGENTS.md:76-90` — the Code shape section mixes build-failing gates with reviewer judgment and does not say which is which

Rule-by-rule enforceability, since the brief asks:

| `AGENTS.md` | Rule | Enforceable? |
|---|---|---|
| :78-80 | "Composition over configuration ... Reach for compound components before variants" | **Reviewer only.** No linter can judge "a growing pile of boolean props" — a max-props rule is a crude proxy at best. |
| :81 | "Anything with logic is testable without rendering" | **Aspirational prose.** Nothing can check it. It also cannot fail: any component is "testable without rendering" if you extract enough. |
| :82-83 | "A package is a boundary ... Enforced by tooling" | **Claims enforcement; tool undecided** — see finding 3. |
| :84 | "State stays close" | **Unenforceable as written** — see finding 8. |
| :86-87 | "Every reusable component ships with a story, a test, and a one-paragraph README" | **Mechanically checkable and should be** — but "reusable component" is undefined, and no gate is named. |
| :88 | "No raw values. The token lint fails the build" | **Genuinely enforceable** — but the lint doesn't exist yet (finding 4). |
| :89 | "One component, one file, one job. A file that needs section comments wants to be two files" | **Reviewer only.** A `max-lines` rule is the nearest proxy and would fire on the wrong files. |
| :90 | "TypeScript strict. No `any`; exported props typed and named `<Component>Props`" | **Split.** `strict` + `@typescript-eslint/no-explicit-any` are lintable; the `<Component>Props` naming needs a custom `naming-convention` rule or it is a review item. |

**Why a builder goes wrong.** An agent told "all gates green" will read this section as eight rules and either try to automate the unautomatable (burning the milestone on a bespoke linter for "one job") or assume none of them gate anything and skip the two that do.

**Proposed:** split the section into two labelled halves —

> **Enforced (a gate fails the build):** package boundaries (`pnpm lint`) · no raw values (`pnpm lint:tokens`) · TS strict and no `any` (`pnpm typecheck`, `pnpm lint`) · every component exported from a package's `index.ts` has a story, a test, and a README (`pnpm lint:exports`).
>
> **Reviewed (a human or reviewer agent judges it):** composition over configuration · headless-first · state stays close · one component, one file, one job. A reviewer citing one of these must quote the specific file and line.

Note that this also forces the definition currently missing at `AGENTS.md:86`: **"reusable component" = anything exported from a package's `index.ts`.**

---

## 10. MATERIAL — `AGENTS.md:114-117` — the Herdr section gives one split direction for three long-running processes and no geometry rule

> "Long-running processes (dev server, test watcher, Ladle) belong in a **sibling pane**, not the agent's own pane: `herdr pane split --current --direction right --cwd "$PWD" --no-focus`"

**Verified live:** workspace `wC` currently has `pane_count: 1`. The herdr skill states the rule this section omits — *"Split a wide pane to the right and a narrow or tall pane down. Avoid repeated same-direction splits that create unusably narrow columns or short rows."*

**Why a builder goes wrong.** The sentence itself names **three** processes and supplies exactly one direction. A cold agent starting the skeleton will run `--direction right` three times and end with four unusable columns in Ryan's own workspace — a visible, annoying, user-facing mess that also makes `pane read` output wrap uselessly. This is the most likely concrete wrong action in the section.

**Proposed:**
> Check the caller's geometry first — `herdr pane layout --pane "$HERDR_PANE_ID"` — then split a wide pane `right` and a narrow or tall one `down`. Never repeat the same direction twice; if more than two background processes are needed, put them in a new tab (`herdr tab create`) rather than a third column.

---

## 11. MATERIAL — `AGENTS.md:116-117` — the Herdr section can start a dev server but cannot tell whether it came up

> "then `herdr pane run <id> "pnpm dev"`. Read output with `herdr pane read <id> --source recent-unwrapped --lines 120`."

**Gap.** `herdr pane wait-output` is never mentioned. `pane run` returns immediately; `pane read` a moment later shows an empty pane or a half-printed Vite banner.

**Why a builder goes wrong.** The milestone ends in a running app that must be verified — the file mandates Playwright screenshots at `AGENTS.md:98`, and the global rules require `curl` health-checking the port first. An agent that reads too early concludes the dev server failed and starts debugging a server that was fine, or screenshots a port that isn't listening yet and reports a blank page as a rendering bug. This is a well-known time sink and the primitive that prevents it is one line.

**Proposed:**
> After `pane run`, wait for readiness before reading or screenshotting:
> `herdr pane wait-output <id> --match "Local:" --timeout 60000`
> Then confirm the port independently: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5180`.

---

## 12. MATERIAL — `AGENTS.md:118` — the Herdr section forbids *closing* other people's panes but not *typing into* them

> "Never close panes, tabs, or workspaces you did not create. Never run `herdr server stop`."

**Gap.** Nothing forbids `herdr pane run` against a pane the agent did not create, and `herdr agent` is never mentioned at all.

**Why a builder goes wrong.** An agent that skips the split (or whose split fails) and falls back to "reuse the existing pane" will inject a shell command into a pane that may be hosting Ryan or another Claude session — the herdr skill's warning that a target pane must be "at its interactive prompt, with the shell itself in the foreground and no foreground command, editor, or agent running" appears nowhere here. Non-destructive by intent, destructive in practice: it types into someone's live session.

**Proposed, appended to that bullet:**
> Never run a command in a pane you did not create — another agent or Ryan may occupy it. Check `herdr agent list` and `herdr pane list --workspace "$HERDR_WORKSPACE_ID"` before targeting any pane other than one you just split. Omitting a target entirely is worse: it hits the UI-focused pane, which may belong to another client. Always pass `--current` or an explicit pane id parsed from JSON.

---

## 13. MATERIAL — `STATUS.md:5` — asserts a review that had not happened

> "AGENTS.md written and reviewed; no code yet."

**Why this is wrong, not just premature.** This review is the review, and it is finding twelve material defects. A cold agent reading `STATUS.md` first — which is what `STATUS.md` is for — will treat `AGENTS.md` as settled ground truth and build on gaps 1-9 without questioning them. It also violates the global rule at `~/.claude/CLAUDE.md` that "verification is a citation, not an adjective": *reviewed* is a reserved word used here without naming a reviewer, a date, or a disposition.

**Proposed:**
> - AGENTS.md written; adversarial review in progress (2 independent reviewers per the global review gate). Findings and dispositions land in `references/friction-notes.md` before any scaffolding begins.

---

## 14. MINOR — `AGENTS.md:53-54` — "reviewed" is the milestone's exit condition and is undefined

> "Nothing writer-facing is built before that skeleton has been reviewed."

Reviewed by whom, against what, recorded where? Ryan signing off, or the global gate's two independent reviewer subagents? A builder will pick the cheaper reading.

**Proposed:** "...before that skeleton has passed the global review gate — two independent reviewer agents with divergent briefs, findings and dispositions recorded in `references/friction-notes.md`."

---

## 15. MINOR — `AGENTS.md:51-54` vs `AGENTS.md:26-27` and `ROADMAP.md:5-8` — is a resizable cockpit "writer-facing"?

The skeleton includes "an empty cockpit with resizable panels" (`AGENTS.md:52`); *Core experiences* lists resizing panels as the **Arrange the cockpit** feature (`AGENTS.md:26`); `ROADMAP.md:8` puts "Write + **Arrange**" *after* the skeleton. So the milestone both does and does not include a listed core experience.

**Proposed clarifying clause on `AGENTS.md:52`:** "...renders an empty cockpit: three static placeholder regions with drag-to-resize and persisted sizes, no content, no collapse/swap/pin. Those affordances arrive with **Arrange**."

---

## 16. MINOR — `AGENTS.md:68` — "Radix / Ark UI" names two libraries and picks neither

> "**Primitives** — headless (Radix / Ark UI) underneath our own thin styled components."

The reference app depends on both (verified in its `package.json`: `@ark-ui/react` and seven `@radix-ui/*` packages), so "copy the reference" resolves nothing. Not on the skeleton's critical path — an empty cockpit needs no primitives — which is why this is MINOR rather than MATERIAL, but the first agent to need a popover will decide it permanently and silently.

**Proposed:** either pick one ("Ark UI by default; Radix only where Ark has no equivalent, noted in that component's README"), or move it to Open questions with a default. Do not leave a slash.

---

## 17. MINOR — `AGENTS.md:130` — the registry command is not runnable as written

> "Registry slug: `creator-studio-ui` (`proj get creator-studio-ui`)."

**Verified:** `which proj` → `proj not found`. The binary is at `/Users/ryanpederson/.claude/scripts/proj/bin/proj`, and `/Users/ryanpederson/.claude/scripts/proj/bin/proj get creator-studio-ui` succeeds and returns the registered project (slug, stage `planning`, correct path). The subcommand and slug are right; only the invocation is broken. The global `CLAUDE.md` uses the absolute path.

**Proposed:** "Registry slug: `creator-studio-ui` — `~/.claude/scripts/proj/bin/proj get creator-studio-ui` (not on `PATH`)."

---

## 18. MINOR — `AGENTS.md:94-95` and `CLAUDE.md:8` — the same global-rule list is enumerated three times

> "The global rules in `~/.claude/CLAUDE.md` apply in full: review gate, verification, `trash` not `rm`, no time estimates."

`CLAUDE.md:8` repeats a subset of the same list. A cold agent reads the enumeration and may treat it as *the* set — the global file has a dozen more sections (autonomy, closed-loop execution, handoff thresholds, subagent routing) that the abbreviation quietly implies are optional.

**Proposed:** in `AGENTS.md`, drop the enumeration: "The global rules in `~/.claude/CLAUDE.md` apply in full — read them, they are not summarized here." Delete the duplicate line from `CLAUDE.md:8`, leaving only the pointer.

---

## 19. MINOR — `AGENTS.md:56-72` — no Node or pnpm version is pinned

The machine runs Node v22.22.2 and pnpm 11.22.0 (verified). Nothing states an `engines` field, a `packageManager` field, or a `.nvmrc`. pnpm workspace resolution behavior is version-sensitive, and the reference app's own `pnpm-workspace.yaml` carries a hard-won `overrides` block (duplicate `prosemirror-view` causing a tsc type skew) that this project will hit the moment it adds ProseMirror.

**Proposed, one line under *How it's built*:** "Node 22, pnpm 11 — pinned via `packageManager` in the root `package.json` and `engines`."

---

## 20. MINOR — `AGENTS.md:61` vs `AGENTS.md:140-141` — the root question is asserted as fact in one place and asked in another

> "**Monorepo** — this directory is the root."

> "2. **Is this directory the monorepo root,** or does the UI later become one package inside a wider Creator Studio monorepo? **Default: this is the root.**"

Consistent in outcome, inconsistent in confidence. Harmless for the skeleton; worth one word.

**Proposed:** "**Monorepo** — this directory is the root (open question 2; the default is to stay the root)."

---

## 21. MINOR — `AGENTS.md:99-103` — the reference-app pointer is filed under *Process*

The "Reference, not source" bullet is an artifact location, not a process rule, and it carries the two most important reading instructions in the file (`docs/footguns.md`, `docs/mental-model.md`) — both of which I confirmed exist. A cold agent scanning *Where things live* for external artifacts will not find it.

**Proposed:** move the bullet to *Where things live*, leaving a one-line "read the reference footguns before shell or token code" in *Process*.

---

# Checked and clean

Each of these I specifically checked and it needs no change.

**Shape compliance against `project-kickoff/SKILL.md:54-85`.** All nine required sections are present, in exactly the prescribed order: North star (`:3`) → Who it's for (`:15`) → Core experiences (`:22`) → Non-goals (`:38`) → Stage (`:47`) → How it's built (`:56`) → Conventions & constraints (`:74`) → Where things live (`:124`) → Open questions (`:133`). Product-first ordering is respected: the first 55 lines contain no stack content, and the title line (`:1`) is the required `# <Project> — <one-line what-it-is>` form. The only misfiled content is findings 2 and 21.

**`CLAUDE.md` thinness.** Matches the skill's template at `SKILL.md:87-92` almost verbatim, adds only harness notes, and correctly directs to AGENTS.md first. Eight lines. No project shape has leaked into it.

**Length and readability.** 145 lines, well under a five-minute read, no wall-of-text sections. Nothing here duplicates the global `CLAUDE.md` except finding 18's rule enumeration.

**Herdr environment gate — `AGENTS.md:112-113`.** `test "${HERDR_ENV:-}" = 1` matches `herdr/SKILL.md:12` exactly, and the instruction to stop on failure matches `SKILL.md:16`. Verified `HERDR_ENV=1` in this session.

**Herdr workspace id — `AGENTS.md:109-110`.** `wC` is currently correct: `herdr workspace list` returns `{"label":"CreatorStudioUI","workspace_id":"wC","focused":true}`. More importantly the file hedges it properly — *"always read IDs from `herdr` JSON output, never assume them"* — which matches `SKILL.md:44` and `SKILL.md:191`. The `.result.pane.pane_id` path at `AGENTS.md:116` matches `SKILL.md:88` and `SKILL.md:106`. The `--source recent-unwrapped` recommendation matches `SKILL.md:178`. `--no-focus` and `--cwd "$PWD"` match `SKILL.md:161`. The section is genuinely not a copy of the skill — it is task-shaped — and its omissions are findings 10-12, not its inclusions.

**Herdr cross-workspace safety — `AGENTS.md:121-122`.** "Other workspaces on this machine (story-engine, Creator-World) are separate projects" is accurate: `herdr workspace list` shows `w2` story-engine-v1, `wA` Creator-World-GoLang, `wB` story-engine-v2. Correctly matches `SKILL.md:192`.

**The reference-app path and its docs.** `/Users/ryanpederson/Downloads/finalproject/lost-lantern-studio` exists, and both `docs/footguns.md` (29 KB) and `docs/mental-model.md` (13 KB) exist. The instruction to read them before shell or token code is actionable, and "port ideas deliberately; do not copy code across" is the right posture — the reference is a single-package app (`pnpm-workspace.yaml` declares `packages: []`), so its structure is *not* copyable as a monorepo template. That non-copyability is implied by "reference, not source" and doesn't need spelling out.

**Port-5173 factual claim.** Verified against the reference app's `vite.config.ts`: `port: 5173, strictPort: true`. The constraint is real; only this repo's counterpart value is missing (finding 2).

**Registry registration.** `proj get creator-studio-ui` returns an active project at the correct path, stage `planning`, with goals matching the AGENTS.md milestone. Registration per `SKILL.md:99` was actually done, not just claimed — only the invocation path in the file is wrong (finding 17).

**react-resizable-panels v4 API naming.** `Group` / `Panel` / `Separator` at `AGENTS.md:66` is the correct v4 surface, and the warning that "v2 snippets do not run" is correct and matches `references/friction-notes.md:7-8`. The naming collision (finding 6) is with the *convention example*, not with this line.

**Sibling consistency.** `ROADMAP.md:5-10` matches `AGENTS.md:51-54` (skeleton) and open question 5's default order (Write + Arrange → structure → cast and world) with no contradiction. `references/friction-notes.md` contradicts nothing in AGENTS.md; it under-specifies the same port gap (finding 2) rather than conflicting. `STATUS.md`'s stage and "no code yet" are accurate against the working tree — git is initialized with zero commits and no `apps/` or `packages/` exist. Only the word *reviewed* is wrong (finding 13).

**North star and Non-goals.** Product-first, no stack leakage, and the non-goals are genuinely constraining rather than decorative — "Not a design-system product. The component library exists to serve this studio" (`:43-44`) usefully pre-empts the most likely over-build in a project whose second stated goal is reusability. The audience assumption at `:19-20` is explicitly flagged as assumed and invites correction, which is the right handling for an inferred fact.

**Deliberately fine to leave to the builder** — I checked for these and concluded they need no entry: git branch strategy and commit conventions (the global autonomy rules already cover local commits); test file placement and naming; ESLint config composition; whether Tailwind is imported per-package or once at the app; directory layout inside a package. All are reversible, local, and carry no cross-agent divergence cost.
