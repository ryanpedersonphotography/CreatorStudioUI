# Brief B — what the rail and strip states are missing, overclaim, or leave ambiguous

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`. Read-only:
no edits, no git commands that change anything, no servers on port 5181. A dev server runs on
http://localhost:5180; Ladle stories can be built with `pnpm stories:build` and served with
`pnpm exec ladle preview --port 61002` (kill it when done).

## What changed

`git diff HEAD~1` (one commit). The request was: "add a rail state to the left/right/bottom and also add
a top strip as well". The session read that as: nav and inspector collapse to a 48px rail instead of
vanishing, the context shelf and the top shelf collapse to a 32px strip, each compact state shows
content with its own expand control, and the toolbar gains a button for the top shelf. Start by judging
whether that reading is the most plausible one and whether anything in the request is unaddressed.

## What "wrong" looks like — hunt for these, cite file:line or a command and its output

1. Missing behaviour: a rail that cannot be dragged open; a collapsed state that does not survive a
   reload; a rail at a viewport different from where it was stored; a window narrower than the sum of
   rails and minimums; a rail with nothing useful in it (the current content is an expand glyph and
   the region's initial: is that a rail, or a placeholder wearing the name?).
2. Removed behaviour: before this change a region could hide to zero. Is fully hiding still possible,
   is it documented as gone, and does any comment, story, doc or test still promise it (`AGENTS.md`,
   `references/`, JSDoc, harness messages)?
3. Overclaims: every comment and doc line that describes rails, strips, "nothing vanishes", "carries
   the way back", the top shelf's control. Check each against code and against the harness.
4. Naming and API: `collapsed`/`collapse`/`expand` on `PanelToggle`, `pinnedPanel(size, collapsedSize)`,
   the `topStrip`/`navRail`/`contextStrip`/`inspectorRail` slots, the `Rail`/`Strip` components and
   their `title` → `Expand <title>` naming. Anything a caller would get wrong.
5. Tokens: `rail` and `strip` in `packages/tokens/src/lib/sizes.ts`; any raw size in a UI file; any
   token that lost its meaning.
6. Stories: does `studio-cockpit--writers-cockpit` show the rails? Is there any story of a region in its
   compact state? Screenshot what you claim.
7. Tests: what the unit tests prove versus what only the harness proves; whether the harness covers
   the top strip, both rails, and the context strip through both the toolbar and the compact state's
   own control; whether any assertion is vacuous.
8. Scope: anything in the diff that goes beyond the request, or padding/class changes with side
   effects (the panel padding moved into the region content).

## Run

`pnpm nx run-many -t typecheck test lint --skip-nx-cache`; `node tools/src/verify/cockpit.mjs`. Quote the
result lines.

## Report

Findings first, most severe first, each with severity (MATERIAL / MINOR), the claim, the citation,
and the fix you recommend. Then a "checked and clean" list naming exactly what you checked and how.
A bare "looks good" is a failed review.

## Browser probes: headless, through the Playwright CLI

Probe the dev server headlessly, never with a visible browser. Prefer the `playwright-cli` binary
(load the `playwright-cli` skill for its commands: `open`, `goto`, `snapshot`, `find`, `click`, `eval`,
`screenshot`, `close`) when it is on PATH; otherwise `npx playwright screenshot --viewport-size "1440, 900"
--wait-for-timeout 2000 <url> <png>` from the repo root, or a small Node script run from the repo root
with `node --input-type=module -e "$(cat script.mjs)"` so `playwright` resolves. Do not use a
computer-use tool. Save any screenshot you cite under
`/Users/ryanpederson/NewDev/CreatorStudioUI/screenshots/review-<a|b>-*.png` and name the path.
