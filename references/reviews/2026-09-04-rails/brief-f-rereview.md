# Brief F — re-review of the fourth fix wave (reviewer E's findings)

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`. Read-only:
no edits, no git commands that change anything, no servers on port 5181. Dev server:
http://localhost:5180. Probe headlessly: a Node script run from the repo root (`playwright` resolves
there), `npx playwright screenshot`, or `playwright-cli`. Nothing you run may open a window or tab on
the user's screen: never `--headed`, `attach`, `show`, `npx playwright open`, `codegen`, `test --ui`
or `--debug`; if you start a server, run it with `BROWSER=none` in the environment. Save any
screenshot you cite under `/Users/ryanpederson/NewDev/CreatorStudioUI/screenshots/review-f-*.png`.
A raw `page.mouse.dblclick(x, y)` at a separator's centre is how to double-click one; the locator
action fails the hit test on a 1px element.

## What to review

`git show HEAD` — the commit that applies reviewer E's findings E1–E4, recorded in
`/Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-rails/disposition.md`
(section "Reviewer E"), from `reviewer-e-rereview.md` in the same folder.

## What "wrong" looks like — cite file:line or a command and its output

- **E1.** `packages/shell/src/lib/cockpit.tsx`: each `Cockpit` group holds its imperative handle and,
  on a window-capture `dblclick`, snapshots `getLayout()` and after a `setTimeout(0)` notifies its
  listeners if the layout changed. Hunt for: a double-click that changes the layout without the
  library's reset (is there one?); a reset whose `onLayoutChanged` or store commit lands after the
  timeout; two groups both reacting to one double-click (nested body/center: the reset of a body
  separator must not notify the center group's panels, and vice versa); the listener surviving
  unmount or duplicating under StrictMode; `groupRef` as a callback ref re-attaching per render;
  `JSON.stringify` order sensitivity of `getLayout()`. Reproduce: cleared storage, toolbar collapse
  nav (bit `1`), double-click the nav separator (nav must reopen and the nav bit must become `0`),
  squeeze to 600 and back, reload at 1440: nav open and pressed.
- **E2.** Harness §6a: ArrowRight on the nav separator from fresh must write bits; would it pass with
  `onUserLayout` deleted? And the double-click assertion: would it pass with the group watcher
  deleted?
- **E3.** `AGENTS.md`: the token now reads `playwright-cli show`; any remaining imprecision.
- **Removed tests.** Two jsdom double-click tests were added and removed in the same wave; the
  disposition says jsdom cannot resolve the gesture. Is that true, or is there a unit-level assertion
  worth having (e.g. that the watcher does not notify when the layout is unchanged)?
- **Scope creep** beyond E1–E4.

## Run

`pnpm nx run-many -t typecheck test lint --skip-nx-cache` and `node tools/src/verify/cockpit.mjs`;
quote the result lines.

## Report

Findings first, most severe first, each with severity (MATERIAL / MINOR), the claim, the citation,
and the fix you recommend. Then a "checked and clean" list naming exactly what you checked and how.
A bare "looks good" is a failed review.
