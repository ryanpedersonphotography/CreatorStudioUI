I've finished tracing everything. Report:

## Findings

**1. Material — the gate's green is never bound to a commit.** `AGENTS.md:118-119` and `.github/workflows/ci.yml:6-7` define the merge procedure as "`gh run list --branch <branch>` must show `verify` green before `gh pr merge`". That command prints no commit identity:

```
completed  success  CI  ci/verify-gate  pull_request  33942525768
completed  success  CI  ci/verify-gate  pull_request  33942218972
```

Add `--json headSha` and those two rows are `52b6ced9b` and `de1335768` — different commits. The last entry in `references/friction-notes.md` already documents the exact mechanism that produces a stale top row ("A push made with the workflow's own `GITHUB_TOKEN` triggers no workflow run"), so the bot commits to an already-open PR branch, no CI fires, and the newest row still reads `success` for the pre-baseline commit. The procedure that is standing in for the ruleset therefore passes on evidence about a commit that is no longer the head.

The fix is one comparison, and it works because `gh` reports a `pull_request` run's `headSha` as the PR head (not the merge commit) — I confirmed run `33942218972` carries `de1335768` while its checkout was the merge commit `a02c9d6`:

```bash
[ "$(gh run list --branch "$B" --workflow CI --status success --limit 1 --json headSha --jq '.[0].headSha')" \
= "$(gh pr view "$N" --json headRefOid --jq .headRefOid)" ] || { echo "CI green is stale"; exit 1; }
```

State alongside it that a `workflow_dispatch` re-run (`ci.yml:16`, the documented escape hatch) checks out the branch tip, not the branch merged with main — so it satisfies the SHA check without proving the merge is green. `strict_required_status_checks_policy: true` closes that the day the ruleset applies; until then it belongs in the written procedure.

**2. Material — the story set is read from a build artifact, so coverage can shrink silently.** `tools/src/visual/stories.visual.mts:14-20` derives the test list from `dist/ladle/meta.json` and only guards the total-emptiness case (`stories.length === 0`). A story file that is deleted, renamed, or stops exporting stories disappears from the manifest without failing `ladle build`; the run then goes green with fewer tests, and its baseline PNG stays in `tools/src/visual/baselines/stories/` with nothing referencing it. Playwright has no orphan-snapshot detection, so nothing anywhere notices. There are 7 story PNGs on disk and 7 story tests today — but that equality is a coincidence, not an assertion.

