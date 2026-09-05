You are reviewing CI and a visual-regression baseline that were just added to the repo at
/Users/ryanpederson/NewDev/CreatorStudioUI. You hunt for what is WRONG or WILL NOT WORK. A bare
"looks good" is a failed review; a clean pass must name what you checked and how.

Read the artifacts at their paths, not any summary:
- /Users/ryanpederson/NewDev/CreatorStudioUI/.github/workflows/ci.yml
- /Users/ryanpederson/NewDev/CreatorStudioUI/.github/workflows/visual-baselines.yml
- /Users/ryanpederson/NewDev/CreatorStudioUI/.github/ruleset-main.json
- /Users/ryanpederson/NewDev/CreatorStudioUI/tools/src/visual/playwright.config.mts
- /Users/ryanpederson/NewDev/CreatorStudioUI/tools/src/visual/stories.visual.mts
- /Users/ryanpederson/NewDev/CreatorStudioUI/tools/src/visual/studio.visual.mts
- /Users/ryanpederson/NewDev/CreatorStudioUI/tools/src/visual/errors.mts
- /Users/ryanpederson/NewDev/CreatorStudioUI/tools/src/visual/baselines/ (PNGs committed by the bot)
- /Users/ryanpederson/NewDev/CreatorStudioUI/package.json (scripts `verify`, `visual`), .gitignore,
  tools/tsconfig.lib.json, nx.json, AGENTS.md (Conventions and Where things live), references/friction-notes.md (last three entries)
- The real runs: `gh run list --limit 10`, `gh run view <id> --log` for the CI run on the pull request
  and for the visual-baselines run; `gh pr view --json` / `gh pr checks`; `gh ruleset list` / `gh ruleset view`.

Targets, in priority order. For each, say whether it holds and cite the file:line or the log line:
1. Vacuous green. Can the `verify` job pass with the visual comparison silently skipped? Trace
   `ignoreSnapshots: !CI`, what `CI` is on GitHub Actions, what happens when a baseline PNG is
   missing (Playwright's default updateSnapshots is `missing`), and whether `continue-on-error` in
   the baselines workflow can let a broken run commit bad images (the "Confirm" step is meant to be
   the judge; is it?).
2. The bot flow. `git push origin HEAD:$BRANCH` from a `workflow_dispatch` on a branch: does the
   checkout have the right ref, credentials, and history for that push? The `if: github.ref !=
   'refs/heads/main'` guard: does a dispatch on main actually get refused, and does the job then
   report success or failure? `git add -A tools/src/visual/baselines` then `git diff --cached --quiet`.
3. `nx affected` + `nrwl/nx-set-shas` on the first run of a fresh repo, on `workflow_dispatch`
   events, and on a PR: does it error, fall back, or compare against the wrong base? Is the
   `fetch-depth: 0` + `filter: tree:0` combination enough for it?
4. Port handoff inside `pnpm verify`: `verify:ui --preview` serves apps/studio/dist on :5181 and
   kills its process group on exit; `pnpm visual` then starts its own `vite preview` on :5181 with
   `reuseExistingServer: false`. Can the second start race the first's teardown? Read
   tools/src/verify/lib.mjs (stopPreview) and Playwright's webServer semantics. Reproduce locally:
   `BROWSER=none pnpm verify:ui --preview && BROWSER=none pnpm visual` (a build must exist).
5. Module resolution: `./errors.mjs` importing a `.mts` file under Playwright's loader (does the run
   pass? `pnpm visual` locally) and under `tsc --build` with `module: nodenext` (does
   `pnpm nx run tools:typecheck --skip-nx-cache` pass, and is tools/src/visual actually included?).
6. The runner and actions: `node-version-file: package.json` with `engines.node: ">=22 <23"`;
   `pnpm/action-setup@v6` reading `packageManager`; `--with-deps chromium` covering both `playwright`
   and `@playwright/test` at 1.62.1; `ubuntu-24.04` pinned in both workflows (they must match).
7. The ruleset: `.github/ruleset-main.json` names the check `verify`. Is that the context GitHub
   will see for this job (job id vs job name vs workflow name)? Does `strict_required_status_checks_policy: true`
   block the very PR that introduces the workflow, given main has no CI yet?
8. Injection and permissions: every `${{ }}` inside a `run:`; the `permissions` blocks; `contents: write`
   scope in the baselines job; the concurrency groups (can `cancel-in-progress: true` on main cancel a
   run that nx-set-shas later needs as "last successful"?).

You may run read-only commands and the local checks named above. Do not edit any file, do not push,
do not create or merge anything on GitHub, do not run `gh api` with a method other than GET.
Work in /Users/ryanpederson/NewDev/CreatorStudioUI; use absolute paths.

Report in markdown: `## Findings` (each: severity Material/Minor, file:line or log line, what is
wrong, the fix you would make), `## Clean passes` (what you checked, how, with the evidence), `## Verdict`
(one sentence).
