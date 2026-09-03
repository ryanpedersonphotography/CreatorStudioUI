# Review gate — AGENTS.md, 2026-09-02

Two independent opus reviewers, headless `claude -p`, read-only tool allowlists, divergent briefs
(A: correctness and grounding; B: gaps and buildability). Raw outputs beside this file.

| Finding | Disposition |
|---|---|
| A1, B13 — STATUS.md claimed a review that had not happened | Fixed: STATUS.md trashed; this record is the trace. |
| A2, B2 — dev port asserted with no value or config | Fixed: 5180 strict, stated in *How it's built*. |
| A3, B3 — "enforced by tooling" vs open question on Nx | Fixed: Nx decided as the default; enforcement named; open question removed. |
| A4 — Non-goals asserted as fact | Fixed: labelled assumed. |
| A5, B9 — conventions asserted as fact; enforced vs reviewed not distinguished | Fixed: split into *Enforced* and *Reviewed*; whole section marked challengeable. |
| B1 — no package or app names | Fixed: `@creator-studio/*`, `apps/studio`, `packages/shell`, `packages/tokens`. |
| B4 — token file and lint had no location or implementation | Fixed: `packages/tokens/src/tokens.css`, `@theme`, lint ported from reference app. |
| B5 — six gates with no commands | Fixed: `pnpm verify` and the six scripts named. |
| B6 — `Panel` name collision with the library | Fixed: alias `ResizablePanel`; compound example now `Card`. |
| B7 — layout persistence had no mechanism | Fixed: localStorage `cs:layout:<projectId>`, in the skeleton. |
| B8 — "feature-scoped store" undefined | Fixed: context + reducer colocated with the feature. |
| B10, B11, B12, A8 — Herdr: geometry, readiness, typing into foreign panes, skill authority | Fixed: all four added. |
| A6 — "directory is empty" false | Fixed. |
| A7, B20 — root decision stated flat and asked | Fixed: default stated with pointer to open question 3. |
| A9 — ROADMAP presented default order as settled | Fixed: ROADMAP.md trashed; order lives in open question 2. |
| B16 — Radix / Ark undecided | Fixed: Ark default, Radix by exception. |
| B17 — registry command not runnable | Fixed: full path. |
| B19 — Node / pnpm unpinned | Fixed: Node 22 LTS, pnpm 10. |
| A10 — success criterion in North star unlabelled | Accepted risk: the North star is a vision statement and the file opens every section to challenge. |
| A11, B14, B15 — "reviewed" undefined; is an empty cockpit writer-facing | Accepted risk: "reviewed" means the global two-reviewer gate, now cited; the skeleton is explicitly not writer-facing. |
| B18 — global rules enumerated in three places | Fixed: CLAUDE.md and AGENTS.md each point once. |
| B21 — reference app filed under Process | Fixed: moved under Conventions as its own paragraph. |

## Re-review round (one opus pass against this table — `re-review.md`)

| Finding | Disposition |
|---|---|
| R1 — Conventions section unlabelled; A11 unaddressed | Fixed: reviewer's sentence inserted verbatim under *Conventions*. |
| R2 — bare `herdr` prohibition missing | Fixed: reviewer's wording added as the first Herdr bullet. |
| R3 — pnpm 10 vs live pnpm 11 | Fixed: pnpm 11, pinned via `packageManager` + `engines`. |
| R4 — STATUS/ROADMAP removal unrecorded | Fixed: note under *Where things live*. |
| R5 — `docs/mental-model.md` pointer lost; B21 section placement | Fixed: pointer restored under *Where things live*; the reference paragraph stays under *Conventions*, which is where a builder reads rules. |
| R6 — no home for a third background process | Fixed: new tab. |
| R7 — `pane read` diagnosis dropped | Fixed: restored on timeout. |
| R8 — README referenced by no rule | Fixed: comment beside the import instead. |
| R9 — friction note asserted a Vite config that does not exist | Fixed: modality corrected. |
| A10 reasoning | Corrected: the North star is vision prose; the claim that every section is labelled was false and is withdrawn. Conventions now carries its own label. |
| B14 | Reclassified as fixed, per the re-reviewer. |
| B15 | Accepted risk stands; the skeleton renders panels only, no collapse / swap / pin, and *Stage* says "empty cockpit". |

Fixes in this round are the re-reviewer's own proposed wording applied verbatim; no further pass.