Fix: after building the list, compare it to the committed baselines and fail on either side of the mismatch — read `baselines/stories/*-linux.png`, strip the suffix, and require the two sets to be equal (skipping the check when the platform's baselines are gitignored, i.e. off-CI). That turns a deleted story into a red build instead of a quieter gate.

**3. Minor — a dispatch on `main` is skipped, not refused.** `visual-baselines.yml:22` guards with `if: github.ref != 'refs/heads/main'`. The workflow file is on main (commit `78a6637`), so `gh workflow run visual-baselines --ref main` is accepted; the job is then skipped, and a run whose only job is skipped does not conclude `failure`. The documented `gh run watch` (`visual-baselines.yml:7`) returns without an error and nothing was regenerated. Fix: delete the job-level `if` and make refusal the first step, so the run goes red and says why:

```yaml
- name: Never regenerate on main
  if: github.ref == 'refs/heads/main'
  run: echo "baselines are proposed on a branch; dispatch this on visual/<why>" >&2; exit 1
```

**4. Minor — "the next step is the judge" overstates what the Confirm step proves.** `visual-baselines.yml:44` justifies `continue-on-error: true` on the assumption that `visual-baselines.yml:46-47` adjudicates. It does adjudicate three real failure modes — I traced each: a webServer that never boots fails both steps; a console error re-fires in Confirm because `errors.mts:15-18` throws in `afterEach`; a job timeout is job-level (`:24`), so the commit step never runs. What Confirm cannot do is notice that the regenerated image is a faithful picture of something wrong — it re-renders the same page and compares it to itself, so any deterministic defect passes. The actual judge is the human reviewing images in the PR, which `AGENTS.md:120-121` does specify. Reword the comment to "the next step proves the images reproduce; the PR review judges them" so nobody later trims the human step believing CI covers it.

**5. Minor — `cancel-in-progress: true` applies to main.** `ci.yml:22-24` groups on `github.ref`, so PR runs are isolated (`refs/pull/N/merge`) but consecutive pushes to main cancel each other. Two consequences: a merged commit's own `push` run can be cancelled, so main never proves green for it; and `nrwl/nx-set-shas` looks for the last *successful* `push` run on main (`nx-set-shas.ts:186-197`), so cancellations push the base further back or away entirely. The second is conservative — the fallback at `nx-set-shas.ts:85-105` lands on `origin/main~1`, which over-runs rather than under-runs — but the first is a real loss. Fix: `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`.

**6. Minor — `contents: write` is workflow-scoped in the baselines job.** `visual-baselines.yml:13-14` grants push capability to every step, including `pnpm install --frozen-lockfile` (`:37`) and the Playwright run, and `actions/checkout` persists the token into `.git/config` by default. `ci.yml:18-20` correctly uses `contents: read`. The exposure is real but bounded — the workflow only runs on manual dispatch. If you want it tighter: `persist-credentials: false` on the checkout, and push in the final step with the token supplied there explicitly.

**7. Minor — nothing enforces that `ci.yml` and the `verify` script stay in step.** `ci.yml:1-3` claims the job runs "the same order as the local script". I diffed them: `package.json:14` is `typecheck · lint · lint:tokens · test · stories:build · build · verify:ui --preview · visual`, and `ci.yml:56-64` covers all eight with `lint:tokens` and `stories:build` reordered after the Nx block. No live drift, but a step added to `package.json` will not appear in CI and nothing will say so. Also absent: any `nx sync` check, while `AGENTS.md:127` makes syncing project references a human step after adding or removing a project.

## Clean passes

**Vacuous green on the visual comparison — does not hold; the comparison demonstrably ran.** Two independent proofs from the runner log. The regenerate step printed `A snapshot doesn't exist at .../cockpit-light-linux.png, writing actual.` — that line is only reachable through `SnapshotHelper.handleMissing`, and `toHaveScreenshot` returns early before ever constructing the helper when `ignoreSnapshots` is set (`node_modules/playwright/lib/matchers/expect.js:12592`). Separately, the log reads `Running 11 tests using 2 workers`, which is the `CI ? 2 : undefined` branch of `playwright.config.mts:31`; my local run of the same command chose 7 workers.

**A missing baseline fails the `verify` job — it does not write-and-pass.** `pnpm visual` runs at Playwright's default `updateSnapshots: "missing"` (`lib/common/index.js:576`). Under that mode `handleMissing` returns `pass: true` *with* `softError` (`lib/matchers/expect.js:12492-12497`), and the worker turns a `softError` into `this._failWithError(result.softError)` (`lib/worker/workerProcessEntry.js:1029-1031`). A new story therefore reddens CI until the baselines workflow supplies its PNG. The `--update-snapshots changed` path in the baselines job takes the other branch at `:12489-12491` — writes and passes — which is what that step wants.

**An empty test set also fails.** `pnpm exec playwright test -c … --grep zzz-nothing-matches-zzz` → `Error: No tests found`, exit code 1 (measured, capturing `$?` directly rather than through a pipe).

**A local `CI=1` run cannot poison the repo.** Snapshots carry a `-platform` suffix (`playwright.config.mts:27`), and `.gitignore:62-63` excludes `*-darwin.png` and `*-win32.png`. A macOS `CI=1` run finds no `-darwin` baseline, writes one, fails on the softError, and the file is unstageable.

**The bot flow works end to end, with the right ref, credentials, and history.** The baselines run checked out `git checkout --progress --force -B ci/verify-gate refs/remotes/origin/ci/verify-gate` after a `--depth=1` fetch — a real branch, not detached — and pushed `5928a91..de13357 HEAD -> ci/verify-gate`. Depth 1 suffices because the remote already holds the parent. `git add -A tools/src/visual/baselines` followed by `git diff --cached --quiet` is correct under `bash -e`: the non-zero exit that means "there are changes" is consumed by the `if`, so `-e` does not fire. It staged exactly 11 files, all `-linux.png`.

**`nx affected` + `nx-set-shas` resolve correctly on all three event shapes.** On `pull_request` the action takes the merge-base path (`nx-set-shas.ts:40-51`), which needs `origin/main` present — supplied by `fetch-depth: 0`, and the checkout log confirms `+refs/heads/*:refs/remotes/origin/*`. It set `Base SHA 78a6637`, exactly main's tip and the correct merge-base. On `workflow_dispatch` and on a fresh repo it goes through `findSuccessfulCommit`, finds nothing (main has never had a successful `push` run), and with `error-on-no-successful-workflow` defaulting false falls back to `origin/main~1`, or the empty-tree hash if that does not exist (`:71-105`) — no error, and wrong only in the conservative direction. `filter: tree:0` does not break any of this; commit objects are retained, and the diff's trees are lazily fetched from the promisor. The run resolved 7 affected projects — the whole workspace — because `nx.json:16` lists `.github/workflows/ci.yml` in `sharedGlobals` and this PR edits it.

**The port handoff does not race in practice, and fails closed if it ever did.** I ran the brief's reproduction (`BROWSER=none pnpm verify:ui --preview && BROWSER=none pnpm visual`) — 140 harness checks then 11 visual tests, all green. Measuring the window directly against `tools/src/verify/lib.mjs`'s `shutdown()`, port 5181 stopped answering 3 ms, 3 ms, and 2 ms after teardown began across three runs, against several seconds of pnpm and Playwright startup before the webServer probe. And if it ever lost that race the result is a hard stop, not a photograph of the wrong app: with the port occupied, `pnpm visual` exits 1 with `http://localhost:5181 is already used, make sure that nothing is running on the port/url` (measured with a squatter server on 5181). `studio.visual.mts:14` adds a second net with `toHaveTitle(/Studio/)`.

**Module resolution holds under both loaders.** `./errors.mjs` → `errors.mts` resolves under Playwright's transform (11/11 locally and on the runner) and under `tsc` with `module: nodenext` — that spelling is the nodenext idiom, not a bug. `pnpm nx run tools:typecheck --skip-nx-cache` passes, and `tsc --listFiles` confirms all four files are genuinely in the compilation: `visual/errors.mts`, `visual/playwright.config.mts`, `visual/stories.visual.mts`, `visual/studio.visual.mts`.

**Runner and actions all resolve as intended.** `setup-node` logged `Resolved package.json as >=22 <23` → `node v22.23.2`; `pnpm/action-setup@v6` picked up `packageManager: pnpm@11.22.0` and `pnpm install --frozen-lockfile` succeeded. `--with-deps chromium` installed *both* binaries — `Chrome for Testing 151.0.7922.34 … chromium-1234` (what `chromium.launch()` in `tools/src/verify/lib.mjs:16` needs) and `chromium_headless_shell-1234` (what `@playwright/test` uses) — so the single install covers both consumers at 1.62.1. `ubuntu-24.04` is pinned in both files (`ci.yml:30`, `visual-baselines.yml:23`) and they match.

**The ruleset names the right context and would not deadlock its own PR.** The job id is `verify` with no `name:` override, and the runner printed `Complete job name: verify` — that display name is what becomes the check context, matching `ruleset-main.json:14`. I could not confirm it against the check-runs API: this account's token returns `403 Resource not accessible by personal access token` for both `gh pr checks` and `GET /commits/{sha}/check-runs`, which `AGENTS.md:119` already records. On the bootstrap question, `strict_required_status_checks_policy: true` only adds a branch-up-to-date-with-main requirement; the `verify` context is present on the introducing PR because `ci.yml:13` triggers on `pull_request`. The classic deadlock needs a workflow that does not run on PRs, which is not the case here.

**No injection surface, and permissions are minimal where they can be.** Every `run:` block is free of `${{ }}`; the two dynamic values reach the shell through `env:` and are referenced quoted (`visual-baselines.yml:50-62`). `ci.yml`'s `actions: read` is exactly what `nx-set-shas` needs to list runs, and `contents: read` blocks writes.

**One design choice worth naming as correct:** only `typecheck lint test build` go through `nx affected`. `lint:tokens`, `stories:build`, `nx build studio`, `verify:ui --preview`, and `visual` are unconditional (`ci.yml:58-64`), so a baseline-only or docs-only PR still gets the full browser and pixel gate. That is the right side of the tradeoff for a gate whose value is visual.

## Verdict

The gate is genuinely green rather than vacuously green — the comparison provably ran, missing baselines fail, an empty suite fails, and the port handoff fails closed — but two things need fixing before it can be trusted as the merge guard: the documented procedure reads a run list that never binds green to a commit, and the story set is derived from a build artifact so coverage can shrink without turning anything red.
