# CI gate and visual baseline — review record

**Artifact:** pull request #1, branch `ci/verify-gate` → `main`
(https://github.com/ryanpedersonphotography/CreatorStudioUI/pull/1). **Date:** 2026-09-04/05.
**Gate cost:** two opus reviewers in round 1 (`brief-a.md`, `brief-b.md` → `review-a.md`,
`review-b.md`), two opus re-reviewers on the fixed diff in round 2 (`rereview-brief-a.md`,
`rereview-brief-b.md` → `rereview-a.md`, `rereview-b.md`). All four ran headless with read-only
tools; none could edit, push, merge, or start a server.

Framings: A hunted what is wrong or unbuildable in the gate as written (the workflows, the
Playwright harness, the merge procedure). B hunted what is missing: coverage the baseline does not
have, procedures that do not exist, and defaults that do not fit this repo.

## Round 1 findings and what was done

| # | Finding (headline) | Disposition |
|---|---|---|
| A1 | Material. The merge procedure reads `gh run list`, which never binds green to a commit; a bot push to the PR branch leaves a stale green row on top. | Fixed `16326d1`. The `ci.yml` header carries the `headSha` = `headRefOid` comparison and says a dispatch re-run tests the branch tip, not the merge; AGENTS.md points at it. |
| A2 / B3 | Material. The story list comes from `dist/ladle/meta.json`, so a deleted or renamed story silently drops out and its PNG becomes an orphan nothing detects. | Fixed `16326d1`. `tools/src/visual/baselines.mjs` computes the expected set (every story × both schemes + four studio views) against the files on disk; `manifest.visual.mts` fails CI on any missing or orphan image; the regenerate job runs `--prune` first. |
| A3 | Minor. A dispatch on `main` was skipped, not refused, so `gh run watch` returned clean with nothing regenerated. | Fixed `16326d1`. The first step of the job fails the run on `main` with a message. |
| A4 | Minor. "The next step is the judge" overstated what the Confirm step proves. | Fixed `16326d1`. Reworded: the step proves the images reproduce; the pull request review judges them. |
| A5 / B9 | Minor. `cancel-in-progress: true` also cancelled consecutive pushes to `main`, so main could land without a verdict and nx-set-shas lost its base. | Fixed `16326d1`. `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`. |
| A6 | Minor. `contents: write` is in scope for every step of the baselines job and the checkout persists the token. | **Accepted.** The commit step needs the persisted token to push. The job runs only on manual dispatch, on a private repo with one contributor, Pinning (B11) constrains the four actions, not the branch's own scripts that run under the token. The remedy on the door: a read-only job that uploads the PNGs as an artifact and a second job that commits them without running repo code. Revisit if a second contributor or a public repo arrives. |
| A7 / B10 | Minor. `ci.yml` and `pnpm verify` are described as the same gate; nothing enforces it, and no `nx sync` check existed. | Fixed in part `16326d1`. `nx sync:check` added; AGENTS.md and the `ci.yml` header now say "the same gate with the Nx targets narrowed to affected" rather than "identical"; `nx.json` `sharedGlobals` includes `ci.yml` so a workflow edit re-runs every Nx target. **Not taken:** a mechanical check that the two step lists match. Accepted; a step added to `package.json` must be added to `ci.yml` by hand. |
| B1 | Material. `menubar--dark` photographed a white page: `minHeight: 100%` collapsed under Ladle's root. | Fixed `16326d1` (`100dvh`, and the View menu opens on load so the dark menu surface is in frame). The token lint then flagged the raw length on the runner; the line carries a `token-ok` exemption in the follow-up commit (see *Found by CI*). |
| B2 | Material. Nothing waited for Radix to position a portalled menu before the shot. | Fixed `16326d1`. `support.mts` `settle()` awaits `document.fonts.ready` and two animation frames inside the page before every screenshot, in both specs. |
| B4 | Material. The dispatch recipe pointed at a fresh `visual/<why>` branch instead of the branch carrying the UI change. | Fixed `16326d1`. Header recipe rewritten: push the branch with the change, dispatch on it, open the pull request from it. |
| B5 | Material. The documented escape hatch (`gh workflow run CI --ref`) did not exist: the file was not on `main`. | **Corrected in round 2.** Only `visual-baselines.yml` was seeded on `main` (`78a6637`); `ci.yml` reaches `main` with this merge, and its header says the dispatch works once it is there. A bot push does create a pull-request run, held as `action_required`; `a64d3a4` documents the approve endpoint, verified on run 33943368076. |
| B6 | Material. The shell had no dark baseline beyond the two studio views. | Fixed `16326d1` (a `stories-dark` project) and **corrected** `a64d3a4`: the first regeneration produced dark images byte-identical to light because Ladle stamps `data-theme="light"` regardless of the OS scheme. The spec now passes `theme=<scheme>` in the story URL and asserts the page's computed `color-scheme` before the shot. Regenerated in `9bcd3b6`: six of seven dark images differ from light; `menubar--dark` forces its own dark scheme and matches by design. Three images read by eye (matrix, compact-states, writers-cockpit). |
| B7 | Material. The ruleset does not force pull requests, and a PR-per-change default does not fit a one-person repo. | **Adopted** `16326d1`. AGENTS.md: pushing to `main` is the normal path; a pull request is for a change whose images want looking at. |
| B8 | Minor. `threshold` was unset, so "pixel for pixel" was not what ran. | Fixed `16326d1`. `threshold: 0.2` explicit beside `maxDiffPixels: 0`, with the reason (identical antialiasing must count as identical); AGENTS.md's "no differing pixel" means no pixel beyond that threshold. |
| B11 | Minor. The write-capable job used unpinned actions. | Fixed `16326d1`. All four actions pinned by commit SHA with the version in a comment. |
| B12 | Minor. `page.evaluate(() => document.fonts.ready)` returned a FontFaceSet Playwright cannot serialise. | Fixed `16326d1`. Awaited inside the page; `settle()` resolves to `undefined`. |
| B13 | Minor. `overflow: auto` on menu content will paint an untokened scrollbar the day a menu exceeds the viewport. | **Deferred.** No menu overflows today. Revisit when the Write milestone adds menus; scrollbar tokens are not added now. |
| B (clean pass) | Recommendation to stay out of 2× and hover baselines. | **Adopted.** Baselines stay 1× and static; `verify:ui` covers hover and 2× geometry by assertion. |

Clean passes both reviewers named (and the session spot-checked the citations): the mount signal
(`.ladle-ring` detached, then a child under `#ladle-root`) holds and replaced the spinner
screenshots; the unstyled look of `menubar--matrix` is the standalone skin by design; the port
discipline (`reuseExistingServer: false`, `--strictPort`) fails closed; a missing baseline fails
rather than passes (`updateSnapshots: 'missing'` traced in the installed matcher); the specs are
inside the typecheck and lint gates; `contents: read` + `actions: read` is the right envelope for CI.

### Found by CI, not by review

- Run 33943280968 (`16326d1`) died inside `nx affected`: the treeless clone needed credentials to
  fetch trees lazily and the job had dropped them. `a64d3a4` makes the checkout a full clone.
- Runs 33943640872 (`a64d3a4`) and 33943658834 (`9bcd3b6`, cancelled) failed the token lint on the
  `100dvh` line from B1's fix; the lint reads TSX and the change was not re-linted locally. Fixed in
  `22f74bc` with a `token-ok` exemption and the reason. The full local gate ran before that push.

## Round 2 — re-review of the fixed diff

Re-reviewers read `disposition.md` as a claims list against the branch at `22f74bc`. A
(`rereview-a.md`) hunted fixes that do not do what their row says; B (`rereview-b.md`) hunted gaps the
fixes left or opened, and prose that disagrees with behaviour. Both ran the merge-procedure commands
with this repo's token and found them working, confirmed the tip green step by step, and checked the
dark coverage file by file.

| # | Finding (headline) | Disposition |
|---|---|---|
| A2-1 / B2-1 | Material. The B5 row said the CI workflow was seeded on `main`; only the baselines workflow was, and the copy of it on `main` is the defective round-1 version. | **Corrected** in the B5 row above. `ci.yml` and the fixed baselines workflow reach `main` with this merge. |
| A2-2 | Material. `--prune` deletes the pictures of any story the manifest lost by accident, the bot commits the loss, and the manifest check ratifies it. | Fixed `d21bfab`. Prune is a `workflow_dispatch` input (`-f prune=true`), off by default; a story that drops out of the manifest fails the confirm step as a missing picture. Dispatched once with the input on to see the step run (run 33946889447). |
| A2-3 | Material. The studio view behaviour was keyed on a string compare, so a renamed view would silently photograph the plain cockpit. | Fixed `d21bfab`. `STUDIO_VIEWS` declares each view with its behaviour (`menu`); the names are derived and the spec branches on the flag. |
| B2-2 | Material. The friction note describes the `menubar--dark` identical pair as the defect. | Fixed `d21bfab`. The friction note and the story's docblock say the pair matches by design. |
| B2-3 | Material. The orphan check read only the expected project directories, so a renamed or removed project left its pictures invisible. | Fixed `d21bfab`. `onDisk` reads every directory under `baselines/`; anything outside the expected projects is an orphan. Seen failing first: a planted `baselines/zzz/x-linux.png` made the report exit 1 naming it, and `--prune` removed it. |
| B2-4 | Material. `pnpm verify` ends by starting a Ladle preview on 61000 and refusing the Ladle dev pane already there. | Fixed `d21bfab`. The visual preview runs on 61010; AGENTS.md names both ports. |
| A2-4 | Minor. AGENTS.md still said "no differing pixel allowed". | Fixed `d21bfab`: the per-pixel threshold is stated. |
| A2-5 / B2-9 | Minor. The runs table named `218ca00` for the first baselines run; its head was `5928a91`. | Fixed in the table. |
| A2-6 | Minor. Two placeholders were live in the record. | Filled. |
| A2-7 | Minor. In the stories spec the settle frames count from the story mounting, not from a menu opening, and no story asserts its menu opened. | **Accepted.** The comparison against the committed baseline, which shows the menu open, fails on a closed bar, and a regeneration is reviewed as images; Playwright's stabilise-until-identical loop covers the positioning frame. |
| A2-8 / B2-6 | Minor. `nx sync:check` ran on CI but not in `pnpm verify`. | Fixed `d21bfab`: added to `verify`. |
| B2-5 | Minor. Three documents named three homes for the merge procedure. | Fixed `d21bfab`: it lives in the `ci.yml` header; AGENTS.md and the friction note point there. |
| B2-7 | Minor. The A6 row credited SHA pinning with a mitigation it does not provide. | Corrected in the A6 row, with the two-job remedy recorded as the door. |
| B2-8 | Minor. The merge check read the newest *successful* run, so a later red on the same commit, or a dispatch run, could satisfy it. | Fixed `d21bfab`: the header command reads the newest `pull_request` run whatever its result and requires `success`. |
| B2-10 | Minor. The review record was untracked. | Committed with this round. |

Clean passes both named and the session spot-checked: the merge-procedure commands run with this token
and matched `22f74bc`; every step of run 33945785146 green with the manifest test executing, not
skipping; six of seven dark images differ by hash; all four pinned actions dereference to their
commented tags; the treeless-clone diagnosis and fix; the `token-ok` exemption is line-scoped.

### Round 3 — the round-2 diff

Material fixes re-review their changed parts. Budget rung: one opus reviewer on the diff only
(`rereview3-brief.md` → `rereview3.md`), not two on the whole.

ROUND3_PENDING

## Accepted risks, on the record

- The `verify` check cannot be required on `main`: rulesets on a private personal repo need GitHub
  Pro (HTTP 403 on `POST /rulesets`). `.github/ruleset-main.json` is ready to apply; until then the
  merge procedure in the `ci.yml` header is the guard.
- The baselines job holds a write token through every step (A6).
- CI and `pnpm verify` are kept aligned by hand (A7/B10); `nx sync:check` is in both since round 2.
- Baselines are Ubuntu's rendering of a system font stack; a local run cannot reproduce them and
  only proves the pages load (`ignoreSnapshots` off CI). The runner is pinned to `ubuntu-24.04`.
- Scrollbar tokens deferred (B13); no 2× or hover baselines (B clean pass).

## Runs referenced

| Run | Workflow / commit | Result |
|---|---|---|
| 33942098972 | visual-baselines on `5928a91` (main merged into the branch) | success, 11 images committed as `de13357` |
| 33942218972 | CI on `de13357` | success |
| 33942525768 | CI on `52b6ced` | success |
| 33943278716 | visual-baselines on `16326d1` | success, `f19b828` (dark images wrong, see B6) |
| 33943280968 | CI on `16326d1` | failure: promisor fetch without credentials |
| 33943368076 | CI on `f19b828` | held → approved via API → failure, same cause |
| 33943567095 | visual-baselines on `a64d3a4` | success, `9bcd3b6` (dark images correct) |
| 33943640872 | CI on `a64d3a4` | failure: token lint on the story wrapper |
| 33943658834 | CI on `9bcd3b6` | held → approved → cancelled (same lint failure ahead) |
| 33945785146 | CI on `22f74bc` | success (dark baselines and manifest included) |
