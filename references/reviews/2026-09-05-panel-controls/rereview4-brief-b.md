Round-4 review of a foundation spec in the repo at /Users/ryanpederson/NewDev/CreatorStudioUI:
/Users/ryanpederson/NewDev/CreatorStudioUI/references/specs/2026-09-05-panel-controls.md. Read
the record first: /Users/ryanpederson/NewDev/CreatorStudioUI/references/reviews/2026-09-05-panel-controls/disposition.md
("Round 3" table: what changed and why), then the two round-3 reports beside it (`rereview3-a.md`,
`rereview3-b.md`). Rounds 2 and 3 confirmed the architecture; this round is **only the round-3
fixes**. For each of the sixteen rows in the Round 3 table, say whether the fix as now written in
the spec holds, and hunt for anything the fix newly breaks. Do not re-litigate earlier clean passes.

Your angle is **what the fixes still leave a writer or the next wave to guess**: the two-second `hintAt` tooltip (what a keyboard user gets, what happens when two regions block at once, whether two seconds is a number the harness can hold); the width/height hints against every group in `apps/studio/src/app/studio-cockpit.tsx`; the six step kinds against all nine named views and every behaviour the spec promises a picture of; the variant map naming shell behaviour (who owns the map, where the preset reads it, what a `mini` variant needs end to end); the `Sentences that change` list against `AGENTS.md`, `apps/studio/src/app/*`, `references/friction-notes.md` and `tools/src/verify/*.mjs`; anything else a reader must still guess.

Rules: read-only. Do not edit anything, do not start any server, do not run `pnpm visual`,
`pnpm verify`, or `ladle`. `gh api` only with GET. Nothing may open a window.

Report format: `## Findings` as a numbered list, each **Material** or **Minor**, one paragraph with
the citation and what breaks; then `## Clean passes` naming each Round 3 row you confirmed and how;
then `## Verdict` in two sentences. A bare "looks good" is a failed review.
