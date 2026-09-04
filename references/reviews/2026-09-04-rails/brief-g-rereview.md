# Brief G — re-review of the fifth fix wave (reviewer F's findings)

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`. Read-only:
no edits, no git that changes anything, no servers on port 5181. Dev server: http://localhost:5180.
Probe headlessly: a Node script from the repo root (`playwright` resolves), `npx playwright
screenshot`, or `playwright-cli`. Nothing you run may open a window or tab: never `--headed`,
`attach`, `playwright-cli show`, `npx playwright open`, `codegen`, `test --ui`/`--debug`; start any
server with `BROWSER=none`. A raw `page.mouse.dblclick(x, y)` at a separator's centre double-clicks
it (the locator action fails the 1px hit test). Save screenshots under
`/Users/ryanpederson/NewDev/CreatorStudioUI/screenshots/review-g-*.png`.

## What to review

`git show HEAD` — the commit applying reviewer F's findings F1–F5, recorded in
`references/reviews/2026-09-04-rails/disposition.md` (section "Reviewer F"), from
`reviewer-f-rereview.md`.

## What "wrong" looks like — cite file:line or a command and its output

- **F1, the new write rule.** `packages/shell/src/lib/use-panel-toggle.ts`: `onUserLayout` now
  records only when the panel is open. Confirm the whole intent story still holds: a toolbar collapse
  is remembered across a same-size reload (bit `1`, panel stays a rail); a toolbar expand clears it;
  a window squeeze writes nothing; a double-click reset that reopens clears a stale bit; and — the
  fix — a drag or reset that collaterally rails a *sibling* records nothing for that sibling, which a
  wide reload reopens. Try to find a collapse that IS the user's intent but is now lost in a way that
  matters (beyond the disclosed "a dragged-shut sidebar reopens after reload"): e.g. does a
  toolbar-collapsed panel still survive a reload at the *same* size? Does the residual leave a bit
  that contradicts the panel's actual state (bit `1` while open, or `0` while a rail)?
- **F1 acceptance.** Is "a dragged-shut sidebar is not remembered across reload" stated where a user
  and a later session would find it (preset header? friction note? disposition?), and is it framed as
  Ryan's to overrule?
- **F2.** The watcher's `clearTimeout` on unmount: correct, and does it ever cancel a legitimate
  pending notify for a cockpit that stays mounted?
- **F3/F4.** §6a exact-width assertion; the jsdom no-op-double-click guard test — would each fail if
  its fix were reverted?
- **The collateral regression itself (§6a′).** Is it real proof, or does it pass for an unrelated
  reason (e.g. the inspector would reopen anyway)? Would it fail against `0671daa` (the pre-fix commit)?
- **Scope creep** beyond F1–F5.

## Run

`pnpm nx run-many -t typecheck test lint --skip-nx-cache` and `node tools/src/verify/cockpit.mjs`;
quote the result lines.

## Report

Findings first, most severe first, each with severity (MATERIAL / MINOR), the claim, the citation,
and the fix you recommend. Then a "checked and clean" list naming exactly what you checked and how.
A bare "looks good" is a failed review.
