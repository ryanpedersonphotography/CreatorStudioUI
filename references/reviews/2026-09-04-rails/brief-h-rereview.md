# Brief H — re-review of the sixth fix wave (reviewer G's findings)

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`. Read-only:
no edits, no git that changes anything, no servers on port 5181. Dev server: http://localhost:5180.
Probe headlessly: a Node script from the repo root (`playwright` resolves), `npx playwright
screenshot`, or `playwright-cli`. Nothing you run may open a window or tab: never `--headed`,
`attach`, `playwright-cli show`, `npx playwright open`, `codegen`, `test --ui`/`--debug`; start any
server with `BROWSER=none`. `page.mouse.dblclick(x, y)` at a separator's centre double-clicks it.
Save screenshots under `/Users/ryanpederson/NewDev/CreatorStudioUI/screenshots/review-h-*.png`.

## What to review

`git show HEAD` — the commit applying reviewer G's findings F1a–F5, recorded in
`references/reviews/2026-09-04-rails/disposition.md` (section "Reviewer G"), from
`reviewer-g-rereview.md`.

## What "wrong" looks like — cite file:line or a command and its output

- **F1a, the moved write rule.** `packages/shell/src/lib/use-panel-toggle.ts`: `sync()` no longer
  writes; `collapse()` writes `true` only when it acted, `expand()`/`onUserLayout` write `false` only
  when they acted. Prove the full state machine: (1) a toolbar collapse survives a same-size reload
  (bit `1`, still a rail); (2) a toolbar expand clears it; (3) a **failed** expand at a narrow window
  writes nothing and a wide reload reopens the panel — the F1a fix; (4) a window squeeze writes
  nothing; (5) a double-click reset that reopens clears a stale bit; (6) a collateral rail (drag or
  reset of a neighbour) records nothing and reopens on a wide reload. Then hunt: is there any state
  where the bit contradicts the panel (bit `1` while open, or a rail with no bit that should have
  one)? Does `collapsedByUs` still gate the reopen path correctly now that `sync` doesn't clear it on
  a recorded collapse? Does removing the `record` arg change any caller you can find?
- **F1b.** §6a′ at 600px: serve the pre-fix commit `0671daa` from a scratch clone on a spare port
  (`BROWSER=none`) and run §6a′ against both; confirm it FAILS pre-fix and PASSES HEAD. If you cannot
  serve the clone, say so and reason from the code instead.
- **F1c.** Is the full cost (drag/key-shut not remembered; neighbour snaps back at any size) stated
  in the hook header, the friction note and the disposition, and framed as Ryan's decision?
- **F1d/F5/F2a.** The header matches the code; the AGENTS.md paragraph has no line over ~100 chars;
  the watcher clears every pending timer.
- **Regression sweep.** Re-run the earlier waves' guarantees you can reach: nothing vanishes on
  collapse (rails/strips present), five landmarks, focus handoff, the top shelf session-only.
- **Scope creep** beyond F1a–F5.

## Run

`pnpm nx run-many -t typecheck test lint --skip-nx-cache` and `node tools/src/verify/cockpit.mjs`;
quote the result lines.

## Report

Findings first, most severe first, each with severity (MATERIAL / MINOR), the claim, the citation,
and the fix you recommend. Then a "checked and clean" list naming exactly what you checked and how.
A bare "looks good" is a failed review.
