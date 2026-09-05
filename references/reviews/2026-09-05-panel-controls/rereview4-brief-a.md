Round-4 review of a foundation spec in the repo at /Users/ryanpederson/NewDev/CreatorStudioUI:
/Users/ryanpederson/NewDev/CreatorStudioUI/references/specs/2026-09-05-panel-controls.md. Read
the record first: /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/disposition.md
("Round 3" table: what changed and why), then the two round-3 reports beside it (`rereview3-a.md`,
`rereview3-b.md`). Rounds 2 and 3 confirmed the architecture; this round is **only the round-3
fixes**. For each of the sixteen rows in the Round 3 table, say whether the fix as now written in
the spec holds, and hunt for anything the fix newly breaks. Do not re-litigate earlier clean passes.

Your angle is **correctness against the installed sources**: the two-attribute arming and the capture-phase `pointerdown` disarm against `react-resizable-panels` 4.12.3 and the shell; the `fill` assertions in jsdom 27 and Chromium; the `--cs-ink` bridge against `tools/src/verify/menubar.mjs:160-201` and `packages/tokens/src/tokens.css` in both schemes; `hintAt` against Ark Tooltip's controlled `open`; the `{ size }` escape hatch against `cockpit.tsx` and the studio's `pinnedPanel` callers; the mid-slide recipe against the Web Animations API (`finish()` on a CSS transition, `pause()` then `currentTime`); the `./cockpit.css` export against pnpm resolution in `.ladle/preview.css` and `apps/studio/src/styles.css`.

Rules: read-only. Do not edit anything, do not start any server, do not run `pnpm visual`,
`pnpm verify`, or `ladle`. `gh api` only with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and what breaks; then `## Clean passes` naming each Round 3 row you confirmed and how;
then `## Verdict` in two sentences. A bare "looks good" is a failed review.
