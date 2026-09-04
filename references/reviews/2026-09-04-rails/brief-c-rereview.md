# Brief C — re-review of the rail/strip fix wave (diff only)

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`. Read-only:
no edits, no git commands that change anything, no servers on port 5181. Dev server:
http://localhost:5180. Probe headlessly through the Playwright CLI (`playwright-cli` is on PATH; load the
`playwright-cli` skill for its commands) or `npx playwright screenshot` / a Node script run from the
repo root. Nothing you run may open a window or tab on the user's screen: never `--headed`, never
`attach`, never `npx playwright open` or `codegen`, and if you start Ladle or any other server, run
it with `BROWSER=none` in the environment (`.ladle/vite.config.mts` already sets `open: false`).
Save any screenshot you cite under
`/Users/ryanpederson/NewDev/CreatorStudioUI/screenshots/review-c-*.png`.

## What to review

`git show 053c544` (its parent `e60933b` is the feature commit) — the commit that applies the accepted findings in
`/Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-rails/disposition.md`, from
reviews `reviewer-a-correctness.md` (A1–A5) and `reviewer-b-gaps.md` (B1–B12) in the same folder.

## What "wrong" looks like — cite file:line or a command and its output

1. A row marked *fixed* whose fix is not in the diff, or fixes something other than the finding.
2. Regressions in the fixes:
   - `apps/studio/src/app/studio-cockpit.tsx` `useFocusHandoff`: a path where the `pending` flag leaks
     into an unrelated later transition; StrictMode double-invocation of the effect; focus stolen from
     a control outside the region; the `tabIndex = -1` mutation on the landmark and what it does to
     the tab order; whether wrapping the toggles breaks the `useMemo` identity contract that
     `Cockpit.Regions` consumers rely on.
   - `packages/shell/src/lib/cockpit.tsx`: `store` is now optional and a session-only store is created
     per cockpit. Is the memo keyed correctly, is anything else in the repo relying on the root group
     being persisted (harness key assertions, specs, docs), and does the type change ripple anywhere
     it should not.
   - `apps/studio/src/app/studio-cockpit.stories.tsx` `CollapseAllOnMount`: does it fight a user who
     expands a region in the story; does it run twice under StrictMode; does it collapse before the
     handles attach.
   - `apps/studio/src/app/studio-rails.tsx`: landmarks named like the full region — is there now a
     duplicate landmark name at any moment (both full and compact mounted), and does the toolbar
     button "Navigation" plus the region "Navigation" confuse `getByRole` in the specs or harness?
   - `tools/src/verify/cockpit.mjs`: 52 assertions. Which are vacuous, which depend on state an
     earlier section left behind in a way the message hides. Section 5b seeds a stale root layout —
     does it actually prove A1's fix or would it pass regardless?
3. Docs: the preset header (session-only root, strip-for-bottom decision, "above the body's minimum
   width"), `references/friction-notes.md` new bullets, `AGENTS.md` Stage paragraph. Anything that
   overclaims against what the harness proves.
4. Scope creep beyond the accepted findings.

## Run

`pnpm nx run-many -t typecheck test lint --skip-nx-cache` and `node tools/src/verify/cockpit.mjs`;
quote the result lines.

## Report

Findings first, most severe first, each with severity (MATERIAL / MINOR), the claim, the citation,
and the fix you recommend. Then a "checked and clean" list naming exactly what you checked and how.
A bare "looks good" is a failed review.
