# Brief E — re-review of the third fix wave (reviewer D's findings)

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`. Read-only:
no edits, no git commands that change anything, no servers on port 5181. Dev server:
http://localhost:5180. Probe headlessly: a Node script run from the repo root (`playwright` resolves
there), `npx playwright screenshot`, or `playwright-cli`. Nothing you run may open a window or tab on
the user's screen: never `--headed`, `attach`, `show`, `npx playwright open`, `codegen`, `test --ui`
or `--debug`; if you start Ladle or any other server, run it with `BROWSER=none` in the environment
(`ladle serve` is broken here; use `ladle build` then `ladle preview --port 61004`). Save any
screenshot you cite under `/Users/ryanpederson/NewDev/CreatorStudioUI/screenshots/review-e-*.png`.

## What to review

`git show HEAD` — the commit that applies reviewer D's findings D1–D5, recorded in
`/Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-rails/disposition.md`
(section "Reviewer D"), from `reviewer-d-rereview.md` in the same folder.

## What "wrong" looks like — cite file:line or a command and its output

- **D1.** Memory is now written only from `collapse()`/`expand()` and from `onUserLayout`, which
  `packages/shell/src/lib/cockpit.tsx` fires for every panel of a group when the library's
  `onLayoutChanged` reports `isUserInteraction`. Hunt for: a user transition that no longer gets
  recorded (drag shut, drag open from a rail, Enter/arrow keys on a separator, a drag in a *nested*
  group); a non-user transition that still does (window resize, imperative call, mount, StrictMode
  double effects, a listener registered on the wrong group); a listener leak on unmount; the
  `useCallback` identity of `onLayoutChanged` re-registering listeners per render. Reproduce D1's
  own table: mount at 1440×900 with cleared storage, resize the viewport to 600, back to 1440,
  reload: nav must be open and pressed, no bit `1`. Then the residual the disposition admits: after
  that sequence nav reopens at 160px, not 288px. Is that residual stated honestly, and is the
  reasoning for not taking `onlySaveAfterUserInteractions` (it would stop saving toggle collapses)
  correct against `useDefaultLayout`'s source?
- **D2.** `AGENTS.md` "Browser verification is headless…" paragraph: judge it as a governing rule.
  Any sentence that hands an agent its own exemption; any headed path a reader could believe is
  allowed because it is unlisted; anything false for this workspace.
- **D3.** The claim "memory is written from intent only" in `use-panel-toggle.ts`, the disposition,
  and `references/friction-notes.md`: measure it. A plain mount must write no `cs:collapsed:` key.
- **D4.** Harness §8 now drags the shelf off its default before the Enter round trip: is the
  assertion revert-sensitive now, and does the keyboard expand actually replay the dragged height?
- **D5.** `packages/shell/src/lib/use-panel-toggle.spec.tsx`: does any test still ratify the defect?
- **Harness.** 63 assertions. Which of the seven new ones (§1 no bits, §1b squeeze ×3, §7 drag bit,
  §8 off-default, §8 keyboard bit) would pass with its fix reverted?
- **Scope creep** beyond D1–D5.

## Run

`pnpm nx run-many -t typecheck test lint --skip-nx-cache` and `node tools/src/verify/cockpit.mjs`;
quote the result lines.

## Report

Findings first, most severe first, each with severity (MATERIAL / MINOR), the claim, the citation,
and the fix you recommend. Then a "checked and clean" list naming exactly what you checked and how.
A bare "looks good" is a failed review.
