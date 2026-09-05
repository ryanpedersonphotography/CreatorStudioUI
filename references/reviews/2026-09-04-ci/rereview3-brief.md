You are reviewing one commit's diff in the repo at /Users/ryanpederson/NewDev/CreatorStudioUI
(branch `ci/verify-gate`, pull request #1 against `main`): the round-2 fixes to a GitHub Actions
gate and a Playwright visual baseline. Your brief is narrow: does each fix do what its row claims,
and does it break anything the previous state did right? You are not the author.

Read first:
1. The round-2 table in
   /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-ci/disposition.md
   (section "Round 2 — re-review of the fixed diff"): those rows are the claims.
2. The diff: `git -C /Users/ryanpederson/NewDev/CreatorStudioUI diff 22f74bc..HEAD` (code and
   docs; the review record itself is out of scope).

Hunt for, with file:line citations:
- `tools/src/visual/baselines.mjs`: `onDisk`/`difference` over every directory under `baselines/`
  (an expected directory missing entirely; a directory with no PNGs; a file without the platform
  suffix; the `-darwin` local case); `studioNames()` versus what `studio.visual.mts` iterates; the
  `--prune` path for an orphan in an unexpected directory.
- `tools/src/visual/studio.visual.mts`: the `SCHEMES as Scheme[]` cast and the `menu` flag; would a
  renamed view now fail or still pass silently?
- `.github/workflows/visual-baselines.yml`: does `if: ${{ inputs.prune }}` with a `type: boolean`
  input behave when dispatched with `gh workflow run … -f prune=true` (a string) and when dispatched
  without the input? Cite GitHub's documented behaviour; do not dispatch anything.
- `.github/workflows/ci.yml` header: copy the merge-check command out of the comment and run it as
  written against this branch (read-only): does it print a conclusion and SHA, and is the jq quoting
  intact inside the YAML comment?
- The port move 61000 → 61010 for the visual harness: any reference left pointing at 61000 for the
  harness (grep the repo outside node_modules and dist), and does `.ladle/config.mjs`'s port still
  describe the dev server correctly?
- `package.json` `verify` order with `nx sync:check` inserted; AGENTS.md's gate list against it.
- Any sentence in AGENTS.md, the workflow headers, or `references/friction-notes.md` that the diff
  makes false.

Rules: read-only. Do not edit, commit, push, merge, dispatch a workflow, or comment on the pull
request. Do not start any server or run `pnpm visual`, `pnpm verify`, or `ladle`. `gh api` only with
GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and the concrete consequence; then `## Clean passes` naming what you specifically
checked and how; then `## Verdict` in two sentences. A bare "looks good" is a failed review.
