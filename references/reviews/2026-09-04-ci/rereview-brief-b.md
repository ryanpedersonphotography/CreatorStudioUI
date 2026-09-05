You are re-reviewing a set of fixes on a GitHub Actions gate and a Playwright visual baseline in the
repo at /Users/ryanpederson/NewDev/CreatorStudioUI (branch `ci/verify-gate`, pull request #1 against
`main`). Your brief is **what is still missing or now inconsistent**: the round-1 reviewer found
gaps; the author fixed them; you hunt for gaps the fixes left open or newly opened, and for the
documentation that now disagrees with the behaviour. You are not the author.

Read first, in this order:
1. /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-ci/disposition.md,
   then the round-1 report it answers,
   /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-ci/review-b.md.
2. The diff of the whole branch against main: `git -C /Users/ryanpederson/NewDev/CreatorStudioUI diff 78a6637..HEAD --stat`
   then the files it lists, plus /Users/ryanpederson/NewDev/CreatorStudioUI/references/friction-notes.md
   (the last seven entries) and /Users/ryanpederson/NewDev/CreatorStudioUI/AGENTS.md.

Hunt for, with file:line citations:
- A procedure that is written in three places (ci.yml header, visual-baselines.yml header, AGENTS.md,
  friction notes) and differs between them: the dispatch recipe, the held-run approval, the merge
  check, the "push to main is the normal path" rule.
- Coverage the dark baseline still lacks: is every story truly photographed dark
  (`tools/src/visual/baselines/stories-dark/*-linux.png` versus `stories/`; `cmp` is fine), and is
  the one that matches light explained by its source
  (/Users/ryanpederson/NewDev/CreatorStudioUI/packages/menubar/src/lib/menubar.stories.tsx)?
- A next contributor's first UI change: walk the documented path from "edit a component" to "merged
  on main" and name any step where the documents leave them guessing or the tooling refuses.
- The accepted risks list: is any of them larger than stated, or missing an obvious cheap remedy?
- Anything the disposition calls Fixed that is only Fixed in code and not in the words a reader
  will see first (AGENTS.md, workflow headers).

Rules: read-only. Do not edit, commit, push, merge, or comment on the pull request. Do not start any
server or run `pnpm visual`, `pnpm verify`, or `ladle`; the CI result is on record. `gh api` only
with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and what a user or the next contributor would hit; then `## Clean passes` naming what
you specifically checked and how; then `## Verdict` in two sentences. A bare "looks good" is a
failed review.
