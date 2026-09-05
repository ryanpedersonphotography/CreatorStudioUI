You are re-reviewing a set of fixes on a GitHub Actions gate and a Playwright visual baseline in the
repo at /Users/ryanpederson/NewDev/CreatorStudioUI (branch `ci/verify-gate`, pull request #1 against
`main`). Your brief is **correctness of the fixes**: every claim in the disposition table must be
supported by the code as it exists now. You are not the author; treat the disposition as a set of
claims to refute.

Read first, in this order:
1. /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-ci/disposition.md
   (the claims), then the round-1 report it answers,
   /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-ci/review-a.md.
2. The diff of the whole branch against main: `git -C /Users/ryanpederson/NewDev/CreatorStudioUI diff 78a6637..HEAD --stat`
   then the files it lists, in particular
   /Users/ryanpederson/NewDev/CreatorStudioUI/.github/workflows/ci.yml,
   /Users/ryanpederson/NewDev/CreatorStudioUI/.github/workflows/visual-baselines.yml,
   /Users/ryanpederson/NewDev/CreatorStudioUI/tools/src/visual/*.mts and baselines.mjs,
   /Users/ryanpederson/NewDev/CreatorStudioUI/AGENTS.md (the Conventions gate paragraph).

Hunt for, with file:line citations:
- A disposition row marked Fixed whose fix does not do what the row says, or does it only in one of
  the two places it is needed (both specs, both workflows, docs and code).
- A fix that introduces a new failure: the `theme=` story parameter and the `color-scheme`
  assertion; the manifest check and `--prune` (what happens with a story that exists in only one
  scheme, or a studio view renamed); the full-clone change and `persist-credentials: false` against
  what `nx-set-shas` and `nx affected` need; the held-run approve procedure; the `token-ok` exemption
  on the dark story.
- A merge-procedure command in the `ci.yml` header that does not work as written with this repo's
  `gh` token (it cannot read check runs; `gh run list/view/watch` work).
- Anything in `disposition.md` that misreports a run result or a commit hash. Verify with
  `git -C /Users/ryanpederson/NewDev/CreatorStudioUI log --oneline main..HEAD` and read-only
  `gh run view <id> --json conclusion,headSha` (GET only).

Rules: read-only. Do not edit, commit, push, merge, or comment on the pull request. Do not start any
server or run `pnpm visual`, `pnpm verify`, or `ladle`; the CI result is on record. `gh api` only
with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and the concrete failure it causes; then `## Clean passes` naming what you specifically
checked and how; then `## Verdict` in two sentences. A bare "looks good" is a failed review.
