# Brief D — re-review of the second fix wave (reviewer C's findings) and one governing-rule edit

You are a fresh, independent reviewer. Repo: `/Users/ryanpederson/NewDev/CreatorStudioUI`. Read-only:
no edits, no git commands that change anything, no servers on port 5181. Dev server:
http://localhost:5180. Probe headlessly through the Playwright CLI (`playwright-cli` is on PATH; load the
`playwright-cli` skill for its commands) or `npx playwright screenshot` / a Node script run from the
repo root. Nothing you run may open a window or tab on the user's screen: never `--headed`, never
`attach`, never `npx playwright open` or `codegen`, and if you start Ladle or any other server, run
it with `BROWSER=none` in the environment (`.ladle/vite.config.mts` sets `open: false`; `ladle serve`
is broken in this workspace, use `ladle build` then `ladle preview --port 61003`). Save any screenshot
you cite under `/Users/ryanpederson/NewDev/CreatorStudioUI/screenshots/review-d-*.png`.

## What to review

1. `git show HEAD` — the commit that applies reviewer C's findings C1–C8, recorded in
   `/Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-04-rails/disposition.md`
   (section "Reviewer C"), from `reviewer-c-rereview.md` in the same folder.
2. `git show ad71d78 -- AGENTS.md` — a governing-rule paragraph ("Browser verification is headless…")
   other sessions inherit. Judge it as a rule: is it unambiguous, is anything in it false for this
   workspace, does it leave a way to open a window on the user's screen.

## What "wrong" looks like — cite file:line or a command and its output

- **C1, the general clamp fix.** `packages/shell/src/lib/use-panel-toggle.ts` gained `CollapsedMemory`
  and a mount reconcile; `apps/studio/src/app/studio-cockpit.tsx` wires it for nav, context and
  inspector under `cs:collapsed:<project>:<panel>`. Hunt for: a path where the mount reconcile
  reopens a panel the user collapsed (drag, button, or a consumer's `collapse()` in an effect); a
  path where a clamp gets written to memory as intent (window narrower than the body's 680px floor is
  the one to try); the ResizeObserver-driven `onResize` landing before or after the mount effect; a
  remount (`handle` re-attaching) resetting `settled` at the wrong moment; StrictMode double effects;
  memory objects changing identity per render and re-running the effect. Reproduce C1's own table:
  seed `cs:layout:default:body` with `{"nav":11.127,"center":64.873,"inspector":24}` and mount at
  900×800; nav must be 160 and pressed. Then seed `cs:collapsed:default:nav` = `1` and mount again;
  nav must stay 48.
- **C2, the story.** `apps/studio/src/app/studio-cockpit.stories.tsx`: `CollapseAll` now lives in the
  manuscript slot. Drive `studio-cockpit--compact-states` on the built bundle: expand nav, inspector
  and context, then expand the shelf, twice; nothing may re-collapse.
- **C3–C5, the tests.** `packages/shell/src/lib/cockpit.spec.tsx` (storage spies),
  `tools/src/verify/cockpit.mjs` §8 (exact restore) and §8c (`SECTION[Navigation]`), §5c, §7b bits,
  §3 and §9 key sets. Which assertion would still pass if its fix were reverted?
- **C6, the ring.** `LANDMARK_FOCUS` in `apps/studio/src/app/studio-regions.ts`; `tabIndex={-1}` on
  `Rail`, `Strip`, the toolbar's section and the app's `Region`. Does the inset ring get clipped
  anywhere; does the landmark now enter the Tab order anywhere; is the separator's ring the same token
  once its 120ms colour transition settles.
- **C8, the top landmark.** `StudioToolbar` is a `<section aria-label="Top shelf">`. Any moment with
  two "Top shelf" landmarks, or none.
- **Docs.** The preset header, `references/friction-notes.md` (the 2026-09-04 clamp bullet), and the
  disposition rows for C1–C8: anything that overclaims against what the harness proves.
- **Scope creep** beyond C1–C8 and the `h-full` on the app's placeholder regions.

## Run

`pnpm nx run-many -t typecheck test lint --skip-nx-cache` and `node tools/src/verify/cockpit.mjs`;
quote the result lines.

## Report

Findings first, most severe first, each with severity (MATERIAL / MINOR), the claim, the citation,
and the fix you recommend. Then a "checked and clean" list naming exactly what you checked and how.
A bare "looks good" is a failed review.
